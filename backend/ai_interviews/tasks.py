import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from notifications.models import Notification
from notifications.utils import notify_user
from utils.ai_service import AIService
from utils.email_handler import EmailHandler, EmailTypes

logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, "FRONTEND_URL", "https://www.tiaago.com/")


def _candidate_name(interview):
    """Candidate's display name for notifications/emails -- the real
    TalentProfile's for a logged-in applicant, or the guest's submitted
    name (via job_application) for a guest applicant. Every caller here is
    on a non-preview interview, which always has one or the other."""
    candidate = interview.candidate
    if candidate:
        return candidate.full_name or candidate.user.get_full_name()
    if interview.job_application_id:
        return interview.job_application.candidate_full_name
    return "Candidate"


def _candidate_recipient(interview):
    """(email, first_name) for candidate-facing emails -- same real-vs-guest
    fallback as _candidate_name."""
    candidate = interview.candidate
    if candidate:
        first_name = candidate.user.first_name or (candidate.full_name.split(" ")[0] if candidate.full_name else "")
        return candidate.user.email, first_name
    if interview.job_application_id:
        job_application = interview.job_application
        full_name = job_application.candidate_full_name
        first_name = full_name.split(" ")[0] if full_name else ""
        return job_application.candidate_email, first_name
    return "", ""


TECHNICAL_ROLE_CATEGORIES = {
    "ENGINEERING", "BACKEND_ENGINEERING", "FRONTEND_ENGINEERING", "FULL_STACK",
    "DEVOPS", "AI_ML", "DATA",
}
# Fallback for jobs with no role_category set (it's optional -- see
# Job.role_category's own help_text) -- catches the common technical job
# titles a recruiter might type without having picked a category.
TECHNICAL_TITLE_KEYWORDS = (
    "engineer", "engineering", "developer", "programmer", "software",
    "backend", "back-end", "frontend", "front-end", "full stack", "fullstack",
    "devops", "sre", "site reliability", "data scientist", "data engineer",
    "machine learning", "ml engineer", "ai engineer", "qa engineer",
    "quality assurance engineer", "architect", "sysadmin", "system administrator",
)


def _is_technical_role(job) -> bool:
    """Whether this job warrants a genuinely technical AI-interview question
    -- see interview_questions_service.py's TECHNICAL_QUESTION_TYPES_BY_COUNT
    on the AI service side for what that actually changes."""
    if job.role_category in TECHNICAL_ROLE_CATEGORIES:
        return True
    title = (job.title or "").lower()
    return any(keyword in title for keyword in TECHNICAL_TITLE_KEYWORDS)


def _get_or_generate_job_questions(job, company_name):
    """Returns this job's AI-interview question list, generating it once
    (via the AI service) and caching on Job.ai_interview_questions the
    first time any candidate reaches this job's interview -- every
    subsequent candidate for the same job gets this exact same set,
    ensuring consistent questions/evaluation criteria across candidates
    instead of a fresh (and differently-worded) AI call per interview.
    Generic/role-level only (no per-candidate resume/assessment context),
    since the whole point is that it's shared. Raises on failure, same as
    the direct AIService call callers previously made.

    Locks the Job row for the whole check-generate-save so two candidates
    for the same job finishing their assessment at nearly the same moment
    can't both see an empty cache and both trigger a (paid) AI call --
    the second just waits for the first's result instead."""
    from jobs.models import Job

    with transaction.atomic():
        job = Job.objects.select_for_update().get(pk=job.pk)
        if job.ai_interview_questions:
            return job.ai_interview_questions

        payload = {
            "job_title": job.title,
            "company_name": company_name,
            "description": job.description,
            "requirements": job.job_requirement,
            "resume_summary": "",
            "assessment_score": None,
            "weak_areas": [],
            "duration_minutes": job.ai_interview_duration_minutes,
            "questions_count": job.ai_interview_questions_count,
            "is_technical_role": _is_technical_role(job),
        }
        result = AIService.generate_ai_interview_questions(payload)
        questions = result.get("questions") if result else None
        if questions:
            job.ai_interview_questions = questions
            job.save(update_fields=["ai_interview_questions"])
        return questions


