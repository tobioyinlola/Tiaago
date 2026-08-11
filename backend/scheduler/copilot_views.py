"""Interview-copilot specific views, kept separate from views.py (the
older manual-scheduler CRUD) to keep each file focused. All operate on
the same `Scheduler` model."""

import logging
from datetime import timedelta

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

from create_user.models import CompanyTeamMember
from create_user.permissions import get_user_company, user_is_company_role
from notifications.models import Notification
from notifications.utils import notify_user
from subscriptions.billing_service import BillingService

from .models import (
    Scheduler,
    InterviewPreparation,
    InterviewNote,
    InterviewCompetencyScore,
    InterviewSummary,
    InterviewCandidateFeedback,
)
from .services import DailyRoomProvisioningError, create_meeting_token

logger = logging.getLogger(__name__)

# Matches JOIN_WINDOW_MINUTES on the frontend (recruiter dashboard's
# InterviewJoinButton, interviews.constants.ts) and the "room will open 30
# minutes before your interview" copy in the candidate confirmation/reminder
# emails -- the Daily.co token's nbf must actually honor this window on both
# the recruiter and candidate join paths below, or those promises are false:
# without it, a token minted with nbf=start_dt is rejected by Daily.co for
# anyone arriving before the exact scheduled second, regardless of what any
# button or email claims.
JOIN_WINDOW_MINUTES = 30


def _get_owned_interview(request, pk, select_related=()):
    """Shared "does this recruiter own this interview" check for every
    workspace/prep endpoint below -- mirrors StartInterviewView/
    EndInterviewView's own inline checks (kept there unchanged to avoid
    touching already-working code) without repeating the boilerplate in
    every new view."""
    qs = Scheduler.objects.all()
    if select_related:
        qs = qs.select_related(*select_related)
    interview = qs.filter(pk=pk).first()
    if not interview:
        return None, Response({"error": "Interview not found."}, status=HTTP_404_NOT_FOUND)

    company = get_user_company(request.user)
    if not company or interview.company_id != company.id:
        return None, Response(
            {"error": "You do not have permission to access this interview."}, status=HTTP_403_FORBIDDEN
        )
    return interview, None


def _interview_details(interview):
    """Shared, non-sensitive interview summary for the candidate-facing
    pre-join and join responses."""
    recruiter = interview.company.company_rep
    return {
        "job_title": interview.job_title or interview.title,
        "company_name": interview.company.company_name,
        "recruiter_first_name": recruiter.first_name if recruiter else "",
        "duration_minutes": interview.duration_minutes,
        "recording_enabled": interview.recording_enabled,
        "scheduled_at": timezone.make_aware(
            timezone.datetime.combine(interview.meeting_date, interview.start_time)
        ).isoformat(),
    }


