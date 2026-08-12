import logging
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from datetime import timedelta, datetime
from django.utils import timezone
from emails import emails
from notifications.models import Notification
from notifications.utils import notify_user
from .models import Scheduler
from .services import DailyRoomProvisioningError, delete_daily_room, provision_daily_room

User = get_user_model()
logger = logging.getLogger("tasks")


def _log_ai_usage(service_type, company, succeeded, error_message=None):
    """Best-effort AI-call instrumentation for admin analytics, mirroring
    jobs/tasks.py's own _log_ai_usage -- never raises."""
    from analytics.models import AIUsageLog

    try:
        AIUsageLog.objects.create(
            service_type=service_type, company=company, succeeded=succeeded, error_message=error_message,
        )
    except Exception:
        logger.exception("Failed to write AIUsageLog for %s", service_type)

def _candidate_join_url(meeting_instance):
    """The candidate's real, working join link -- the Daily.co room is
    private (see scheduler.services.provision_daily_room), so the bare
    room_url _flatten_meeting falls back to can't actually be entered.
    None for meetings from the older manual-scheduler flow, which never
    mints a candidate_join_token -- callers fall back to room_url there."""
    if not meeting_instance.candidate_join_token:
        return None
    base = str(settings.FRONTEND_URL).rstrip("/")
    return f"{base}/interview/join/{meeting_instance.candidate_join_token}"


def _recruiter_join_url(meeting_instance):
    """The recruiter is always an authenticated dashboard user, so their
    join link is the workspace page itself, not a public token route."""
    base = str(settings.FRONTEND_URL).rstrip("/")
    return f"{base}/recruiter/dashboard/interviews/{meeting_instance.id}/session"


# Reminder tiers fired by jobs.views._claim_interview_slot -- "in 30 minutes"
# used to be hardcoded into the email copy/subject regardless of which tier
# actually fired (there was only ever one), which went stale once the second
# (1-hour) tier was added. Both send_meeting_reminder and
# recruiter_interview_reminder_mail below key off this same map.
REMINDER_TIER_LABELS = {
    "1_hour": "in 1 hour",
    "15_min": "in 15 minutes",
}


def get_meeting_details(meeting_instance):
    """Prepare meeting details for email templates."""
    try:
        details = {
            "title": meeting_instance.title,
            "date": meeting_instance.meeting_date.strftime("%A, %d %B %Y"),
            "start_time": meeting_instance.start_time.strftime("%I:%M %p"),  # Fixed format
            "end_time": meeting_instance.end_time.strftime("%I:%M %p"),  # Fixed format
            "duration": (
                (datetime.combine(meeting_instance.meeting_date, meeting_instance.end_time) -
                datetime.combine(meeting_instance.meeting_date, meeting_instance.start_time)
                ).seconds // 60
            ) if meeting_instance.end_time else None,
            "room_name": meeting_instance.room_name,
            "room_url": meeting_instance.room_url,
            "participants": meeting_instance.no_of_participants,
            "description": meeting_instance.description or "No description provided.",
            "company_name": meeting_instance.company.company_name,
            "company_logo": meeting_instance.company.get_logo_url(),
        }
        return details
    except Exception as e:
        logger.error(f"Error preparing meeting details: {str(e)}")
        raise



@shared_task
def send_meeting_reminder(user_id, company_name, meeting_id, tier=None):
    """Send a meeting reminder to the candidate. user_id may be None for a
    guest (account-less) candidate -- meeting_instance.candidate_email_recipient()
    is used instead in that case (see jobs.views claim_interview_slot).

    `tier` is one of REMINDER_TIER_LABELS's keys ("1_hour"/"15_min") and
    drives the countdown copy/subject -- None (e.g. the older manual-scheduler
    flow, which only ever schedules one reminder) falls back to generic
    "soon" copy in emails.meeting_invite_reminder."""
    logger.info(f"Sending meeting reminder for meeting {meeting_id} to user {user_id}")
    try:
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        user = User.objects.get(id=user_id) if user_id else meeting_instance.candidate_email_recipient()

        # Ensure we are using a valid timezone
        now = timezone.now()
        meeting_time = timezone.make_aware(
            datetime.combine(meeting_instance.meeting_date, meeting_instance.start_time)
        )

        # Check if the meeting is in the future before sending the reminder
        if meeting_time > now and meeting_instance.accepted:
            meeting_details = get_meeting_details(meeting_instance)
            result = emails.meeting_invite_reminder(
                user, company_name, meeting_details,
                join_url=_candidate_join_url(meeting_instance),
                countdown=REMINDER_TIER_LABELS.get(tier),
            )
            logger.info(f"Successfully sent reminder email for meeting {meeting_id}")
            return result
        else:
            logger.warning(f"Skipped reminder: Meeting {meeting_id} is in past or not accepted")
            return None
    except Scheduler.DoesNotExist:
        logger.error(f"Meeting {meeting_id} not found")
        return None
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error sending meeting reminder: {str(e)}")
        raise
    
