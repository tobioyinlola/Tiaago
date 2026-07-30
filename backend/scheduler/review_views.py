"""Post-interview review page (/recruiter/dashboard/interviews/[id]/review):
summary editing/regeneration, candidate feedback editing/sending, transcript
read, and the final hiring decision. Scorecard reuses the existing
copilot_views endpoints -- nothing new needed there."""

import logging

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_400_BAD_REQUEST

from emails import emails

from .copilot_views import _get_owned_interview
from .models import InterviewCandidateFeedback, InterviewSummary, InterviewTranscriptSegment, Scheduler

logger = logging.getLogger(__name__)


def _serialize_summary(summary):
    if not summary:
        return None
    return {
        "executive_summary": summary.executive_summary,
        "strengths": summary.strengths,
        "concerns": summary.concerns,
        "recommendation": summary.recommendation,
        "confidence": summary.confidence,
        "overall_score": float(summary.overall_score) if summary.overall_score is not None else None,
        "action_items": summary.action_items,
        "generation_status": summary.generation_status,
        "ai_generated_at": summary.ai_generated_at,
        "recruiter_edited_at": summary.recruiter_edited_at,
        "submitted_at": summary.submitted_at,
    }


def _serialize_feedback(feedback):
    if not feedback:
        return None
    return {
        "content": feedback.content,
        "delivery_status": feedback.delivery_status,
        "sent_at": feedback.sent_at,
    }


class InterviewReviewView(APIView):
    """GET /api/schedulers/<pk>/review/ -- everything the review page's
    Summary and Recording tabs need in one call. Transcript is fetched
    separately (its own endpoint below) since it can be long; Scorecard
    reuses the existing /scorecard/ endpoint."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        interview, error = _get_owned_interview(request, pk, select_related=("talent", "company"))
        if error:
            return error

        summary = InterviewSummary.objects.filter(interview=interview).first()
        feedback = InterviewCandidateFeedback.objects.filter(interview=interview).first()
        talent = interview.talent

        return Response({
            "candidate_name": talent.full_name if talent else "",
            "job_title": interview.job_title or interview.title,
            "company_name": interview.company.company_name if interview.company else "",
            "meeting_date": interview.meeting_date,
            "start_time": interview.start_time,
            "duration_minutes": interview.duration_minutes,
            "actual_duration_seconds": interview.actual_duration_seconds,
            "status": interview.status,
            "recording_enabled": interview.recording_enabled,
            "recording_status": interview.recording_status,
            "recording_url": interview.recording_url,
            "transcription_status": interview.transcription_status,
            "summary": _serialize_summary(summary),
            "feedback": _serialize_feedback(feedback),
            "has_candidate_email": bool(talent and talent.user and talent.user.email),
        }, status=HTTP_200_OK)


class InterviewTranscriptView(APIView):
    """GET /api/schedulers/<pk>/transcript/ -- full read view for the
    Transcript tab (search/download happen client-side against this)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        segments = InterviewTranscriptSegment.objects.filter(interview=interview).order_by("start_ms")
        return Response({
            "segments": [
                {
                    "id": str(s.id),
                    "speaker": s.speaker,
                    "text": s.text,
                    "start_ms": s.start_ms,
                    "end_ms": s.end_ms,
                    "confidence": float(s.confidence),
                }
                for s in segments
            ],
        }, status=HTTP_200_OK)


class InterviewSummaryEditView(APIView):
    """PATCH /api/schedulers/<pk>/summary/ -- recruiter edits to the AI
    summary (executive_summary, strengths, concerns, action_items). Marks
    recruiter_edited_at; does not touch recommendation/confidence/overall_score
    -- those are finalised via InterviewDecisionView, not casual editing."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from django.utils import timezone

        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        summary, _created = InterviewSummary.objects.get_or_create(interview=interview)
        editable_fields = ("executive_summary", "strengths", "concerns", "action_items")
        update_fields = []
        for field in editable_fields:
            if field in request.data:
                setattr(summary, field, request.data[field])
                update_fields.append(field)
        if not update_fields:
            return Response({"error": "No editable fields provided."}, status=HTTP_400_BAD_REQUEST)

        summary.recruiter_edited_at = timezone.now()
        update_fields.append("recruiter_edited_at")
        summary.save(update_fields=update_fields)
        return Response(_serialize_summary(summary), status=HTTP_200_OK)


class RegenerateInterviewSummaryView(APIView):
    """POST /api/schedulers/<pk>/summary/regenerate/ -- re-runs AI summary
    generation from the currently-saved transcript. Async (Celery), like
    the prep brief's regenerate endpoint -- frontend polls GET .../review/
    until generation_status flips to READY."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .tasks import regenerate_interview_summary_task

        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        summary, _created = InterviewSummary.objects.get_or_create(interview=interview)
        summary.generation_status = InterviewSummary.GenerationStatus.GENERATING
        summary.save(update_fields=["generation_status"])
        regenerate_interview_summary_task.delay(str(interview.id))
        return Response(_serialize_summary(summary), status=HTTP_200_OK)