class CandidateJoinLookupView(APIView):
    """GET /api/interviews/<token>/ -- no-login lookup for the join page's
    initial load. Never requires authentication; the token itself is the
    credential (see Scheduler.candidate_join_token)."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        interview = Scheduler.objects.filter(candidate_join_token=token).select_related(
            "company", "company__company_rep", "talent"
        ).first()
        if not interview:
            return Response({"found": False}, status=HTTP_404_NOT_FOUND)

        return Response({
            "found": True,
            "status": interview.status,
            **_interview_details(interview),
        }, status=HTTP_200_OK)


class CandidateJoinView(APIView):
    """POST /api/interviews/join-candidate/ -- { token, consentGiven } ->
    { roomUrl, participantToken, interviewDetails }. Mints a fresh,
    non-owner Daily.co token on every call rather than reusing a stored
    one, since the room's nbf/exp window means a token minted at
    room-creation time may have gone stale by the time the candidate
    actually joins."""

    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        consent_given = bool(request.data.get("consentGiven"))
        if not token:
            return Response({"error": "token is required"}, status=HTTP_400_BAD_REQUEST)

        interview = Scheduler.objects.filter(candidate_join_token=token).select_related(
            "company", "company__company_rep", "talent"
        ).first()
        if not interview:
            return Response(
                {"error": "This interview link is invalid or has expired."}, status=HTTP_404_NOT_FOUND
            )
        if interview.status == Scheduler.Status.COMPLETED:
            return Response({"error": "This interview has already taken place."}, status=HTTP_400_BAD_REQUEST)
        if interview.status == Scheduler.Status.CANCELLED:
            return Response(
                {"error": "This interview has been cancelled. Please contact the recruiter."},
                status=HTTP_400_BAD_REQUEST,
            )
        if not interview.room_name:
            return Response(
                {"error": "This interview's video room isn't ready yet. Please try again shortly."},
                status=HTTP_400_BAD_REQUEST,
            )
        room_opens_at = timezone.make_aware(
            timezone.datetime.combine(interview.meeting_date, interview.start_time)
        ) - timedelta(minutes=JOIN_WINDOW_MINUTES)
        if timezone.now() < room_opens_at:
            # Same "opens 30 minutes before" promise as the confirmation/
            # reminder emails -- caught here with a friendly message instead
            # of letting the join attempt fail deep inside the Daily.co
            # client SDK once nbf actually rejects it.
            return Response(
                {"error": f"The room opens {JOIN_WINDOW_MINUTES} minutes before your interview starts. Please come back closer to your scheduled time."},
                status=HTTP_400_BAD_REQUEST,
            )
        if interview.recording_enabled and not consent_given:
            return Response(
                {"error": "Recording consent is required to join this interview."}, status=HTTP_400_BAD_REQUEST
            )

        try:
            start_dt = timezone.make_aware(timezone.datetime.combine(interview.meeting_date, interview.start_time))
            end_dt = timezone.make_aware(timezone.datetime.combine(interview.meeting_date, interview.end_time))
            participant_token = create_meeting_token(
                interview.room_name,
                is_owner=False,
                participant_name=interview.talent.full_name if interview.talent else "Candidate",
                nbf=int((start_dt - timedelta(minutes=JOIN_WINDOW_MINUTES)).timestamp()),
                exp=int(end_dt.timestamp()),
            )
        except DailyRoomProvisioningError as e:
            logger.error(f"Failed to mint candidate token for interview {interview.id}: {e.detail}")
            return Response({"error": "Could not join the interview room. Please try again."}, status=e.status_code)

        first_join = interview.candidate_joined_at is None
        update_fields = []
        if first_join:
            interview.candidate_joined_at = timezone.now()
            update_fields.append("candidate_joined_at")
        if consent_given and not interview.candidate_consent_given_at:
            interview.candidate_consent_given_at = timezone.now()
            update_fields.append("candidate_consent_given_at")
        if update_fields:
            interview.save(update_fields=update_fields)

        if first_join and interview.company.company_rep_id:
            try:
                notify_user(
                    interview.company.company_rep,
                    title="Candidate is ready",
                    message=f"{interview.talent.full_name if interview.talent else 'The candidate'} has joined and is ready.",
                    notification_type=Notification.Type.INTERVIEW,
                    link_path="recruiter/dashboard/interviews",
                    link_label="Join interview",
                )
            except Exception:
                logger.exception(f"Failed to send waiting-room notification for interview {interview.id}")

        return Response({
            "roomUrl": interview.room_url,
            "participantToken": participant_token,
            "interviewDetails": _interview_details(interview),
        }, status=HTTP_200_OK)


class StartInterviewView(APIView):
    """POST /api/schedulers/<pk>/start/ -- recruiter clicks "Join Interview".
    Charges the interview package (+ recording add-on if requested), then
    mints the recruiter's owner Daily.co token. This is also the sole
    trigger for interview-package billing (see BillingService.charge_interview_package)
    and for flipping status to IN_PROGRESS -- there is no separate Daily.co
    webhook/polling path for either."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        interview = Scheduler.objects.filter(pk=pk).select_related("company", "talent").first()
        if not interview:
            return Response({"error": "Interview not found."}, status=HTTP_404_NOT_FOUND)

        company = get_user_company(request.user)
        if not company or interview.company_id != company.id:
            return Response({"error": "You do not have permission to start this interview."}, status=HTTP_403_FORBIDDEN)
        if not request.user.is_staff and not user_is_company_role(
            request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]
        ):
            return Response({"error": "You do not have permission to start this interview."}, status=HTTP_403_FORBIDDEN)

        if interview.status in (Scheduler.Status.CANCELLED, Scheduler.Status.COMPLETED):
            return Response({"error": f"This interview is {interview.status.lower()} and cannot be started."}, status=HTTP_400_BAD_REQUEST)
        if not interview.room_name:
            return Response({"error": "The video room isn't ready yet. Please try again shortly."}, status=HTTP_400_BAD_REQUEST)

        enable_recording = bool(request.data.get("enable_recording", interview.recording_enabled))

        billing_result = BillingService.charge_interview_package(company, interview, enable_recording)
        if not billing_result["success"]:
            try:
                notify_user(
                    request.user,
                    title="Insufficient wallet balance",
                    message="Your wallet balance is too low to start this interview. Please top up to continue.",
                    notification_type=Notification.Type.BILLING_ALERT,
                    link_path="recruiter/dashboard/billing",
                    link_label="Fund wallet",
                )
            except Exception:
                logger.exception(f"Failed to send insufficient-funds notification for interview {interview.id}")
            return Response(
                {"error": "Insufficient wallet balance to start this interview."},
                status=HTTP_402_PAYMENT_REQUIRED,
            )

        interview.refresh_from_db()

        try:
            start_dt = timezone.make_aware(timezone.datetime.combine(interview.meeting_date, interview.start_time))
            end_dt = timezone.make_aware(timezone.datetime.combine(interview.meeting_date, interview.end_time))
            recruiter_token = create_meeting_token(
                interview.room_name,
                is_owner=True,
                participant_name=request.user.get_full_name() or request.user.email,
                nbf=int((start_dt - timedelta(minutes=JOIN_WINDOW_MINUTES)).timestamp()),
                exp=int(end_dt.timestamp()) + 3600,  # matches the join-page CTA's 4-hour-from-scheduled-time window
                enable_recording=enable_recording,
            )
        except DailyRoomProvisioningError as e:
            logger.error(f"Failed to mint recruiter token for interview {interview.id}: {e.detail}")
            return Response({"error": "Could not join the interview room. Please try again."}, status=e.status_code)

        interview.status = Scheduler.Status.IN_PROGRESS
        interview.started_at = timezone.now()
        interview.recording_enabled = enable_recording
        interview.save(update_fields=["status", "started_at", "recording_enabled"])

        ws_scheme = "wss" if request.is_secure() else "ws"
        transcription_ws_url = f"{ws_scheme}://{request.get_host()}/ws/interview/{interview.id}/"

        return Response({
            "roomUrl": interview.room_url,
            "participantToken": recruiter_token,
            "billing": billing_result,
            "transcriptionWebsocketUrl": transcription_ws_url,
        }, status=HTTP_200_OK)