@shared_task
def meeting_invite_mail(user_id, company_name, meeting_id):
    """send initial meeting invite email for meeting"""
    logger.info(f"Sending meeting invitation for meeting {meeting_id} to user {user_id}")
    try:
        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        meeting_details = get_meeting_details(meeting_instance)
        result = emails.meeting_invite_mail(user, company_name, meeting_details)
        logger.info(f"Successfully sent invitation email for meeting {meeting_id}")
        return result
    except Scheduler.DoesNotExist:
        logger.error(f"Meeting {meeting_id} not found")
        return None
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error sending meeting invitation: {str(e)}")
        raise
    


@shared_task
def meeting_invite_reminder(user_id, company_name, meeting_id):
    """send a follow-up reminder email for meeting"""
    try:
        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        meeting_details = get_meeting_details(meeting_instance)
        return emails.meeting_invite_reminder(user, company_name, meeting_details)
    except (Scheduler.DoesNotExist, User.DoesNotExist):
        return None

@shared_task
def meeting_invite_others(user_id, meeting_id, user_emails=None):
    """send meeting invite email to additional participants"""
    logger.info(f"Sending meeting invitation to additional participants for meeting {meeting_id}")
    try:
        if not user_emails:
            logger.warning("No additional emails provided, skipping")
            return None

        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        meeting_details = get_meeting_details(meeting_instance)
        
        # Validate email list
        email_list = [email.strip() for email in user_emails.split(',') if email.strip()]
        if not email_list:
            logger.warning("No valid emails found in the provided list")
            return None
            
        result = emails.meeting_invite_others(user, user_emails, meeting_details)
        logger.info(f"Successfully sent invitations to additional participants for meeting {meeting_id}")
        return result
    except Scheduler.DoesNotExist:
        logger.error(f"Meeting {meeting_id} not found")
        return None
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error sending invitations to additional participants: {str(e)}")
        raise
    
@shared_task
def candidate_interview_confirmation_mail(user_id, company_name, meeting_id):
    """Confirmation to the candidate once they've picked a slot -- see
    jobs.views claim_interview_slot. user_id may be None for a guest
    (account-less) candidate, resolved via candidate_email_recipient() instead."""
    try:
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        user = User.objects.get(id=user_id) if user_id else meeting_instance.candidate_email_recipient()
        meeting_details = get_meeting_details(meeting_instance)
        return emails.candidate_interview_confirmation_mail(
            user, company_name, meeting_details, join_url=_candidate_join_url(meeting_instance)
        )
    except (Scheduler.DoesNotExist, User.DoesNotExist):
        logger.error(f"candidate_interview_confirmation_mail: meeting {meeting_id} or user {user_id} not found")
        return None
    except Exception:
        logger.exception(f"Error sending candidate interview confirmation for meeting {meeting_id}")


@shared_task
def recruiter_interview_acceptance_mail(user_id, company_name, meeting_id):
    """Send email notification to company when talent accepts interview"""
    logger.info(f"Sending interview acceptance notification for meeting {meeting_id}")
    try:
        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        meeting_details = get_meeting_details(meeting_instance)
        candidate_name = meeting_instance.candidate_full_name or "The candidate"
        result = emails.recruiter_interview_acceptance_mail(
            user, company_name, meeting_details, candidate_name=candidate_name
        )
        logger.info(f"Successfully sent interview acceptance notification for meeting {meeting_id}")
        return result
    except Scheduler.DoesNotExist:
        logger.error(f"Meeting {meeting_id} not found")
        return None
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error sending interview acceptance notification: {str(e)}")
        raise


