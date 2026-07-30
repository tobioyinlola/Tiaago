"""Live-interview WebSocket consumer: relays ~10s audio chunks captured in
the recruiter's browser (both the recruiter's and candidate's Daily.co audio
tracks -- see VideoColumn/WorkspaceView on the frontend, which is the only
side that ever opens this socket) to Whisper for transcription, and triggers
the AI copilot suggestion engine on candidate speech. Mirrors chats/consumers.py's
AsyncWebsocketConsumer + JWTAuthMiddleware pattern (see asgi.py) rather than
inventing a new one.
"""

import base64
import json
import logging
from datetime import timedelta

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from create_user.permissions import get_user_company, user_is_company_role
from create_user.models import CompanyTeamMember
from utils.ai_service import AIService

from .copilot_views import _seed_competency_scores
from .models import AICopilotEvent, InterviewCompetencyScore, InterviewPreparation, InterviewTranscriptSegment, Scheduler

logger = logging.getLogger(__name__)

COPILOT_RATE_LIMIT_SECONDS = 15
MAX_RECENT_EXCHANGES = 5


class InterviewTranscriptionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.interview_id = self.scope["url_route"]["kwargs"]["interview_id"]
        self.group_name = f"interview_{self.interview_id}"
        self.user = self.scope["user"]

        if not self.user or not getattr(self.user, "is_authenticated", False):
            await self.close()
            return

        interview = await self._get_owned_interview()
        if not interview:
            await self.close()
            return

        company_settings = await self._get_company_settings(interview)
        copilot_enabled = interview.copilot_enabled and company_settings.ai_copilot_enabled
        if not copilot_enabled or not company_settings.copilot_live_transcription_enabled:
            # Live transcription itself is off (company-wide or per-interview)
            # -- nothing for this socket to do.
            await self.close()
            return
        self.suggestions_enabled = company_settings.copilot_suggestions_enabled
        self.evidence_capture_enabled = company_settings.copilot_evidence_capture_enabled

        self.recent_exchanges = []  # [{"speaker": ..., "text": ...}], capped at MAX_RECENT_EXCHANGES
        self.active_question_text = None
        self.last_copilot_call_at = None  # in-memory, per-connection rate limit
        self.job_title = interview.job_title or interview.title
        self.target_duration_minutes = interview.duration_minutes or 30
        self.started_at = interview.started_at
        self.company_id = interview.company_id

        prep = await self._get_preparation()
        self.competencies = (prep.competencies if prep else None) or []
        self.watch_areas = (
            [w.get("text", "") for w in (prep.watch_areas or []) if w.get("text")] if prep else []
        )

        await self._seed_scores(interview)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self._send_error("Invalid JSON payload")
            return

        message_type = data.get("type")

        if message_type == "CONTEXT_UPDATE":
            self.active_question_text = data.get("active_question_text") or None
            return

        if message_type == "AUDIO_CHUNK":
            await self._handle_audio_chunk(data)
            return

    async def _handle_audio_chunk(self, data):
        speaker = data.get("speaker") if data.get("speaker") in ("RECRUITER", "CANDIDATE") else "UNKNOWN"
        audio_base64 = data.get("audio_base64")
        chunk_start_ms = int(data.get("chunk_start_ms") or 0)
        if not audio_base64:
            return

        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception:
            await self._send_error("Could not decode audio chunk")
            return

        result = await sync_to_async(AIService.transcribe_audio, thread_sensitive=False)(audio_bytes)
        if not result or result.get("no_speech") or not (result.get("text") or "").strip():
            return

        text = result["text"].strip()
        confidence = result.get("confidence") or 0.9
        end_ms = chunk_start_ms + 10_000

        segment = await self._save_segment(speaker, text, chunk_start_ms, end_ms, confidence)
        await self.send(text_data=json.dumps({
            "type": "TRANSCRIPT_SEGMENT",
            "segment": {
                "id": str(segment.id),
                "speaker": segment.speaker,
                "text": segment.text,
                "start_ms": segment.start_ms,
                "end_ms": segment.end_ms,
                "confidence": float(segment.confidence),
            },
        }))

        self.recent_exchanges.append({"speaker": speaker, "text": text})
        self.recent_exchanges = self.recent_exchanges[-MAX_RECENT_EXCHANGES:]

        if speaker == "CANDIDATE":
            await self._maybe_generate_copilot_suggestion()

    async def _maybe_generate_copilot_suggestion(self):
        if not self.suggestions_enabled and not self.evidence_capture_enabled:
            return
        now = timezone.now()
        if self.last_copilot_call_at and (now - self.last_copilot_call_at) < timedelta(seconds=COPILOT_RATE_LIMIT_SECONDS):
            return
        self.last_copilot_call_at = now

        uncovered = await self._get_uncovered_competencies()
        elapsed_minutes = int((now - self.started_at).total_seconds() // 60) if self.started_at else 0

        payload = {
            "job_title": self.job_title,
            "recent_exchanges": self.recent_exchanges,
            "active_question": self.active_question_text,
            "uncovered_competencies": uncovered,
            "watch_areas": self.watch_areas,
            "elapsed_minutes": elapsed_minutes,
            "target_duration_minutes": self.target_duration_minutes,
        }

        result = await sync_to_async(AIService.generate_copilot_suggestion, thread_sensitive=False)(payload)
        await self._log_ai_usage(succeeded=bool(result))
        if not result:
            return

        if self.suggestions_enabled:
            for suggestion in result.get("suggestions", []):
                event = await self._save_copilot_event(suggestion)
                await self.send(text_data=json.dumps({
                    "type": "COPILOT_SUGGESTION",
                    "event": {
                        "id": str(event.id),
                        "event_type": event.event_type,
                        "content": event.content,
                        "confidence": float(event.confidence),
                    },
                }))

        for evidence in result.get("evidence", []) if self.evidence_capture_enabled else []:
            updated = await self._save_evidence(evidence)
            if updated:
                await self.send(text_data=json.dumps({
                    "type": "EVIDENCE_UPDATE",
                    "competency_id": evidence.get("competency_id"),
                    "competency_name": evidence.get("competency_name"),
                    "evidence": updated,
                }))

    async def _send_error(self, message):
        await self.send(text_data=json.dumps({"type": "ERROR", "message": message}))

    @database_sync_to_async
    def _get_owned_interview(self):
        interview = Scheduler.objects.filter(pk=self.interview_id).select_related("company").first()
        if not interview:
            return None
        company = get_user_company(self.user)
        if not company or interview.company_id != company.id:
            return None
        if not self.user.is_staff and not user_is_company_role(
            self.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]
        ):
            return None
        return interview

    @database_sync_to_async
    def _get_preparation(self):
        return InterviewPreparation.objects.filter(interview_id=self.interview_id).first()

    @database_sync_to_async
    def _get_company_settings(self, interview):
        from .models import CompanyInterviewSettings

        settings_obj, _created = CompanyInterviewSettings.objects.get_or_create(company=interview.company)
        return settings_obj

    @database_sync_to_async
    def _seed_scores(self, interview):
        _seed_competency_scores(interview)

    @database_sync_to_async
    def _get_uncovered_competencies(self):
        covered_ids = set(
            InterviewCompetencyScore.objects.filter(
                interview_id=self.interview_id, score_raw__isnull=False
            ).values_list("competency_id", flat=True)
        )
        return [
            {"id": c.get("id") or c.get("name", ""), "name": c.get("name", "")}
            for c in self.competencies
            if (c.get("id") or c.get("name", "")) not in covered_ids
        ]

    @database_sync_to_async
    def _save_segment(self, speaker, text, start_ms, end_ms, confidence):
        return InterviewTranscriptSegment.objects.create(
            interview_id=self.interview_id,
            speaker=speaker,
            text=text,
            start_ms=start_ms,
            end_ms=end_ms,
            confidence=confidence,
        )

    @database_sync_to_async
    def _save_copilot_event(self, suggestion):
        return AICopilotEvent.objects.create(
            interview_id=self.interview_id,
            event_type=suggestion.get("type") or AICopilotEvent.EventType.FOLLOWUP_QUESTION,
            content=suggestion.get("content", ""),
            confidence=suggestion.get("confidence") or 0,
            trigger_context={"active_question": self.active_question_text},
            shown_at=timezone.now(),
        )

    @database_sync_to_async
    def _save_evidence(self, evidence):
        competency_id = evidence.get("competency_id")
        if not competency_id:
            return None
        score = InterviewCompetencyScore.objects.filter(
            interview_id=self.interview_id, competency_id=competency_id
        ).first()
        if not score:
            return None
        score.ai_evidence = [
            *score.ai_evidence,
            {
                "quote": evidence.get("quote", ""),
                "strength": evidence.get("strength", "MODERATE"),
                "captured_at": timezone.now().isoformat(),
            },
        ]
        score.save(update_fields=["ai_evidence"])
        return score.ai_evidence

    @database_sync_to_async
    def _log_ai_usage(self, succeeded):
        """Best-effort AI-call instrumentation for admin analytics -- mirrors
        scheduler/tasks.py's own _log_ai_usage; never raises."""
        from analytics.models import AIUsageLog
        from create_user.models import Company

        try:
            AIUsageLog.objects.create(
                service_type=AIUsageLog.ServiceType.AI_COPILOT_SUGGESTION,
                company=Company.objects.filter(id=self.company_id).first() if self.company_id else None,
                succeeded=succeeded,
            )
        except Exception:
            logger.exception("Failed to write AIUsageLog for ai_copilot_suggestion")