@shared_task(bind=True, name="generate_questions_and_invite_task", max_retries=2)
def generate_questions_and_invite_task(self, interview_id):
    """Generates the question set for one AI interview, saves it, then
    sends the candidate invitation email and notifies the recruiter.
    Sequential in one task (not split into a polling-status flow) since
    nothing here needs to respond to a waiting HTTP request -- the
    assessment-marking path that triggered this already returned."""
    from .models import AIInterview, AIInterviewQuestion

    interview = AIInterview.objects.select_related(
        "job", "candidate__user", "job_application", "organisation"
    ).filter(id=interview_id).first()
    if not interview:
        logger.warning("AIInterview %s not found", interview_id)
        return

    job = interview.job

    try:
        questions = _get_or_generate_job_questions(job, interview.organisation.company_name)
    except Exception as e:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))
        questions = None

    if not questions:
        interview.status = AIInterview.Status.FAILED
        interview.save(update_fields=["status"])
        logger.error("Question generation failed for AIInterview %s", interview_id)
        return

    AIInterviewQuestion.objects.bulk_create(
        [
            AIInterviewQuestion(
                interview=interview,
                question_number=q["number"],
                question_text=q["text"],
                question_type=q["type"],
                expected_duration_seconds=q.get("expected_duration_seconds", 90),
                followup_if_vague=q.get("followup_if_vague", ""),
                good_signals=q.get("good_signals", []),
                concern_signals=q.get("concern_signals", []),
                transition_phrase=q.get("transition_phrase", ""),
            )
            for q in questions
        ]
    )

    interview.invitation_sent_at = timezone.now()
    interview.save(update_fields=["invitation_sent_at"])

    _send_invitation_email(interview, job)
    _notify_recruiter_invited(interview, job)

    # One-shot ETA-scheduled follow-ups, same pattern as
    # scheduler.views' send_meeting_reminder/meeting_invite_others
    # apply_async(eta=...) calls -- both tasks no-op if the candidate
    # already joined/completed by the time they fire.
    reminder_eta = interview.invitation_sent_at + timedelta(hours=24)
    if reminder_eta < interview.window_end_at:
        send_ai_interview_reminder_task.apply_async((str(interview.id),), eta=reminder_eta)
    send_ai_interview_no_show_followup_task.apply_async(
        (str(interview.id),), eta=interview.window_end_at + timedelta(minutes=15)
    )


@shared_task(bind=True, name="generate_preview_questions_task", max_retries=2)
def generate_preview_questions_task(self, interview_id):
    """Question generation for a recruiter's candidate-less preview
    interview (see services.provision_preview_ai_interview) -- same AI
    call as generate_questions_and_invite_task, minus everything that
    needs a real candidate (resume/assessment context, invite email,
    reminders). Nothing more to do once questions are saved: the
    recruiter already has the join link from the trigger response."""
    from .models import AIInterview, AIInterviewQuestion

    interview = AIInterview.objects.select_related("job", "organisation").filter(id=interview_id).first()
    if not interview:
        logger.warning("AIInterview %s not found", interview_id)
        return

    job = interview.job

    try:
        questions = _get_or_generate_job_questions(job, interview.organisation.company_name)
    except Exception as e:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))
        questions = None

    if not questions:
        interview.status = AIInterview.Status.FAILED
        interview.save(update_fields=["status"])
        logger.error("Preview question generation failed for AIInterview %s", interview_id)
        return

    AIInterviewQuestion.objects.bulk_create(
        [
            AIInterviewQuestion(
                interview=interview,
                question_number=q["number"],
                question_text=q["text"],
                question_type=q["type"],
                expected_duration_seconds=q.get("expected_duration_seconds", 90),
                followup_if_vague=q.get("followup_if_vague", ""),
                good_signals=q.get("good_signals", []),
                concern_signals=q.get("concern_signals", []),
                transition_phrase=q.get("transition_phrase", ""),
            )
            for q in questions
        ]
    )
    interview.invitation_sent_at = timezone.now()
    interview.save(update_fields=["invitation_sent_at"])