@shared_task
def recruiter_interview_reminder_mail(user_id, candidate_name, company_name, meeting_id, tier=None):
    """1-hour and 15-minutes-before reminder to the recruiter: email + in-app
    (see REMINDER_TIER_LABELS and jobs.views._claim_interview_slot, which
    fires this task once per tier)."""
    try:
        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
    except (User.DoesNotExist, Scheduler.DoesNotExist):
        logger.error(f"recruiter_interview_reminder_mail: user {user_id} or meeting {meeting_id} not found")
        return None

    if meeting_instance.status == Scheduler.Status.CANCELLED:
        logger.info(f"Skipped recruiter reminder: meeting {meeting_id} is cancelled")
        return None

    countdown = REMINDER_TIER_LABELS.get(tier, "soon")
    meeting_details = get_meeting_details(meeting_instance)
    try:
        emails.recruiter_interview_reminder_mail(
            user, candidate_name, company_name, meeting_details,
            join_url=_recruiter_join_url(meeting_instance),
            countdown=countdown,
        )
    except Exception:
        logger.exception(f"Failed to send recruiter interview reminder email for meeting {meeting_id}")

    try:
        notify_user(
            user,
            title="Interview starting soon",
            message=f"Your interview with {candidate_name} starts {countdown}.",
            notification_type=Notification.Type.INTERVIEW,
            link_path=f"recruiter/dashboard/interviews/{meeting_id}/session",
            link_label="Join interview",
        )
    except Exception:
        logger.exception(f"Failed to create in-app reminder notification for meeting {meeting_id}")


@shared_task(bind=True, max_retries=1)
def retry_room_creation(self, meeting_id):
    """One retry, 5 minutes after an initial provisioning failure (see
    JobInterviewSlotClaimView.post). Not scheduled again on a second
    failure -- surfaces as an ordinary logged error for ops to follow up on,
    matching provision_daily_room's own no-retry-loop design."""
    import secrets

    try:
        meeting = Scheduler.objects.get(id=meeting_id)
    except Scheduler.DoesNotExist:
        logger.error(f"retry_room_creation: meeting {meeting_id} not found")
        return None

    if meeting.room_url or meeting.status == Scheduler.Status.CANCELLED:
        logger.info(f"Skipping room-creation retry for meeting {meeting_id}: already provisioned or cancelled")
        return None

    try:
        room = provision_daily_room(meeting.meeting_date, meeting.start_time, meeting.end_time)
    except DailyRoomProvisioningError as e:
        logger.error(f"Retry of Daily.co provisioning failed for meeting {meeting_id}: {e.detail}")
        return None

    meeting.room_id = room["room_id"]
    meeting.room_name = room["room_name"]
    meeting.room_url = room["room_url"]
    meeting.token = room["token"]
    meeting.status = Scheduler.Status.ROOM_CREATED
    if not meeting.recruiter_join_token:
        meeting.recruiter_join_token = secrets.token_urlsafe(32)
    if not meeting.candidate_join_token:
        meeting.candidate_join_token = secrets.token_urlsafe(32)
    meeting.save(update_fields=[
        "room_id", "room_name", "room_url", "token", "status",
        "recruiter_join_token", "candidate_join_token",
    ])
    logger.info(f"Room-creation retry succeeded for meeting {meeting_id}")

    if meeting.company.company_rep_id:
        try:
            notify_user(
                meeting.company.company_rep,
                title="Interview room ready",
                message=(
                    f"Interview room ready for {meeting.candidate_full_name}. "
                    f"Interview scheduled for {meeting.meeting_date} {meeting.start_time.strftime('%H:%M')}."
                ),
                notification_type=Notification.Type.INTERVIEW,
                link_path="recruiter/dashboard/interviews",
                link_label="View interview",
            )
        except Exception:
            logger.exception(f"Failed to create room-ready notification for meeting {meeting_id}")
    return {"room_url": meeting.room_url}


