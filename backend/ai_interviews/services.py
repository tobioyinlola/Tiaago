"""Non-Celery helpers for the AI interview flow. Keeping row-creation here
(fast, synchronous, called straight from skill_assessment.tasks._finalize_submission_score)
separate from tasks.py (slow, AI-calling, always .delay()'d) so a candidate's
assessment-marking request is never blocked on this feature."""

import logging
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

# Fixed slot size regardless of a specific job's configured duration --
# AI_INTERVIEW_DURATION_OPTIONS tops out at 10 minutes, so this comfortably
# covers any interview with room to spare, and keeps slot math simple (no
# need to bin-pack mixed-length interviews against each other).
SLOT_MINUTES = 10


def _acquire_slot_lock():
    """Blocks until this is the only in-flight slot allocation, by locking
    the AIInterviewSlotLock singleton row. Must be called from inside a
    transaction.atomic() block that also covers the eventual
    AIInterview.objects.create() -- the lock is only as good as how much
    of "check capacity, then create the row" it actually spans; releasing
    it between the two (e.g. by letting this function open and close its
    own transaction) would defeat the point."""
    from .models import AIInterviewSlotLock

    # The migration that adds this model also seeds pk=1, but don't let a
    # missing row (e.g. a hand-edited/rolled-back database) hard-crash
    # interview provisioning -- create it on first use instead.
    AIInterviewSlotLock.objects.get_or_create(pk=1)
    AIInterviewSlotLock.objects.select_for_update().get(pk=1)


def allocate_ai_interview_slot(duration_minutes):
    """Reserves the next available time slot with the agent fleet: at most
    AI_INTERVIEW_MAX_CONCURRENT_SESSIONS interviews may share the same
    SLOT_MINUTES-wide window, so a candidate whose slot has arrived is
    guaranteed an agent is free, rather than finding out reactively at
    start-of-call. Returns (scheduled_at, scheduled_end_at).

    Caller must already hold the slot lock (see _acquire_slot_lock) --
    this function only counts already-committed rows, so without that lock
    two concurrent callers can both count the same slot as free and both
    get handed it."""
    from .models import AIInterview

    # Anything terminal (completed/no-show/abandoned/failed) has freed its
    # slot up already -- only these statuses still hold one.
    slot_holding_statuses = (
        AIInterview.Status.INVITED, AIInterview.Status.SCHEDULED,
        AIInterview.Status.WAITING, AIInterview.Status.IN_PROGRESS,
    )

    max_concurrent = settings.AI_INTERVIEW_MAX_CONCURRENT_SESSIONS
    now = timezone.now().replace(second=0, microsecond=0)
    remainder = now.minute % SLOT_MINUTES
    slot_start = now + timedelta(minutes=(SLOT_MINUTES - remainder) if remainder else 0)

    while True:
        slot_end = slot_start + timedelta(minutes=SLOT_MINUTES)
        occupied = AIInterview.objects.filter(
            status__in=slot_holding_statuses,
            scheduled_at__lt=slot_end,
            scheduled_end_at__gt=slot_start,
        ).count()
        if occupied < max_concurrent:
            return slot_start, slot_start + timedelta(minutes=duration_minutes)
        slot_start = slot_end


