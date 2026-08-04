"""AI interview endpoints: public candidate join/start (token-authenticated),
internal agent-facing endpoints (shared-secret authenticated, called only by
the standalone interview_agent/ LiveKit process), and recruiter review/
decision/dashboard endpoints (session-authenticated). Follows
scheduler/copilot_views.py + scheduler/review_views.py's conventions
exactly -- plain dict serializers, APIView, ownership check helper."""

import logging

from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_402_PAYMENT_REQUIRED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
)

from create_user.permissions import get_user_company
from notifications.models import Notification
from notifications.utils import notify_user
from subscriptions.billing_service import BillingService

from .livekit_client import LiveKitProvisioningError, create_ai_interview_room, mint_candidate_token
from .models import AIInterview, AIInterviewTranscriptSegment
from .permissions import HasInternalServiceKey
from .tasks import process_completed_ai_interview_task

logger = logging.getLogger(__name__)

NOT_JOINABLE_STATUSES = (
    AIInterview.Status.COMPLETED,
    AIInterview.Status.NO_SHOW,
    AIInterview.Status.ABANDONED,
    AIInterview.Status.FAILED,
)


def _get_owned_ai_interview(request, pk):
    interview = AIInterview.objects.select_related("job", "candidate__user", "organisation").filter(pk=pk).first()
    if not interview:
        return None, Response({"error": "Interview not found."}, status=HTTP_404_NOT_FOUND)
    company = get_user_company(request.user)
    if not company or interview.organisation_id != company.id:
        return None, Response(
            {"error": "You do not have permission to access this interview."}, status=HTTP_403_FORBIDDEN
        )
    return interview, None


def _candidate_details(interview):
    candidate = interview.candidate
    return {
        "candidate_first_name": candidate.user.first_name or (candidate.full_name.split(" ")[0] if candidate.full_name else ""),
        "job_title": interview.job.title,
        "company_name": interview.organisation.company_name,
        "duration_minutes": interview.job.ai_interview_duration_minutes,
        "questions_total": interview.questions_total,
        "status": interview.status,
        "window_end_at": interview.window_end_at,
        "expired": timezone.now() > interview.window_end_at and interview.status not in (
            AIInterview.Status.COMPLETED, AIInterview.Status.IN_PROGRESS,
        ),
    }