def _gather_interview_prep_context(meeting):
    """Assembles everything the AI prep-brief prompt needs from the
    database: job details, candidate resume text, this candidate's
    assessment results for this job (if any), and any notes from previous
    interviews with this same candidate at this company."""
    from utils.ai_service import AIService
    from skill_assessment.models import CandidateAssessmentSubmission
    from skill_assessment.serializers import RecruiterSubmissionAnswersSerializer

    job_application = meeting.get_job_application()
    job = job_application.job if job_application else None

    resume_text = ""
    talent = meeting.talent
    if talent and talent.resume:
        try:
            resume_text = AIService.extract_resume_text(talent.resume, talent.resume.name) or ""
        except Exception:
            logger.exception(f"Failed to extract resume text for interview {meeting.id}")

    assessment_score = None
    assessment_results = ""
    if job_application:
        submission = (
            CandidateAssessmentSubmission.objects.filter(
                candidate=talent, skill_assessment__job_application=job_application, is_completed=True,
            )
            .order_by("-completed_at")
            .first()
        )
        if submission:
            assessment_score = submission.total_score
            try:
                sections = RecruiterSubmissionAnswersSerializer(submission).data.get("sections", [])
                lines = []
                for section in sections:
                    lines.append(f"Section: {section.get('name')} ({section.get('type')})")
                    for q in section.get("questions", []):
                        correctness = "correct" if q.get("is_correct") else "incorrect"
                        lines.append(f"  - MCQ: {q.get('question')} -- candidate answered {correctness}")
                    for t in section.get("coding_tasks", []):
                        lines.append(f"  - Coding: {t.get('title')} -- candidate's answer: {(t.get('candidate_answer') or '')[:300]}")
                    for q in section.get("open_ended_questions", []):
                        score = q.get("score")
                        score_note = f"scored {score}/{q.get('max_score')}" if score is not None else "not yet graded"
                        lines.append(f"  - Open-ended: {q.get('question')} -- {score_note}")
                assessment_results = "\n".join(lines)[:4000]
            except Exception:
                logger.exception(f"Failed to build assessment results summary for interview {meeting.id}")

    previous_notes = ""
    if talent:
        from .models import InterviewNote

        past_notes = (
            InterviewNote.objects.filter(
                interview__talent=talent, interview__company=meeting.company,
            )
            .exclude(interview=meeting)
            .exclude(content_plain="")
            .order_by("-last_edited_at")[:3]
        )
        previous_notes = "\n---\n".join(n.content_plain for n in past_notes)

    return {
        "job_title": job.title if job else meeting.title,
        "job_description": job.description if job else "",
        "job_requirement": job.job_requirement if job else "",
        "resume_text": resume_text,
        "assessment_score": assessment_score,
        "assessment_results": assessment_results,
        "previous_notes": previous_notes,
    }


@shared_task
def generate_interview_preparation_task(meeting_id, force=False):
    """Generates (or regenerates, if force=True) the AI interview-prep
    brief for `meeting_id`, saving it onto InterviewPreparation. Never
    raises -- a failure lands as generation_status=FAILED so the prepare
    page can show its documented error state instead of a stuck spinner."""
    from utils.ai_service import AIService
    from .models import InterviewPreparation

    try:
        meeting = Scheduler.objects.get(id=meeting_id)
    except Scheduler.DoesNotExist:
        logger.error(f"generate_interview_preparation_task: meeting {meeting_id} not found")
        return None

    prep, _created = InterviewPreparation.objects.get_or_create(interview=meeting)
    if prep.generation_status == InterviewPreparation.GenerationStatus.READY and not force:
        return prep.id

    prep.generation_status = InterviewPreparation.GenerationStatus.GENERATING
    prep.save(update_fields=["generation_status"])

    try:
        context = _gather_interview_prep_context(meeting)
        result = AIService.generate_interview_preparation(context)
        if not result:
            raise ValueError("AI service returned no result")

        # Sequence numbers/ids come from the model, but was_asked/timestamp
        # never do -- make sure every question starts unasked regardless of
        # what the model produced.
        questions = result.get("questions") or []
        for q in questions:
            q["was_asked"] = False
            q["timestamp"] = None

        prep.candidate_snapshot = result.get("candidate_snapshot") or []
        prep.career_timeline = result.get("career_timeline") or []
        prep.strengths = result.get("strengths") or []
        prep.watch_areas = result.get("watch_areas") or []
        prep.suggested_focus = result.get("suggested_focus") or []
        prep.assessment_highlights = result.get("assessment_highlights") or {}
        prep.competencies = result.get("competencies") or []
        prep.questions = questions
        prep.model_used = result.get("model_used") or ""
        prep.generated_at = timezone.now()
        prep.generation_status = InterviewPreparation.GenerationStatus.READY
        prep.save()
        logger.info(f"Interview prep brief ready for meeting {meeting_id}")
        _log_ai_usage("interview_prep", meeting.company, succeeded=True)
    except Exception as e:
        logger.exception(f"Interview prep brief generation failed for meeting {meeting_id}")
        prep.generation_status = InterviewPreparation.GenerationStatus.FAILED
        prep.save(update_fields=["generation_status"])
        _log_ai_usage("interview_prep", meeting.company, succeeded=False, error_message=str(e))

    return prep.id


