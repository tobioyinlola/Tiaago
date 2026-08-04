"""Non-Celery helpers for the AI interview flow. Keeping row-creation here
(fast, synchronous, called straight from skill_assessment.tasks._finalize_submission_score)
separate from tasks.py (slow, AI-calling, always .delay()'d) so a candidate's
assessment-marking request is never blocked on this feature."""

import logging
import uuid

from django.utils import timezone

logger = logging.getLogger(__name__)


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
    existing = AIInterview.objects.filter(job=job, candidate=candidate, organisation=organisation).first()
    if existing and existing.status in in_flight_statuses and (
        existing.status == AIInterview.Status.IN_PROGRESS or timezone.now() <= existing.window_end_at
    ):
        return existing

    interview = AIInterview.objects.create(
        job=job,
        candidate=candidate,
        organisation=organisation,
        livekit_room_name=f"tiaago-ai-{uuid.uuid4()}",
        candidate_identity=f"candidate-{candidate.id}",
        questions_total=job.ai_interview_questions_count,
        window_end_at=timezone.now() + timezone.timedelta(hours=job.ai_interview_window_hours),
    )
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

    interview = AIInterview.objects.create(
        job=job,
        candidate=None,
        organisation=job.company,
        is_preview=True,
        created_by=user,
        livekit_room_name=f"tiaago-ai-preview-{uuid.uuid4()}",
        candidate_identity=f"preview-{user.id}-{uuid.uuid4().hex[:8]}",
        questions_total=job.ai_interview_questions_count,
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
    if interview.created_by:
        return interview.created_by.first_name or "there"
    return "there"


def get_job_application_for(job, candidate):
    return job.job_applications.filter(applicant=candidate).first()


def get_candidate_context(job, candidate, job_application):
    """Best-effort resume text + latest assessment score for this
    (job, candidate) pair -- shared by question generation (tasks.py) and
    the agent-data endpoint (views.py) so both feed interview_agent.py/GPT-4o
    the same candidate context."""
    from utils.ai_service import AIService

    resume_summary = ""
    assessment_score = None
    if not job_application:
        return resume_summary, assessment_score

    try:
        resume_summary = AIService.extract_resume_text(candidate.resume, candidate.resume.name) or ""
    except Exception:
        logger.exception("extract_resume_text failed for job=%s candidate=%s", job.id, candidate.id)

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
        logger.exception("Failed to fetch assessment score for job=%s candidate=%s", job.id, candidate.id)

    return resume_summary, assessment_score


def get_weak_areas_for(job_application):
    """Best-effort pull of resume-screening weak areas for this job
    application -- feeds the question-generation prompt's "weak areas from
    assessment" input. A missing/failed resume analysis is not fatal here,
    it just means the prompt gets an empty list."""
    if not job_application:
        return []
    try:
        from skill_assessment.models import ResumeAnalysis

        analysis = (
            ResumeAnalysis.objects.filter(job_application=job_application)
            .order_by("-created_at")
            .first()
        )
        if not analysis or not analysis.areas_for_improvement:
            return []
        return [line.strip("-* \t") for line in analysis.areas_for_improvement.splitlines() if line.strip()][:5]
    except Exception:
        logger.exception("Failed to fetch weak areas for job_application %s", getattr(job_application, "id", None))
        return []