def provision_ai_interview(job, job_application):
    """Creates the AIInterview row for a candidate on a job with
    ai_interview_enabled=True, then hands off to Celery for question
    generation + the invitation email. Returns the existing AIInterview
    instead of creating a new one only while that interview is still
    "in flight" (invited/scheduled/waiting/in-progress, and not past its
    window) -- once it reaches any terminal state (completed, no-show,
    abandoned, failed) or its window has expired, a fresh row (new token,
    new window) is created instead of silently handing back a dead link.

    Called from two places: automatically when a candidate passes their
    assessment (skill_assessment.tasks._finalize_submission_score), and
    manually by a recruiter testing the feature (views.TriggerAIInterviewView,
    where a recruiter re-clicking "generate join link" after a prior test
    run finished should always get a fresh, usable interview)."""
    from .models import AIInterview
    from .tasks import generate_questions_and_invite_task

    candidate = job_application.applicant
    organisation = job.company

    in_flight_statuses = (
        AIInterview.Status.INVITED, AIInterview.Status.SCHEDULED,
        AIInterview.Status.WAITING, AIInterview.Status.IN_PROGRESS,
    )

    def _existing_in_flight_interview():
        # Keyed on job_application, not candidate -- candidate is null for
        # every guest applicant, so filtering on it alone would match any
        # other guest's (or a preview's) in-flight interview for this job.
        existing = AIInterview.objects.filter(
            job=job, job_application=job_application, organisation=organisation
        ).first()
        if existing and existing.status in in_flight_statuses and (
            existing.status == AIInterview.Status.IN_PROGRESS or timezone.now() <= existing.window_end_at
        ):
            return existing
        return None

    existing = _existing_in_flight_interview()
    if existing:
        return existing

    with transaction.atomic():
        _acquire_slot_lock()
        # Re-check inside the lock -- two concurrent calls for the same
        # job_application (e.g. a duplicate Celery dispatch) could both
        # pass the check above before either commits a row; only the first
        # to reach here should actually create one.
        existing = _existing_in_flight_interview()
        if existing:
            return existing
        scheduled_at, scheduled_end_at = allocate_ai_interview_slot(job.ai_interview_duration_minutes)
        candidate_identity = f"candidate-{candidate.id}" if candidate else f"candidate-guest-{job_application.id}"
        interview = AIInterview.objects.create(
            job=job,
            candidate=candidate,
            job_application=job_application,
            organisation=organisation,
            livekit_room_name=f"tiaago-ai-{uuid.uuid4()}",
            candidate_identity=candidate_identity,
            questions_total=job.ai_interview_questions_count,
            scheduled_at=scheduled_at,
            scheduled_end_at=scheduled_end_at,
            window_end_at=timezone.now() + timezone.timedelta(hours=job.ai_interview_window_hours),
        )
    # Dispatched after the transaction above commits -- .delay()'ing from
    # inside it risks the Celery worker picking this up before the row is
    # actually visible to it.
    generate_questions_and_invite_task.delay(str(interview.id))
    return interview


def provision_preview_ai_interview(job, user):
    """Creates a candidate-less AIInterview so a recruiter can experience
    the candidate-facing join/session flow for one of their own
    ai_interview_enabled jobs -- join, talk to Alex, end it -- without a
    real candidate, billing charge, or any emails going out. Always a
    fresh row (no reuse-existing check): a recruiter previewing repeatedly
    should always get a live, unused room."""
    from .models import AIInterview
    from .tasks import generate_preview_questions_task

    with transaction.atomic():
        _acquire_slot_lock()
        scheduled_at, scheduled_end_at = allocate_ai_interview_slot(job.ai_interview_duration_minutes)
        interview = AIInterview.objects.create(
            job=job,
            candidate=None,
            organisation=job.company,
            is_preview=True,
            created_by=user,
            livekit_room_name=f"tiaago-ai-preview-{uuid.uuid4()}",
            candidate_identity=f"preview-{user.id}-{uuid.uuid4().hex[:8]}",
            questions_total=job.ai_interview_questions_count,
            scheduled_at=scheduled_at,
            scheduled_end_at=scheduled_end_at,
            window_end_at=timezone.now() + timezone.timedelta(hours=24),
        )
    generate_preview_questions_task.delay(str(interview.id))
    return interview


def display_first_name(interview):
    """Candidate's first name for prompts/emails/UI copy, falling back to
    the previewing recruiter's first name (or "there") when this is a
    candidate-less preview interview."""
    candidate = interview.candidate
    if candidate:
        return candidate.user.first_name or (candidate.full_name.split(" ")[0] if candidate.full_name else "")
    if interview.job_application_id:
        return interview.job_application.candidate_full_name.split(" ")[0] if interview.job_application.candidate_full_name else "there"
    if interview.created_by:
        return interview.created_by.first_name or "there"
    return "there"


def get_candidate_context(job, candidate, job_application):
    """Best-effort resume text + latest assessment score for this
    (job, candidate) pair -- feeds the agent-data endpoint (views.py) so
    interview_agent.py/GPT-4o has real candidate context for the live
    conversation, even though the questions themselves are now shared
    per-job (see tasks._get_or_generate_job_questions)."""
    from utils.ai_service import AIService

    resume_summary = ""
    assessment_score = None
    if not job_application:
        return resume_summary, assessment_score

    resume = job_application.candidate_resume
    try:
        if resume:
            resume_summary = AIService.extract_resume_text(resume, resume.name) or ""
    except Exception:
        logger.exception("extract_resume_text failed for job=%s job_application=%s", job.id, job_application.id)

    try:
        from skill_assessment.models import CandidateAssessmentSubmission

        latest_submission = (
            CandidateAssessmentSubmission.objects.filter(
                candidate=candidate,
                skill_assessment__job_application=job_application,
                is_completed=True,
            )
            .order_by("-completed_at")
            .first()
        )
        assessment_score = latest_submission.total_score if latest_submission else None
    except Exception:
        logger.exception("Failed to fetch assessment score for job=%s job_application=%s", job.id, job_application.id)

    return resume_summary, assessment_score