class AIInterviewJoinLookupView(APIView):
    """GET /api/ai-interviews/join/<token>/ -- no-login lookup for the
    candidate pre-join page's initial load."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        interview = AIInterview.objects.select_related("job", "candidate__user", "organisation").filter(
            candidate_join_token=token
        ).first()
        if not interview:
            return Response({"found": False}, status=HTTP_404_NOT_FOUND)

        return Response({"found": True, **_candidate_details(interview)}, status=HTTP_200_OK)


class AIInterviewStartSessionView(APIView):
    """POST /api/ai-interviews/join/<token>/start/ -- candidate clicks "Start
    interview with Alex". Charges the AI-interview fee, creates the LiveKit
    room, and mints the candidate's access token. This is the sole trigger
    for AI-interview billing (see BillingService.charge_ai_interview)."""

    permission_classes = [AllowAny]

    def post(self, request, token):
        interview = AIInterview.objects.select_related("job", "candidate__user", "organisation").filter(
            candidate_join_token=token
        ).first()
        if not interview:
            return Response({"error": "This interview link is invalid or has expired."}, status=HTTP_404_NOT_FOUND)

        if interview.status in NOT_JOINABLE_STATUSES:
            return Response(
                {"error": "This interview is no longer available."}, status=HTTP_400_BAD_REQUEST
            )
        if timezone.now() > interview.window_end_at:
            interview.status = AIInterview.Status.NO_SHOW
            interview.save(update_fields=["status"])
            return Response(
                {"error": "The window to complete this interview has closed."}, status=HTTP_400_BAD_REQUEST
            )
        if not interview.questions.exists():
            return Response(
                {"error": "This interview isn't ready yet. Please try again shortly."}, status=HTTP_400_BAD_REQUEST
            )

        billing_result = BillingService.charge_ai_interview(interview.organisation, interview)
        if not billing_result["success"]:
            recipient = getattr(interview.organisation, "company_rep", None)
            if recipient:
                try:
                    notify_user(
                        recipient,
                        title="Insufficient wallet balance",
                        message="A candidate tried to start an AI interview but your wallet balance is too "
                        "low to cover it. Please top up to let them continue.",
                        notification_type=Notification.Type.BILLING_ALERT,
                        link_path="recruiter/dashboard/billing",
                        link_label="Fund wallet",
                    )
                except Exception:
                    logger.exception(f"Failed to send insufficient-funds notification for AI interview {interview.id}")
            return Response(
                {"error": "This interview isn't available right now. Please try again later."},
                status=HTTP_402_PAYMENT_REQUIRED,
            )

        try:
            create_ai_interview_room(interview.livekit_room_name, interview.id)
            candidate_token = mint_candidate_token(
                interview.livekit_room_name, interview.candidate_identity, interview.candidate.full_name,
            )
        except LiveKitProvisioningError as e:
            logger.error(f"Failed to provision LiveKit session for AI interview {interview.id}: {e.detail}")
            return Response({"error": "Could not start the interview. Please try again."}, status=e.status_code)

        update_fields = ["status"]
        interview.status = AIInterview.Status.WAITING
        if not interview.joined_at:
            interview.joined_at = timezone.now()
            update_fields.append("joined_at")
        interview.save(update_fields=update_fields)

        return Response({
            "token": candidate_token,
            "roomName": interview.livekit_room_name,
            "livekitUrl": settings.LIVEKIT_URL,
        }, status=HTTP_200_OK)


class AIInterviewAgentDataView(APIView):
    """GET /api/ai-interviews/<id>/agent-data/ -- internal only. Everything
    interview_agent.py needs to conduct the interview."""

    permission_classes = [HasInternalServiceKey]

    def get(self, request, pk):
        interview = AIInterview.objects.select_related("job", "candidate__user", "organisation").filter(pk=pk).first()
        if not interview:
            return Response({"error": "Interview not found."}, status=HTTP_404_NOT_FOUND)

        questions = [
            {
                "number": q.question_number,
                "type": q.question_type,
                "text": q.question_text,
                "followup_if_vague": q.followup_if_vague,
                "transition_phrase": q.transition_phrase,
            }
            for q in interview.questions.order_by("question_number")
        ]

        from .services import get_candidate_context, get_job_application_for

        candidate = interview.candidate
        job_application = get_job_application_for(interview.job, candidate)
        resume_summary, assessment_score = get_candidate_context(interview.job, candidate, job_application)

        return Response({
            "id": str(interview.id),
            "duration_minutes": interview.job.ai_interview_duration_minutes,
            "job_title": interview.job.title,
            "company_name": interview.organisation.company_name,
            "candidate_first_name": candidate.user.first_name or (candidate.full_name.split(" ")[0] if candidate.full_name else "there"),
            "resume_summary": resume_summary[:3000],
            "assessment_score": assessment_score,
            "questions": questions,
        }, status=HTTP_200_OK)


class AIInterviewSegmentView(APIView):
    """POST /api/ai-interviews/<id>/segment/ -- internal only. Saves one
    transcript segment as it flows through the agent's STT/TTS pipeline."""

    permission_classes = [HasInternalServiceKey]

    def post(self, request, pk):
        interview = AIInterview.objects.filter(pk=pk).first()
        if not interview:
            return Response({"error": "Interview not found."}, status=HTTP_404_NOT_FOUND)

        speaker = request.data.get("speaker")
        text = request.data.get("text")
        timestamp_ms = request.data.get("timestamp_ms")
        if speaker not in AIInterviewTranscriptSegment.Speaker.values or not text or timestamp_ms is None:
            return Response({"error": "speaker, text, and timestamp_ms are required."}, status=HTTP_400_BAD_REQUEST)

        AIInterviewTranscriptSegment.objects.create(
            interview=interview, speaker=speaker, text=text, timestamp_ms=timestamp_ms,
        )
        return Response({"status": "saved"}, status=HTTP_200_OK)