@shared_task
def delete_room_after_interview(meeting_id):
    """Runs ~60 minutes after an interview ends (scheduled from wherever
    the interview is marked COMPLETED/ended_at is set)."""
    try:
        meeting = Scheduler.objects.get(id=meeting_id)
    except Scheduler.DoesNotExist:
        logger.error(f"delete_room_after_interview: meeting {meeting_id} not found")
        return None
    if not meeting.room_name:
        return None
    success = delete_daily_room(meeting.room_name)
    logger.info(f"Daily.co room deletion for meeting {meeting_id}: {'succeeded' if success else 'failed'}")
    return success


def _generate_interview_summary(meeting, transcript_raw):
    """Shared by process_interview_pipeline's Step 2 and the review page's
    "regenerate" action -- generates and saves the executive summary,
    strengths/concerns, recommendation, confidence, overall score, and
    action items. Never raises; failures land as generation_status=FAILED."""
    from .models import InterviewCompetencyScore, InterviewNote, InterviewSummary
    from utils.ai_service import AIService

    summary, _ = InterviewSummary.objects.get_or_create(interview=meeting)
    summary.generation_status = InterviewSummary.GenerationStatus.GENERATING
    summary.save(update_fields=["generation_status"])
    try:
        note = InterviewNote.objects.filter(interview=meeting).first()
        scores = InterviewCompetencyScore.objects.filter(interview=meeting)
        competency_scores_text = "\n".join(
            f"- {s.competency_name}: {s.score_raw if s.score_raw is not None else 'not scored'}"
            + (f" ({s.recruiter_notes})" if s.recruiter_notes else "")
            for s in scores
        )

        submission_score = None
        job_application = meeting.get_job_application()
        if job_application and meeting.talent:
            from skill_assessment.models import CandidateAssessmentSubmission

            submission = (
                CandidateAssessmentSubmission.objects.filter(
                    candidate=meeting.talent, skill_assessment__job_application=job_application, is_completed=True,
                )
                .order_by("-completed_at")
                .first()
            )
            submission_score = submission.total_score if submission else None

        result = AIService.generate_interview_summary({
            "job_title": meeting.job_title or meeting.title,
            "transcript": transcript_raw,
            "notes": note.content_plain if note else "",
            "competency_scores": competency_scores_text,
            "assessment_score": submission_score,
        })
        if not result:
            raise ValueError("AI service returned no result")

        summary.executive_summary = result.get("executive_summary") or ""
        summary.strengths = result.get("strengths") or []
        summary.concerns = result.get("concerns") or []
        summary.recommendation = result.get("recommendation") or None
        summary.confidence = result.get("confidence") or None
        summary.overall_score = result.get("overall_score")
        summary.action_items = result.get("action_items") or []
        summary.ai_generated_at = timezone.now()
        summary.generation_status = InterviewSummary.GenerationStatus.READY
        summary.save()
        _log_ai_usage("interview_summary", meeting.company, succeeded=True)
    except Exception as e:
        logger.exception(f"Interview summary generation failed for interview {meeting.id}")
        summary.generation_status = InterviewSummary.GenerationStatus.FAILED
        summary.save(update_fields=["generation_status"])
        _log_ai_usage("interview_summary", meeting.company, succeeded=False, error_message=str(e))
    return summary


@shared_task
def regenerate_interview_summary_task(meeting_id):
    """Triggered from the review page's "Regenerate" button -- always
    re-runs generation using whatever transcript is currently saved,
    regardless of the summary's current generation_status."""
    try:
        meeting = Scheduler.objects.select_related("company", "talent").get(id=meeting_id)
    except Scheduler.DoesNotExist:
        logger.error(f"regenerate_interview_summary_task: meeting {meeting_id} not found")
        return None
    summary = _generate_interview_summary(meeting, meeting.transcript_raw or "")
    return str(summary.id)