class EndInterviewView(APIView):
    """POST /api/schedulers/<pk>/end/ -- only the recruiter can end an
    interview (the candidate's in-call view has no end control -- see the
    join-page design). Marks it COMPLETED, records actual duration, and
    schedules the Daily.co room for deletion 60 minutes out."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .tasks import delete_room_after_interview, process_interview_pipeline

        interview = Scheduler.objects.filter(pk=pk).select_related("company").first()
        if not interview:
            return Response({"error": "Interview not found."}, status=HTTP_404_NOT_FOUND)

        company = get_user_company(request.user)
        if not company or interview.company_id != company.id:
            return Response({"error": "You do not have permission to end this interview."}, status=HTTP_403_FORBIDDEN)

        if interview.status == Scheduler.Status.COMPLETED:
            return Response({"status": interview.status}, status=HTTP_200_OK)

        interview.status = Scheduler.Status.COMPLETED
        interview.ended_at = timezone.now()
        if interview.started_at:
            interview.actual_duration_seconds = int((interview.ended_at - interview.started_at).total_seconds())
        update_fields = ["status", "ended_at", "actual_duration_seconds"]

        if interview.recording_enabled:
            # Actual processing (fetching the finished Daily.co recording,
            # uploading it, generating the transcript) is a later phase --
            # this just flags that a recording is expected so the
            # processing page's "transcript being compiled" step has
            # something real to reflect.
            interview.recording_status = Scheduler.RecordingStatus.UPLOADING
            update_fields.append("recording_status")

        deletion_task = delete_room_after_interview.apply_async((str(interview.id),), countdown=60 * 60)
        interview.room_deletion_task_id = deletion_task.id
        update_fields.append("room_deletion_task_id")

        interview.save(update_fields=update_fields)

        process_interview_pipeline.delay(str(interview.id))

        return Response({"status": interview.status, "ended_at": interview.ended_at}, status=HTTP_200_OK)


def _serialize_preparation(prep):
    return {
        "generation_status": prep.generation_status,
        "candidate_snapshot": prep.candidate_snapshot,
        "career_timeline": prep.career_timeline,
        "strengths": prep.strengths,
        "watch_areas": prep.watch_areas,
        "suggested_focus": prep.suggested_focus,
        "assessment_highlights": prep.assessment_highlights,
        "competencies": prep.competencies,
        "questions": prep.questions,
        "generated_at": prep.generated_at,
        "model_used": prep.model_used,
        "recruiter_edited_at": prep.recruiter_edited_at,
    }


class InterviewPreparationView(APIView):
    """GET /api/schedulers/<pk>/preparation/ -- fetch the cached brief,
    auto-triggering generation the first time (or after a prior failure)
    so the prepare page's own poll loop is the only thing that needs to
    know generation is asynchronous.

    PATCH -- save recruiter edits to the questions array. Add/edit/delete/
    reorder/mark-as-asked in the UI all collapse to "PATCH the whole
    updated array" rather than separate partial-update endpoints."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        interview, error = _get_owned_interview(request, pk, select_related=("talent",))
        if error:
            return error

        prep, created = InterviewPreparation.objects.get_or_create(interview=interview)
        if created or prep.generation_status in (
            InterviewPreparation.GenerationStatus.PENDING,
            InterviewPreparation.GenerationStatus.FAILED,
        ):
            from .tasks import generate_interview_preparation_task
            generate_interview_preparation_task.delay(str(interview.id))
            if prep.generation_status == InterviewPreparation.GenerationStatus.PENDING:
                # Cosmetic only (not saved) -- reflects what the task is
                # about to do so the very first poll response doesn't lag
                # a beat behind the worker actually picking it up.
                prep.generation_status = InterviewPreparation.GenerationStatus.GENERATING

        data = _serialize_preparation(prep)
        # The header (candidate, job, real assessment score) must render
        # immediately even while the AI brief is still GENERATING -- don't
        # make it wait on (or drift from) assessment_highlights.overall_score,
        # which is the model's own restatement of the score, not the score
        # itself.
        job_application = interview.get_job_application()
        real_score = None
        if job_application:
            from skill_assessment.models import CandidateAssessmentSubmission

            submission = (
                CandidateAssessmentSubmission.objects.filter(
                    candidate=interview.talent, skill_assessment__job_application=job_application, is_completed=True,
                )
                .order_by("-completed_at")
                .first()
            )
            real_score = submission.total_score if submission else None
        data["interview"] = {
            "candidate_name": interview.talent.full_name if interview.talent else "",
            "job_title": interview.job_title or interview.title,
            "application_date": job_application.applied_date if job_application else None,
            "assessment_score": real_score,
            "scheduled_at": timezone.make_aware(
                timezone.datetime.combine(interview.meeting_date, interview.start_time)
            ).isoformat(),
            "duration_minutes": interview.duration_minutes,
        }
        return Response(data, status=HTTP_200_OK)

    def patch(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        prep = InterviewPreparation.objects.filter(interview=interview).first()
        if not prep:
            return Response(
                {"error": "No preparation brief exists for this interview yet."}, status=HTTP_404_NOT_FOUND
            )

        if "questions" in request.data:
            prep.questions = request.data["questions"]
        prep.recruiter_edited_at = timezone.now()
        prep.save(update_fields=["questions", "recruiter_edited_at"])
        return Response(_serialize_preparation(prep), status=HTTP_200_OK)


class RegenerateInterviewPreparationView(APIView):
    """POST /api/schedulers/<pk>/preparation/regenerate/ -- "Regenerate
    brief" button. Unlike the GET endpoint's auto-trigger, this always
    re-runs generation even if a brief is already READY."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        from .tasks import generate_interview_preparation_task

        prep, _created = InterviewPreparation.objects.get_or_create(interview=interview)
        prep.generation_status = InterviewPreparation.GenerationStatus.GENERATING
        prep.save(update_fields=["generation_status"])
        generate_interview_preparation_task.delay(str(interview.id), force=True)
        return Response(_serialize_preparation(prep), status=HTTP_200_OK)


class InterviewNotesView(APIView):
    """GET/PUT /api/schedulers/<pk>/notes/ -- autosave endpoint, called
    every 10 seconds from the workspace's rich text editor and once more
    on window beforeunload."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error
        note = InterviewNote.objects.filter(interview=interview).first()
        return Response({
            "content_rich": note.content_rich if note else "",
            "content_plain": note.content_plain if note else "",
            "last_edited_at": note.last_edited_at if note else None,
        }, status=HTTP_200_OK)

    def put(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        now = timezone.now()
        note, _created = InterviewNote.objects.update_or_create(
            interview=interview,
            defaults={
                "content_rich": request.data.get("content_rich", ""),
                "content_plain": request.data.get("content_plain", ""),
                "auto_saved_at": now,
                "last_edited_at": now,
            },
        )
        return Response(
            {"last_edited_at": note.last_edited_at, "auto_saved_at": note.auto_saved_at}, status=HTTP_200_OK
        )


def _seed_competency_scores(interview):
    """First scorecard fetch seeds one InterviewCompetencyScore row per
    AI-inferred competency (InterviewPreparation.competencies) -- a no-op
    if scores already exist (recruiter may have already started scoring)
    or no brief/competencies exist yet."""
    if InterviewCompetencyScore.objects.filter(interview=interview).exists():
        return
    prep = InterviewPreparation.objects.filter(interview=interview).first()
    if not prep or not prep.competencies:
        return
    InterviewCompetencyScore.objects.bulk_create(
        [
            InterviewCompetencyScore(
                interview=interview,
                competency_id=str(c.get("id") or c.get("name", ""))[:100],
                competency_name=c.get("name") or "Untitled competency",
                weight=c.get("weight") or 1,
                required=c.get("required", True),
                # The AI-generated competency set has no per-competency
                # score_type -- everything seeds as a 0-10 numeric input,
                # the spec's most general option.
                score_type=InterviewCompetencyScore.ScoreType.NUMERIC,
            )
            for c in prep.competencies
        ],
        ignore_conflicts=True,
    )


def _serialize_competency(score):
    return {
        "id": str(score.id),
        "competency_id": score.competency_id,
        "competency_name": score.competency_name,
        "required": score.required,
        "score_type": score.score_type,
        "weight": float(score.weight),
        "score_raw": float(score.score_raw) if score.score_raw is not None else None,
        "score_normalised": float(score.score_normalised) if score.score_normalised is not None else None,
        "ai_suggested_score": float(score.ai_suggested_score) if score.ai_suggested_score is not None else None,
        "ai_evidence": score.ai_evidence,
        "recruiter_notes": score.recruiter_notes,
        "scored_at": score.scored_at,
    }


def _normalise_score(score_raw, score_type):
    """0-100 scale regardless of input type, matching
    assessment_highlights.overall_score's own 0-100 convention -- overall
    score is a weighted sum of these."""
    if score_raw is None:
        return None
    if score_type == InterviewCompetencyScore.ScoreType.NUMERIC:
        return max(0, min(100, float(score_raw) * 10))
    if score_type == InterviewCompetencyScore.ScoreType.STAR:
        return max(0, min(100, float(score_raw) * 20))
    if score_type == InterviewCompetencyScore.ScoreType.PASS_FAIL:
        return 100.0 if float(score_raw) else 0.0
    if score_type == InterviewCompetencyScore.ScoreType.PERCENT:
        return max(0, min(100, float(score_raw)))
    return None


class InterviewScorecardView(APIView):
    """GET /api/schedulers/<pk>/scorecard/ -- seeds + returns every
    competency score row for this interview, plus the live overall score
    (sum of normalised_score * weight for scored competencies, per spec)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        _seed_competency_scores(interview)
        scores = list(InterviewCompetencyScore.objects.filter(interview=interview).order_by("competency_name"))

        scored = [s for s in scores if s.score_normalised is not None]
        total_weight = sum(float(s.weight) for s in scored) or 1
        overall_score = (
            sum(float(s.score_normalised) * float(s.weight) for s in scored) / total_weight if scored else None
        )

        return Response({
            "competencies": [_serialize_competency(s) for s in scores],
            "overall_score": round(overall_score, 1) if overall_score is not None else None,
            "scored_count": len(scored),
            "total_count": len(scores),
        }, status=HTTP_200_OK)


class InterviewCompetencyScoreDetailView(APIView):
    """PATCH /api/schedulers/<pk>/scorecard/<competency_score_id>/ -- score
    or update notes for one competency."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, competency_score_id):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        score = InterviewCompetencyScore.objects.filter(id=competency_score_id, interview=interview).first()
        if not score:
            return Response({"error": "Competency not found on this interview."}, status=HTTP_404_NOT_FOUND)

        update_fields = []
        if "score_raw" in request.data:
            raw = request.data["score_raw"]
            score.score_raw = raw
            score.score_normalised = _normalise_score(raw, score.score_type)
            score.scored_at = timezone.now()
            update_fields += ["score_raw", "score_normalised", "scored_at"]
        if "recruiter_notes" in request.data:
            score.recruiter_notes = request.data["recruiter_notes"]
            update_fields.append("recruiter_notes")

        if update_fields:
            score.save(update_fields=update_fields)
        return Response(_serialize_competency(score), status=HTTP_200_OK)


class SubmitInterviewScorecardView(APIView):
    """POST /api/schedulers/<pk>/scorecard/submit/ -- validates every
    required competency has been scored before confirming."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        _seed_competency_scores(interview)
        scores = InterviewCompetencyScore.objects.filter(interview=interview)
        missing = [s.competency_name for s in scores if s.required and s.score_raw is None]
        if missing:
            return Response(
                {"error": "Please score all required competencies before submitting.", "missing": missing},
                status=HTTP_400_BAD_REQUEST,
            )

        return Response({"submitted": True}, status=HTTP_200_OK)


class InterviewProcessingStatusView(APIView):
    """GET /api/schedulers/<pk>/processing-status/ -- polled every ~3s by
    the processing page after an interview ends. Reflects the three
    independently-failable steps of process_interview_pipeline (transcript
    compile, AI summary, draft candidate feedback) so the page can show a
    live checklist and a per-step failure state instead of a stuck spinner."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        interview, error = _get_owned_interview(request, pk)
        if error:
            return error

        summary = InterviewSummary.objects.filter(interview=interview).first()
        feedback = InterviewCandidateFeedback.objects.filter(interview=interview).first()

        summary_status = summary.generation_status if summary else InterviewSummary.GenerationStatus.PENDING
        summary_settled = summary_status in (InterviewSummary.GenerationStatus.READY, InterviewSummary.GenerationStatus.FAILED)
        if feedback and feedback.content:
            feedback_status = "READY"
        elif summary_settled:
            # The feedback-draft step runs right after the summary step and
            # only if a candidate exists to draft feedback for -- once the
            # summary has settled, a still-empty feedback row means that
            # step failed (or there was no candidate to draft for).
            feedback_status = "FAILED"
        else:
            feedback_status = "PENDING"

        all_done = (
            interview.transcription_status in (Scheduler.TranscriptionStatus.READY, Scheduler.TranscriptionStatus.FAILED)
            and summary_status in (InterviewSummary.GenerationStatus.READY, InterviewSummary.GenerationStatus.FAILED)
        )

        return Response({
            "interview_status": interview.status,
            "transcription_status": interview.transcription_status,
            "summary_status": summary_status,
            "feedback_status": feedback_status,
            "all_done": all_done,
        }, status=HTTP_200_OK)