class AIInterviewStatusView(APIView):
    """PATCH /api/ai-interviews/<id>/status/ -- internal only. Updates
    status (and joined_at/IN_PROGRESS timing) as the agent's session
    progresses."""

    permission_classes = [HasInternalServiceKey]

    def patch(self, request, pk):
        interview = AIInterview.objects.filter(pk=pk).first()
        if not interview:
            return Response({"error": "Interview not found."}, status=HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in AIInterview.Status.values:
            return Response({"error": "Invalid status."}, status=HTTP_400_BAD_REQUEST)

        interview.status = new_status
        interview.save(update_fields=["status"])
        return Response({"status": interview.status}, status=HTTP_200_OK)


class AIInterviewCompleteView(APIView):
    """POST /api/ai-interviews/<id>/complete/ -- internal only. Called by
    the agent when the session ends; triggers the post-interview transcript
    compilation + scoring pipeline (see tasks.process_completed_ai_interview_task)."""

    permission_classes = [HasInternalServiceKey]

    def post(self, request, pk):
        interview = AIInterview.objects.filter(pk=pk).first()
        if not interview:
            return Response({"error": "Interview not found."}, status=HTTP_404_NOT_FOUND)

        process_completed_ai_interview_task.delay(str(interview.id))
        return Response({"status": "processing"}, status=HTTP_200_OK)


def _serialize_question(question):
    return {
        "id": str(question.id),
        "number": question.question_number,
        "type": question.question_type,
        "text": question.question_text,
        "candidate_response": question.candidate_response,
        "score": float(question.score) if question.score is not None else None,
        "signal_strength": question.signal_strength,
        "ai_notes": question.ai_notes,
    }


def _serialize_interview_detail(interview):
    candidate = interview.candidate
    return {
        "id": str(interview.id),
        "status": interview.status,
        "candidate_name": candidate.full_name or candidate.user.get_full_name(),
        "job_title": interview.job.title,
        "company_name": interview.organisation.company_name,
        "duration_seconds": interview.duration_seconds,
        "completed_at": interview.completed_at,
        "summary_status": interview.summary_status,
        "summary_error": interview.summary_error,
        "overall_score": float(interview.overall_score) if interview.overall_score is not None else None,
        "communication_score": float(interview.communication_score) if interview.communication_score is not None else None,
        "confidence_score": float(interview.confidence_score) if interview.confidence_score is not None else None,
        "relevance_score": float(interview.relevance_score) if interview.relevance_score is not None else None,
        "clarity_score": float(interview.clarity_score) if interview.clarity_score is not None else None,
        "strengths": interview.strengths,
        "concerns": interview.concerns,
        "recommendation": interview.recommendation,
        "recommendation_confidence": interview.recommendation_confidence,
        "recommendation_reasons": interview.recommendation_reasons,
        "flags": interview.flags,
        "executive_summary": interview.executive_summary,
        "candidate_feedback": interview.candidate_feedback,
        "recruiter_notes": interview.recruiter_notes,
        "recruiter_decision": interview.recruiter_decision,
        "recruiter_decision_at": interview.recruiter_decision_at,
        "recruiter_override_reason": interview.recruiter_override_reason,
        "audio_recording_url": interview.audio_recording_url,
        "audio_recording_status": interview.audio_recording_status,
        "questions": [_serialize_question(q) for q in interview.questions.order_by("question_number")],
    }


class RecruiterAIInterviewDetailView(APIView):
    """GET /api/ai-interviews/<id>/ -- everything the recruiter review page
    needs (Summary/Questions tabs; Transcript is its own endpoint below)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        interview, error = _get_owned_ai_interview(request, pk)
        if error:
            return error
        return Response(_serialize_interview_detail(interview), status=HTTP_200_OK)


class RecruiterAIInterviewTranscriptView(APIView):
    """GET /api/ai-interviews/<id>/transcript/ -- full transcript for the
    Transcript tab (search/download happen client-side)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        interview, error = _get_owned_ai_interview(request, pk)
        if error:
            return error
        segments = [
            {"speaker": s.speaker, "text": s.text, "timestamp_ms": s.timestamp_ms}
            for s in interview.transcript_segments.order_by("timestamp_ms")
        ]
        return Response({"segments": segments}, status=HTTP_200_OK)


class RecruiterAIInterviewDecisionView(APIView):
    """POST /api/ai-interviews/<id>/decision/ -- accept the AI recommendation,
    override it (proceed or decline, reason required), each moving the
    candidate to the next stage of the pipeline."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        interview, error = _get_owned_ai_interview(request, pk)
        if error:
            return error

        decision = request.data.get("decision")
        if decision not in AIInterview.RecruiterDecision.values or decision == AIInterview.RecruiterDecision.PENDING:
            return Response({"error": "A valid decision is required."}, status=HTTP_400_BAD_REQUEST)

        override_reason = (request.data.get("override_reason") or "").strip()
        if decision in (
            AIInterview.RecruiterDecision.OVERRIDDEN_PROCEED,
            AIInterview.RecruiterDecision.OVERRIDDEN_DECLINE,
        ) and not override_reason:
            return Response({"error": "A reason is required to override the AI recommendation."}, status=HTTP_400_BAD_REQUEST)

        interview.recruiter_decision = decision
        interview.recruiter_decision_at = timezone.now()
        interview.recruiter_decision_by = request.user
        interview.recruiter_override_reason = override_reason
        interview.save(update_fields=[
            "recruiter_decision", "recruiter_decision_at", "recruiter_decision_by", "recruiter_override_reason",
        ])
        return Response(_serialize_interview_detail(interview), status=HTTP_200_OK)


TAB_FILTERS = {
    "pending_review": lambda qs: qs.filter(
        summary_status=AIInterview.SummaryStatus.READY, recruiter_decision=AIInterview.RecruiterDecision.PENDING,
    ),
    "completed": lambda qs: qs.exclude(recruiter_decision=AIInterview.RecruiterDecision.PENDING),
    "scheduled": lambda qs: qs.filter(
        status__in=(AIInterview.Status.INVITED, AIInterview.Status.SCHEDULED, AIInterview.Status.WAITING)
    ),
    "no_shows": lambda qs: qs.filter(status=AIInterview.Status.NO_SHOW),
}


class RecruiterAIInterviewListView(APIView):
    """GET /api/ai-interviews/?tab=pending_review|completed|scheduled|no_shows
    -- the AI Interviews dashboard list + stat counts."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response({"error": "No company found for this user."}, status=HTTP_403_FORBIDDEN)

        base_qs = AIInterview.objects.filter(organisation=company).select_related("job", "candidate__user")

        stats = {tab: filter_fn(base_qs).count() for tab, filter_fn in TAB_FILTERS.items()}

        tab = request.query_params.get("tab", "pending_review")
        filter_fn = TAB_FILTERS.get(tab, TAB_FILTERS["pending_review"])
        rows = filter_fn(base_qs).order_by("-created_at")[:100]

        results = [
            {
                "id": str(interview.id),
                "candidate_name": interview.candidate.full_name or interview.candidate.user.get_full_name(),
                "job_title": interview.job.title,
                "status": interview.status,
                "summary_status": interview.summary_status,
                "recruiter_decision": interview.recruiter_decision,
                "overall_score": float(interview.overall_score) if interview.overall_score is not None else None,
                "recommendation": interview.recommendation,
                "created_at": interview.created_at,
                "completed_at": interview.completed_at,
            }
            for interview in rows
        ]

        return Response({"stats": stats, "results": results}, status=HTTP_200_OK)


class EligibleAIInterviewApplicationsView(APIView):
    """GET /api/ai-interviews/eligible-applications/ -- for the recruiter
    dashboard's "start a test interview" flow: every job application on one
    of this recruiter's ai_interview_enabled jobs, so they can pick one and
    generate a real join link without waiting for that candidate to
    actually pass an assessment."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from jobs.models import JobApplication

        company = get_user_company(request.user)
        if not company:
            return Response({"error": "No company found for this user."}, status=HTTP_403_FORBIDDEN)

        applications = (
            JobApplication.objects.filter(job__company=company, job__ai_interview_enabled=True)
            .select_related("job", "applicant__user")
            .order_by("-applied_date")[:200]
        )

        existing_interview_keys = set(
            AIInterview.objects.filter(organisation=company).values_list("job_id", "candidate_id")
        )

        results = [
            {
                "job_application_id": application.id,
                "job_id": application.job_id,
                "job_title": application.job.title,
                "candidate_name": application.applicant.full_name or application.applicant.user.get_full_name(),
                "already_has_interview": (application.job_id, application.applicant_id) in existing_interview_keys,
            }
            for application in applications
        ]
        return Response({"results": results}, status=HTTP_200_OK)


class TriggerAIInterviewView(APIView):
    """POST /api/ai-interviews/trigger/ -- { job_application_id } -> creates
    (or returns the existing) AIInterview for that application and hands
    back its join URL. Recruiter-only manual equivalent of the automatic
    assessment-pass trigger (skill_assessment.tasks._finalize_submission_score),
    for testing the feature without running a candidate through a full
    assessment first."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from jobs.models import JobApplication

        from .services import provision_ai_interview

        job_application_id = request.data.get("job_application_id")
        application = JobApplication.objects.filter(pk=job_application_id).select_related("job", "applicant__user").first()
        if not application:
            return Response({"error": "Application not found."}, status=HTTP_404_NOT_FOUND)

        company = get_user_company(request.user)
        if not company or application.job.company_id != company.id:
            return Response({"error": "You do not have permission to trigger this interview."}, status=HTTP_403_FORBIDDEN)

        if not application.job.ai_interview_enabled:
            return Response({"error": "AI interview is not enabled on this job."}, status=HTTP_400_BAD_REQUEST)

        interview = provision_ai_interview(application.job, application)
        return Response({
            "id": str(interview.id),
            "status": interview.status,
            "join_url": interview.get_join_url(),
        }, status=HTTP_200_OK)