@shared_task
def process_interview_pipeline(meeting_id):
    """Runs once, right after EndInterviewView marks an interview COMPLETED:
    compiles the transcript, generates the AI summary + draft candidate
    feedback, and notifies the recruiter. Each step is wrapped in its own
    try/except and sets its own status field -- unlike a Celery chain, one
    step failing (e.g. the AI service being down) doesn't block the others,
    and the review page's generation_status fields let the recruiter see
    exactly what's missing and retry from there."""
    from .models import (
        InterviewCandidateFeedback,
        InterviewCompetencyScore,
        InterviewNote,
        InterviewSummary,
        InterviewTranscriptSegment,
    )
    from utils.ai_service import AIService

    try:
        meeting = Scheduler.objects.select_related("company", "talent").get(id=meeting_id)
    except Scheduler.DoesNotExist:
        logger.error(f"process_interview_pipeline: meeting {meeting_id} not found")
        return None

    candidate_name = meeting.candidate_full_name or "the candidate"

    # Step 1: compile the transcript from live segments.
    meeting.transcription_status = Scheduler.TranscriptionStatus.PROCESSING
    meeting.save(update_fields=["transcription_status"])
    transcript_raw = ""
    try:
        segments = list(InterviewTranscriptSegment.objects.filter(interview=meeting).order_by("start_ms"))
        transcript_raw = "\n".join(f"{s.get_speaker_display()}: {s.text}" for s in segments if s.text)
        transcript_structured = [
            {"speaker": s.speaker, "text": s.text, "start_ms": s.start_ms, "end_ms": s.end_ms}
            for s in segments
        ]
        meeting.transcript_raw = transcript_raw
        meeting.transcript_structured = transcript_structured
        meeting.transcription_status = Scheduler.TranscriptionStatus.READY
        meeting.save(update_fields=["transcript_raw", "transcript_structured", "transcription_status"])
    except Exception:
        logger.exception(f"Transcript compilation failed for interview {meeting_id}")
        meeting.transcription_status = Scheduler.TranscriptionStatus.FAILED
        meeting.save(update_fields=["transcription_status"])

    from .models import CompanyInterviewSettings

    company_settings = (
        CompanyInterviewSettings.objects.filter(company=meeting.company).first() if meeting.company else None
    )
    summary_enabled = not company_settings or company_settings.copilot_post_interview_summary_enabled
    if not summary_enabled:
        logger.info(f"Skipping AI summary/feedback for interview {meeting_id}: disabled in company settings")
        return str(meeting.id)

    # Step 2: AI-generate the executive summary + hiring recommendation.
    summary = _generate_interview_summary(meeting, transcript_raw)

    # Step 3: AI-draft candidate feedback (never sent automatically -- the
    # recruiter reviews/edits it on the review page).
    if meeting.talent:
        feedback, _ = InterviewCandidateFeedback.objects.get_or_create(
            interview=meeting, defaults={"candidate": meeting.talent}
        )
        try:
            result = AIService.generate_candidate_feedback({
                "candidate_name": candidate_name,
                "job_title": meeting.job_title or meeting.title,
                "company_name": meeting.company.company_name if meeting.company else "",
                "transcript": transcript_raw,
                "executive_summary": summary.executive_summary,
                "recommendation": summary.recommendation or "MAYBE",
            })
            if not result:
                raise ValueError("AI service returned no result")
            feedback.content = result.get("content") or ""
            feedback.delivery_status = InterviewCandidateFeedback.DeliveryStatus.DRAFT
            feedback.save(update_fields=["content", "delivery_status"])
            _log_ai_usage("candidate_feedback", meeting.company, succeeded=True)
        except Exception as e:
            logger.exception(f"Candidate feedback draft generation failed for interview {meeting_id}")
            _log_ai_usage("candidate_feedback", meeting.company, succeeded=False, error_message=str(e))

    # Step 4/5: notify the recruiter (email + in-app) that the summary is ready.
    try:
        recruiter = meeting.company.company_rep if meeting.company else None
        if recruiter:
            review_url = f"{settings.FRONTEND_URL.rstrip('/')}/recruiter/dashboard/interviews/{meeting.id}/review"
            emails.interview_summary_ready_mail(recruiter, candidate_name, review_url)
            notify_user(
                recruiter,
                title="Interview summary ready",
                message=f"Your interview summary for {candidate_name} is ready.",
                notification_type=Notification.Type.INTERVIEW,
                link_path=f"recruiter/dashboard/interviews/{meeting.id}/review",
                link_label="View summary",
            )
    except Exception:
        logger.exception(f"Failed to notify recruiter for interview {meeting_id}")

    return str(meeting.id)