def _send_invitation_email(interview, job):
    candidate_email, first_name = _candidate_recipient(interview)
    context = {
        "first_name": first_name,
        "company": interview.organisation.company_name,
        "role": job.title,
        "questions_total": interview.questions_total,
        "duration_minutes": job.ai_interview_duration_minutes,
        "window_end": interview.window_end_at.strftime("%b %d, %I:%M %p"),
        "interview_url": interview.get_join_url(),
    }
    try:
        EmailHandler(recipients=[candidate_email]).send_mail(
            subject="You're invited to an AI interview",
            context=context,
            template="emails/ai_interview_invite.html",
            email_type=EmailTypes.AI_INTERVIEW_INVITE_MAIL,
        )
    except Exception:
        logger.exception("Failed to send AI interview invite email for interview %s", interview.id)


def _notify_recruiter_invited(interview, job):
    recipient = getattr(interview.organisation, "company_rep", None)
    if not recipient:
        return
    try:
        notify_user(
            recipient,
            "Candidate invited to AI interview",
            f"{_candidate_name(interview)} passed the assessment for "
            f"{job.title} and has been invited to an AI interview.",
            notification_type=Notification.Type.INTERVIEW,
            link_path=f"recruiter/dashboard/ai-interviews/{interview.id}",
            link_label="View interview",
        )
    except Exception:
        logger.exception("Failed to notify recruiter of AI interview invite for interview %s", interview.id)


@shared_task(bind=True, name="process_completed_ai_interview_task", max_retries=2)
def process_completed_ai_interview_task(self, interview_id):
    """Runs once an AI interview session ends (see AIInterviewCompleteView):
    compiles the transcript, scores it, saves everything, then emails/notifies
    the recruiter and emails the candidate their feedback."""
    from .models import AIInterview

    interview = AIInterview.objects.select_related(
        "job", "candidate__user", "job_application", "organisation"
    ).filter(id=interview_id).first()
    if not interview:
        logger.warning("AIInterview %s not found", interview_id)
        return

    segments = list(interview.transcript_segments.order_by("timestamp_ms"))
    transcript_raw = "\n".join(f"{seg.speaker}: {seg.text}" for seg in segments)
    transcript_structured = [
        {"speaker": seg.speaker, "text": seg.text, "timestamp_ms": seg.timestamp_ms} for seg in segments
    ]

    interview.transcript_raw = transcript_raw
    interview.transcript_structured = transcript_structured
    interview.duration_seconds = (segments[-1].timestamp_ms // 1000) if segments else interview.duration_seconds
    interview.completed_at = timezone.now()
    interview.status = AIInterview.Status.COMPLETED
    interview.summary_status = AIInterview.SummaryStatus.GENERATING
    interview.save(update_fields=[
        "transcript_raw", "transcript_structured", "duration_seconds",
        "completed_at", "status", "summary_status",
    ])

    questions = list(interview.questions.order_by("question_number"))
    job = interview.job

    payload = {
        "job_title": job.title,
        "company_name": interview.organisation.company_name,
        "requirements": job.job_requirement,
        "candidate_name": _candidate_name(interview),
        "transcript": transcript_raw,
        "questions": [
            {
                "number": q.question_number,
                "text": q.question_text,
                "good_signals": q.good_signals,
                "concern_signals": q.concern_signals,
            }
            for q in questions
        ],
    }

    try:
        result = AIService.score_ai_interview(payload)
    except Exception as e:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))
        result = None

    if not result:
        interview.summary_status = AIInterview.SummaryStatus.FAILED
        interview.summary_error = "Failed to generate interview scoring. A recruiter can retry from the review page."
        interview.save(update_fields=["summary_status", "summary_error"])
        logger.error("Scoring failed for AIInterview %s", interview_id)
        return

    interview.executive_summary = result.get("executive_summary", "")
    interview.overall_score = result.get("overall_score")
    interview.communication_score = result.get("communication_score")
    interview.confidence_score = result.get("confidence_score")
    interview.relevance_score = result.get("relevance_score")
    interview.clarity_score = result.get("clarity_score")
    interview.strengths = result.get("strengths", [])
    interview.concerns = result.get("concerns", [])
    interview.recommendation = result.get("recommendation")
    interview.recommendation_confidence = result.get("recommendation_confidence")
    interview.recommendation_reasons = result.get("recommendation_reasons", [])
    interview.flags = result.get("flags", [])
    interview.candidate_feedback = result.get("candidate_feedback", "")
    interview.recruiter_notes = result.get("recruiter_notes", "")
    interview.summary_status = AIInterview.SummaryStatus.READY
    interview.save()

    scores_by_number = {ps["question_number"]: ps for ps in result.get("per_question_scores", [])}
    for question in questions:
        ps = scores_by_number.get(question.question_number)
        if not ps:
            continue
        question.score = ps.get("score")
        question.signal_strength = ps.get("signal_strength")
        question.ai_notes = ps.get("ai_notes", "")
        question.candidate_response = ps.get("candidate_response_summary", "")
        question.save(update_fields=["score", "signal_strength", "ai_notes", "candidate_response"])

    # Preview interviews have no real candidate to email and the recruiter
    # already knows the result (they're the one who ran it) -- skip both.
    if not interview.is_preview:
        _notify_recruiter_ready(interview, job)
        _send_candidate_feedback(interview, job)