class InterviewDecisionView(APIView):
    """POST /api/schedulers/<pk>/decision/ -- "Submit Decision" in the
    review page's fixed right panel. Finalises the recommendation/confidence/
    overall_score the recruiter chose (which may differ from the AI's own
    suggestion) and stamps submitted_at, which is what moves the interview
    from the "Needs Review" tab to "Completed" on the interviews list."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.utils import timezone

        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        recommendation = request.data.get("recommendation")
        if recommendation not in InterviewSummary.Recommendation.values:
            return Response({"error": "A valid recommendation is required."}, status=HTTP_400_BAD_REQUEST)
        confidence = request.data.get("confidence")
        if confidence not in InterviewSummary.Confidence.values:
            return Response({"error": "A valid confidence level is required."}, status=HTTP_400_BAD_REQUEST)

        summary, _created = InterviewSummary.objects.get_or_create(interview=interview)
        summary.recommendation = recommendation
        summary.confidence = confidence
        if request.data.get("overall_score") is not None:
            summary.overall_score = request.data["overall_score"]
        summary.submitted_at = timezone.now()
        summary.save(update_fields=["recommendation", "confidence", "overall_score", "submitted_at"])
        return Response(_serialize_summary(summary), status=HTTP_200_OK)


class InterviewFeedbackEditView(APIView):
    """PATCH /api/schedulers/<pk>/feedback/ -- recruiter edits the AI-drafted
    candidate feedback before sending. Rejects edits once already sent."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error
        if not interview.talent:
            return Response({"error": "This interview has no candidate to send feedback to."}, status=HTTP_400_BAD_REQUEST)

        feedback, _created = InterviewCandidateFeedback.objects.get_or_create(
            interview=interview, defaults={"candidate": interview.talent}
        )
        if feedback.delivery_status != InterviewCandidateFeedback.DeliveryStatus.DRAFT:
            return Response({"error": "This feedback has already been sent and can no longer be edited."}, status=HTTP_400_BAD_REQUEST)

        content = request.data.get("content")
        if content is None:
            return Response({"error": "content is required."}, status=HTTP_400_BAD_REQUEST)
        feedback.content = content
        feedback.save(update_fields=["content"])
        return Response(_serialize_feedback(feedback), status=HTTP_200_OK)


class SendInterviewFeedbackView(APIView):
    """POST /api/schedulers/<pk>/feedback/send/ -- sends the (recruiter-
    reviewed) feedback email to the candidate. One-way: once SENT, the
    content is frozen (see InterviewFeedbackEditView)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.utils import timezone

        interview, error = _get_owned_interview(request, pk, select_related=("talent", "company"))
        if error:
            return error
        if not interview.talent or not interview.talent.user or not interview.talent.user.email:
            return Response({"error": "This candidate has no email on file."}, status=HTTP_400_BAD_REQUEST)

        feedback = InterviewCandidateFeedback.objects.filter(interview=interview).first()
        if not feedback or not feedback.content.strip():
            return Response({"error": "There is no feedback content to send yet."}, status=HTTP_400_BAD_REQUEST)
        if feedback.delivery_status != InterviewCandidateFeedback.DeliveryStatus.DRAFT:
            return Response({"error": "This feedback has already been sent."}, status=HTTP_400_BAD_REQUEST)

        try:
            emails.interview_candidate_feedback_mail(
                interview.talent.user,
                interview.job_title or interview.title,
                interview.company.company_name if interview.company else "",
                feedback.content,
            )
        except Exception:
            logger.exception(f"Failed to send candidate feedback email for interview {interview.id}")
            feedback.delivery_status = InterviewCandidateFeedback.DeliveryStatus.FAILED
            feedback.save(update_fields=["delivery_status"])
            return Response({"error": "Could not send the feedback email. Please try again."}, status=HTTP_400_BAD_REQUEST)

        feedback.delivery_status = InterviewCandidateFeedback.DeliveryStatus.SENT
        feedback.sent_at = timezone.now()
        feedback.save(update_fields=["delivery_status", "sent_at"])
        return Response(_serialize_feedback(feedback), status=HTTP_200_OK)
