# skill_assessment/consumers.py
import os
import json
import asyncio
import logging
from typing import Any, Dict, Optional

import aiohttp
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings

from utils.elevenlabs_handler import (
    get_universal_agent_id,
)
from skill_assessment.models import (
    PreScreeningInterviewSession,
    GeneralSkillAssessment,
)

logger = logging.getLogger("elevenlabs.ws")


class PreScreeningInterviewConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket bridge between your frontend and ElevenLabs Convai.

    Frontend -> Server:
      { "type": "user_audio_chunk", "data": "<base64 PCM/OPUS/..." }
    Server -> ElevenLabs:
      { "user_audio_chunk": "<same base64>" }

    ElevenLabs -> Server events handled:
      - conversation_initiation_metadata -> emits conversation_id to frontend
      - audio -> forwards base64 audio to frontend
      - user_transcript -> forwards transcript to frontend
      - agent_response -> attempts to parse JSON per your rubric; persists session if structured
      - ping -> replies with pong
    """

    # ---- lifecycle ---------------------------------------------------------

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.user = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.elevenlabs_ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self.listen_task: Optional[asyncio.Task] = None

        self.assessment: Optional[GeneralSkillAssessment] = None
        self.job_application = None
        self.conversation_id: Optional[str] = None
        self.interview_finalized: bool = False

    async def connect(self) -> None:
        try:
            self.user = self.scope.get("user")
            if not self.user or not self.user.is_authenticated:
                logger.warning("[CONNECT] Unauthenticated user; closing.")
                await self.close(code=4001)
                return

            # load current user's assessment context
            self.assessment = await sync_to_async(self._get_user_assessment)()
            if not self.assessment:
                logger.warning("[CONNECT] No GeneralSkillAssessment found for user=%s", self.user.id)
                await self.close(code=4002)
                return

            self.job_application = self.assessment.job_application

        
            if not await self._has_passed_assessment():
                logger.info("[CONNECT] User %s failed assessment gating", self.user.id)
                await self.close(code=4003)
                return

            # open ElevenLabs WS
            await self._setup_elevenlabs_connection()

            # accept client
            await self.accept()
            logger.info("[CONNECT] Accepted for user=%s", self.user.id)

        except Exception:
            logger.exception("[CONNECT] Exception")
            await self.close(code=4000)

    async def disconnect(self, close_code: int) -> None:
        logger.info("[DISCONNECT] Code=%s", close_code)
        try:
            if self.listen_task:
                self.listen_task.cancel()
                try:
                    await self.listen_task
                except asyncio.CancelledError:
                    pass

            if self.elevenlabs_ws and not self.elevenlabs_ws.closed:
                await self.elevenlabs_ws.close()

            if self.session:
                await self.session.close()

        except Exception:
            logger.exception("[DISCONNECT] Cleanup error")

    # ---- DB helpers --------------------------------------------------------

    def _get_user_assessment(self) -> Optional[GeneralSkillAssessment]:
        """
        Fetches the first assessment for this user
        """
        return (
            GeneralSkillAssessment.objects.select_related(
                "job_application",
                "job_application__applicant",
                "job_application__applicant__user",
            )
            .filter(job_application__applicant__user=self.user)
            .first()
        )

    async def _has_passed_assessment(self) -> bool:
        """
        Gate to allow WS interview. Replace with your real business rule if needed.
        """
        return True

    # ---- ElevenLabs connection --------------------------------------------

    async def _setup_elevenlabs_connection(self) -> None:
        """
        Open WS connection to ElevenLabs. Sends an optional initiation override
        if you want to control first_message/voice per-session.
        """
        try:
            agent_id = await sync_to_async(get_universal_agent_id)()

            xi_api_key = (
                os.environ.get("ELEVENLABS_API_KEY")
                or getattr(settings, "ELEVENLABS_API_KEY", "")
            )
            if not xi_api_key:
                raise RuntimeError("ELEVENLABS_API_KEY missing.")

            headers = {"xi-api-key": xi_api_key}  # auth-only on WS handshake
            ws_url = f"wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id}"

            # aiohttp session + ws (tune sizes/heartbeats for your audio sizes)
            self.session = aiohttp.ClientSession()
            self.elevenlabs_ws = await self.session.ws_connect(
                ws_url,
                headers=headers,
                heartbeat=20,
                max_msg_size=8 * 1024 * 1024,  # 8MB to be safe with base64 frames
                autoclose=True,
                autoping=True,
            )
            logger.info("[SETUP] ElevenLabs WS connected (agent=%s)", agent_id)

            """# Optional per-conversation overrides (prompt, first_message, voice, etc.)
            # Comment out if your agent config already has these.
            initialization = {
                "type": "conversation_initiation_client_data",
                "conversation_config_override": {
                    # Example: minimal override; expand as needed
                    # "agent": {
                    #     "first_message": "Hi, I’m Jane from Tiaago—ready to begin?",
                    #     "language": "en",
                    #     "prompt": {"prompt": "Follow the cultural-fit rubric."},
                    # },
                    # "tts": {"voice_id": "cjVigY5qzO86Huf0OWal"},
                }
            }
            await self.elevenlabs_ws.send_str(json.dumps(initialization))"""

            self.listen_task = asyncio.create_task(self._listen_to_elevenlabs())

        except Exception:
            logger.exception("[SETUP] ElevenLabs WS setup failed")
            await self.close(code=4005)

    async def _listen_to_elevenlabs(self) -> None:
        """
        Reads WS frames from ElevenLabs and dispatches to handlers.
        """
        try:
            async for message in self.elevenlabs_ws:
                if message.type == aiohttp.WSMsgType.TEXT:
                    await self._handle_elevenlabs_message(message.data)
                elif message.type in (aiohttp.WSMsgType.CLOSE, aiohttp.WSMsgType.CLOSED):
                    logger.info("[LISTENER] ElevenLabs WS closed by server")
                    break
                elif message.type == aiohttp.WSMsgType.ERROR:
                    logger.error("[LISTENER] ElevenLabs WS error: %s", self.elevenlabs_ws.exception())
                    break
                else:
                    logger.debug("[LISTENER] Ignored frame type=%s", message.type)

        except asyncio.CancelledError:
            logger.debug("[LISTENER] Cancelled")
        except aiohttp.ClientConnectionError:
            logger.error("[LISTENER] Connection lost")
            await self.close(code=4004)
        except Exception:
            logger.exception("[LISTENER] Unexpected exception")
            await self.close(code=4004)

    async def _handle_elevenlabs_message(self, payload: str) -> None:
        """
        Handles ElevenLabs events (JSON string payloads).
        """
        try:
            event = json.loads(payload)
            etype = event.get("type")
            logger.debug("[HANDLE_MSG] type=%s", etype)

            if etype == "conversation_initiation_metadata":
                meta = event.get("conversation_initiation_metadata_event", {}) or {}
                self.conversation_id = meta.get("conversation_id")
                await self.send_json({"type": "conversation_id", "data": self.conversation_id})

            elif etype == "audio":
                audio_b64 = (event.get("audio_event") or {}).get("audio_base_64")
                if audio_b64:
                    await self.send_json({"type": "audio", "data": audio_b64})

            elif etype == "user_transcript":
                user_text = (event.get("user_transcription_event") or {}).get("user_transcript")
                if user_text:
                    await self.send_json({"type": "user_transcript", "text": user_text})

            elif etype == "agent_response":
                # ElevenLabs sends a *string* here. Your prompt may ask the model to return JSON.
                agent_text = (event.get("agent_response_event") or {}).get("agent_response")

                parsed: Optional[Dict[str, Any]] = None
                if isinstance(agent_text, str):
                    try:
                        parsed = json.loads(agent_text)
                    except json.JSONDecodeError:
                        parsed = None

                if parsed and isinstance(parsed, dict):
                    # structured JSON per your rubric
                    await self.send_json({"type": "agent_response", "data": parsed})
                    await self._finalize_interview(parsed)
                else:
                    # forward plain text to UI for display
                    await self.send_json({"type": "agent_response_text", "text": agent_text})

            elif etype == "ping":
                event_id = (event.get("ping_event") or {}).get("event_id")
                pong = {"type": "pong"}
                if event_id is not None:
                    pong["event_id"] = event_id
                if self.elevenlabs_ws:
                    await self.elevenlabs_ws.send_str(json.dumps(pong))

            else:
                logger.debug("[HANDLE_MSG] Unhandled event: %s", etype)

        except json.JSONDecodeError:
            logger.error("[HANDLE_MSG] Invalid JSON from ElevenLabs")
        except Exception:
            logger.exception("[HANDLE_MSG] Unexpected error")

    # ---- client <-> server -------------------------------------------------

    async def receive_json(self, content: Dict[str, Any], **kwargs: Any) -> None:
        """
        Receives messages from your frontend.
        Expect: {"type": "user_audio_chunk", "data": "<base64>"}
        """
        try:
            mtype = content.get("type")
            if mtype == "user_audio_chunk":
                base64_audio = content.get("data")
                if self.elevenlabs_ws and base64_audio:
                    # Per ElevenLabs spec: object with "user_audio_chunk"
                    await self.elevenlabs_ws.send_json({"user_audio_chunk": base64_audio})
                else:
                    logger.warning("[RECEIVE_JSON] No WS or no audio data")
            else:
                logger.debug("[RECEIVE_JSON] Unknown type=%s", mtype)

        except aiohttp.ClientConnectionError:
            logger.error("[RECEIVE_JSON] ElevenLabs connection lost")
            await self.close(code=4004)
        except Exception:
            logger.exception("[RECEIVE_JSON] Unexpected error")

    # ---- persistence -------------------------------------------------------

    @sync_to_async
    def _finalize_interview(self, agent_response: Dict[str, Any]) -> None:
        """
        Persists a PreScreeningInterviewSession using structured JSON from your rubric.
        Adjust keys to match your exact rubric shape.
        """
        try:
            if not agent_response:
                logger.info("[FINALIZE] No structured agent_response to persist")
                return

            convo_id = self.conversation_id
            if not convo_id:
                logger.warning("[FINALIZE] No conversation_id available")
                return

            # Map your rubric keys -> DB fields
            total_points = agent_response.get("total_points")
            final_eval = agent_response.get("final_evaluation")
            summary_comment = (
                agent_response.get("agent_comment")
                or agent_response.get("summary_comment")
                or agent_response.get("comment")
            )

            PreScreeningInterviewSession.objects.create(
                candidate=self.user,  
                job_application=self.job_application,
                assessment=self.assessment,
                conversation_id=convo_id,
                total_points=total_points,
                final_evaluation=final_eval,
                summary_comment=summary_comment,
            )
            self.interview_finalized = True
            logger.info("[FINALIZE] Interview persisted for conversation=%s", convo_id)

        except Exception:
            logger.exception("[FINALIZE] Error while saving interview")