def _notify_recruiter_ready(interview, job):
    recipient = getattr(interview.organisation, "company_rep", None)
    review_url = f"{str(FRONTEND_URL).rstrip('/')}/recruiter/dashboard/ai-interviews/{interview.id}"
    candidate_name = _candidate_name(interview)
    overall = interview.overall_score

    if recipient:
        try:
            notify_user(
                recipient,
                f"AI interview ready: {candidate_name} scored {overall}/100",
                f"{candidate_name}'s AI interview for {job.title} is ready to review.",
                notification_type=Notification.Type.INTERVIEW,
                link_path=f"recruiter/dashboard/ai-interviews/{interview.id}",
                link_label="Review interview",
            )
        except Exception:
            logger.exception("Failed to create in-app notification for interview %s", interview.id)

        try:
            EmailHandler(recipients=[recipient.email]).send_mail(
                subject=f"AI interview complete — {candidate_name} | {overall}/100",
                context={
                    "candidate_name": candidate_name,
                    "role": job.title,
                    "overall_score": overall,
                    "recommendation": interview.recommendation,
                    "top_strengths": ", ".join((interview.strengths or [])[:2]),
                    "duration_minutes": job.ai_interview_duration_minutes,
                    "review_url": review_url,
                },
                template="emails/ai_interview_complete_recruiter.html",
                email_type=EmailTypes.AI_INTERVIEW_COMPLETE_RECRUITER_MAIL,
            )
        except Exception:
            logger.exception("Failed to send AI interview complete email for interview %s", interview.id)


def _send_candidate_feedback(interview, job):
    if not interview.candidate_feedback:
        return
    candidate_email, first_name = _candidate_recipient(interview)
    try:
        EmailHandler(recipients=[candidate_email]).send_mail(
            subject=f"Your interview feedback — {job.title} at {interview.organisation.company_name}",
            context={
                "first_name": first_name,
                "company": interview.organisation.company_name,
                "role": job.title,
                "feedback_content": interview.candidate_feedback,
            },
            template="emails/ai_interview_candidate_feedback.html",
            email_type=EmailTypes.AI_INTERVIEW_CANDIDATE_FEEDBACK_MAIL,
        )
        interview.feedback_sent_at = timezone.now()
        interview.save(update_fields=["feedback_sent_at"])
    except Exception:
        logger.exception("Failed to send candidate feedback email for interview %s", interview.id)


@shared_task(name="send_ai_interview_reminder_task")
def send_ai_interview_reminder_task(interview_id):
    """One-shot, ETA-scheduled 24h after the invite went out (see
    services.provision_ai_interview's apply_async call) -- mirrors
    scheduler.views' send_meeting_reminder scheduling pattern. No-ops if the
    candidate already joined/completed/expired by the time it fires."""
    from .models import AIInterview

    interview = AIInterview.objects.select_related(
        "job", "candidate__user", "job_application", "organisation"
    ).filter(id=interview_id).first()
    if not interview or interview.status != AIInterview.Status.INVITED:
        return
    if timezone.now() > interview.window_end_at:
        return

    job = interview.job
    candidate_email, first_name = _candidate_recipient(interview)
    try:
        EmailHandler(recipients=[candidate_email]).send_mail(
            subject="Reminder: your AI interview is still open",
            context={
                "first_name": first_name,
                "company": interview.organisation.company_name,
                "role": job.title,
                "questions_total": interview.questions_total,
                "duration_minutes": job.ai_interview_duration_minutes,
                "window_end": interview.window_end_at.strftime("%b %d, %I:%M %p"),
                "interview_url": interview.get_join_url(),
            },
            template="emails/ai_interview_invite.html",
            email_type=EmailTypes.AI_INTERVIEW_REMINDER_MAIL,
        )
        interview.reminder_sent_at = timezone.now()
        interview.save(update_fields=["reminder_sent_at"])
    except Exception:
        logger.exception("Failed to send AI interview reminder for interview %s", interview.id)


@shared_task(name="send_ai_interview_no_show_followup_task")
def send_ai_interview_no_show_followup_task(interview_id):
    """One-shot, ETA-scheduled for window_end_at + 15 minutes (see
    services.provision_ai_interview). If the candidate never joined by then,
    marks the interview NO_SHOW and sends the candidate a follow-up."""
    from .models import AIInterview

    interview = AIInterview.objects.select_related(
        "job", "candidate__user", "job_application", "organisation"
    ).filter(id=interview_id).first()
    if not interview or interview.status not in (AIInterview.Status.INVITED, AIInterview.Status.SCHEDULED):
        return

    interview.status = AIInterview.Status.NO_SHOW
    interview.save(update_fields=["status"])

    job = interview.job
    candidate_email, first_name = _candidate_recipient(interview)
    try:
        EmailHandler(recipients=[candidate_email]).send_mail(
            subject="Your AI interview window has closed",
            context={
                "first_name": first_name,
                "company": interview.organisation.company_name,
                "role": job.title,
            },
            template="emails/ai_interview_no_show_followup.html",
            email_type=EmailTypes.AI_INTERVIEW_NO_SHOW_FOLLOWUP_MAIL,
        )
        interview.no_show_followup_sent_at = timezone.now()
        interview.save(update_fields=["no_show_followup_sent_at"])
    except Exception:
        logger.exception("Failed to send AI interview no-show followup for interview %s", interview.id)

    recipient = getattr(interview.organisation, "company_rep", None)
    if recipient:
        try:
            notify_user(
                recipient,
                "Candidate didn't complete their AI interview",
                f"{_candidate_name(interview)} didn't join their AI interview "
                f"for {job.title} within the window.",
                notification_type=Notification.Type.INTERVIEW,
                link_path=f"recruiter/dashboard/ai-interviews/{interview.id}",
                link_label="View interview",
            )
        except Exception:
            logger.exception("Failed to notify recruiter of AI interview no-show for interview %s", interview.id)


@shared_task(name="send_ai_interview_proceed_invite")
def send_ai_interview_proceed_invite(interview_id):
    """Fired when a recruiter decides ACCEPTED/OVERRIDDEN_PROCEED on an AI
    interview (see ai_interviews.views.RecruiterAIInterviewDecisionView).
    Invites the candidate to pick a human-interview time from the slots the
    recruiter published for this job. The actual guest-vs-authenticated
    branching/sending lives in jobs.tasks.send_interview_slot_invite (shared
    with the manual-stage-move path, see
    jobs.views.JobApplicationRetrieveUpdateView.put) -- this just resolves
    the interview down to its job_application and delegates."""
    from .models import AIInterview

    interview = AIInterview.objects.filter(id=interview_id).first()
    if not interview or not interview.job_application_id:
        return

    from jobs.tasks import send_interview_slot_invite

    send_interview_slot_invite(interview.job_application_id)
