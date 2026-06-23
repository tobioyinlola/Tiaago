"""Email dispatch: maps email types to templates, builds context, sends via EmailHandler."""

from typing import Literal, Optional, Tuple, Dict, Any, List
from django.conf import settings
from django.contrib.auth import get_user_model
import logging

from utils.email_handler import EmailHandler, EmailTypes

User = get_user_model()

logger = logging.getLogger(__name__)

EmailType = Literal[
    "welcome",
    "approval_status",
    "admin_approval",
    "admin_rejection",
    "unread_message",
    "meeting_invite",
    "meeting_invite_others",
    "meeting_reminder",
    "meeting_cancelled_by_company",
    "meeting_cancelled_by_talent",
    "job_approved_status",
    "job_deactivated",
    "job_reactivated",
    "talent_assessment_pass_mail",
    "startup_interview_acceptance_mail",
    "talent_vetting_pass",
    "talent_vetting_fail",
    "ASSESSMENT_PASS",
    "ASSESSMENT_FAILURE",
]

EMAIL_TYPE_TO_ENUM = {
    "talent_assessment_pass_mail": EmailTypes.TALENT_ASSESSMENT_PASS_MAIL,
}


def _email_type_to_enum(email_type: Optional[str]) -> Optional[str]:
    return EMAIL_TYPE_TO_ENUM.get(email_type or "")


def _send_with_latest_flow(
    recipient_or_recipients: str | List[str],
    subject: str,
    template_file: str,
    context: Dict[str, Any],
    email_type: Optional[str] = None,
    from_email: str = "Tiaago <support@email.tiaago.com>",
    security: bool = False,
) -> str:
    """Thin shim to EmailHandler."""
    recipients = recipient_or_recipients
    if isinstance(recipient_or_recipients, str):
        recipients = [recipient_or_recipients]

    handler = EmailHandler(recipients)
    email_type_enum = _email_type_to_enum(email_type) or email_type
    return handler.send_mail(
        subject=subject,
        context=context,
        template=template_file,
        email_type=email_type_enum,
        from_email=from_email,
        security=security,
    )


def _flatten_meeting(meeting_details, company_name=None):
    """Convert meeting_details dict to flat context vars for new templates."""
    if not meeting_details:
        return {}
    md = meeting_details
    when = f"{md.get('date', '')} · {md.get('start_time', '')}"
    duration_mins = md.get("duration")
    fmt = f"Live AI interview · {duration_mins} min" if duration_mins else "Live AI interview"
    return {
        "meeting_title": md.get("title", ""),
        "when": when,
        "format": fmt,
        "join_url": md.get("room_url", ""),
        "interview_url": md.get("room_url", ""),
        "company": company_name or md.get("company_name", ""),
        "company_name": company_name or md.get("company_name", ""),
        "location": "Virtual" if md.get("room_url") else "",
    }


def get_email_template_and_context(
    user, email_type: EmailType, **kwargs
) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """Return Django template path and context dict for the given email type."""
    template_file = None
    context: Dict[str, Any] | None = None

    if email_type == "welcome":
        if user.user_type == User.USER_TYPE.TALENT:
            template_file = "emails/welcome.html"
            context = {
                "first_name": user.first_name,
                "profile_url": settings.TIAAGO_TALENT_LOGIN_URL,
            }
        else:
            template_file = "emails/welcome_recruiter.html"
            context = {
                "first_name": user.first_name,
                "login_url": settings.TIAAGO_STARTUP_LOGIN_URL,
            }

    elif email_type == "approval_status":
        template_file = "emails/approval_status.html"
        context = {
            "first_name": user.first_name,
            "support_email": settings.TIAAGO_MAIL_SUPPORT,
            "profile_url": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "admin_approval":
        template_file = "emails/account_approved.html"
        login_url = (
            settings.TIAAGO_TALENT_LOGIN_URL
            if user.user_type == User.USER_TYPE.TALENT
            else settings.TIAAGO_STARTUP_LOGIN_URL
        )
        context = {"first_name": user.first_name, "login_url": login_url}

    elif email_type == "admin_rejection":
        template_file = "emails/account_rejected.html"
        context = {
            "first_name": user.first_name,
            "support_email": settings.TIAAGO_MAIL_SUPPORT,
        }

    elif email_type == "unread_message":
        template_file = "emails/unread_message.html"
        inbox_url = (
            settings.TIAAGO_TALENT_LOGIN_URL
            if user.user_type == User.USER_TYPE.TALENT
            else settings.TIAAGO_STARTUP_LOGIN_URL
        )
        context = {"first_name": user.first_name, "inbox_url": inbox_url}

    elif email_type == "meeting_invite":
        meeting_ctx = _flatten_meeting(
            kwargs.get("meeting_details"), kwargs.get("company_name")
        )
        template_file = "emails/interview_invite.html"
        context = {
            "first_name": user.first_name,
            **meeting_ctx,
        }

    elif email_type == "meeting_invite_others":
        meeting_ctx = _flatten_meeting(kwargs.get("meeting_details"))
        template_file = "emails/meeting_invite_others.html"
        context = {
            "first_name": user.first_name,
            "organizer": user.get_full_name(),
            **meeting_ctx,
        }

    elif email_type == "meeting_reminder":
        meeting_ctx = _flatten_meeting(
            kwargs.get("meeting_details"), kwargs.get("company_name")
        )
        template_file = "emails/interview_reminder.html"
        context = {
            "first_name": user.first_name,
            "countdown": "soon",
            **meeting_ctx,
        }

    elif email_type == "meeting_cancelled_by_company":
        md = kwargs.get("meeting_details") or {}
        meeting_ctx = _flatten_meeting(md, kwargs.get("company_name"))
        template_file = "emails/meeting_cancelled.html"
        context = {
            "first_name": user.first_name,
            "role": md.get("title", ""),
            "dashboard_url": settings.TIAAGO_TALENT_LOGIN_URL,
            **meeting_ctx,
        }

    elif email_type == "meeting_cancelled_by_talent":
        md = kwargs.get("meeting_details") or {}
        meeting_ctx = _flatten_meeting(md)
        template_file = "emails/meeting_cancelled_by_talent.html"
        context = {
            "talent_name": kwargs.get("talent_name", ""),
            "role": md.get("title", ""),
            "pipeline_url": settings.TIAAGO_STARTUP_LOGIN_URL,
            **meeting_ctx,
        }

    elif email_type == "job_approved_status":
        job = kwargs.get("job")
        template_file = "emails/job_post_approved.html"
        context = {
            "first_name": user.first_name,
            "job_title": getattr(job, "title", "") if job else "",
            "dashboard_url": settings.TIAAGO_STARTUP_LOGIN_URL,
        }

    elif email_type == "job_deactivated":
        job = kwargs.get("job")
        template_file = "emails/job_deactivated.html"
        context = {
            "first_name": user.first_name,
            "job_title": getattr(job, "title", "") if job else "",
        }

    elif email_type == "job_reactivated":
        job = kwargs.get("job")
        template_file = "emails/job_reactivated.html"
        context = {
            "first_name": user.first_name,
            "job_title": getattr(job, "title", "") if job else "",
            "dashboard_url": f"{settings.FRONTEND_BASE_URL}/startups/dashboard/jobs/jobs-posted",
        }

    elif email_type == "talent_assessment_pass_mail":
        template_file = "emails/profile_approved.html"
        context = {
            "first_name": user.first_name,
            "profile_url": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "startup_interview_acceptance_mail":
        md = kwargs.get("meeting_details") or {}
        meeting_ctx = _flatten_meeting(md, kwargs.get("company_name"))
        template_file = "emails/interview_accepted.html"
        context = {
            "candidate_name": user.get_full_name(),
            "role": md.get("title", ""),
            "pipeline_url": settings.TIAAGO_STARTUP_LOGIN_URL,
            **meeting_ctx,
        }

    elif email_type == "talent_vetting_pass":
        job = kwargs.get("job")
        template_file = "emails/assessment_invitation.html"
        context = {
            "first_name": user.first_name,
            "company": getattr(job.company, "company_name", "") if job and job.company else "",
            "skill": getattr(job, "title", "") if job else "",
            "assessment_url": kwargs.get("assessment_link", ""),
        }

    elif email_type == "talent_vetting_fail":
        job = kwargs.get("job")
        areas_for_improvement = kwargs.get("areas_for_improvement")

        if isinstance(areas_for_improvement, list):
            feedback_areas = areas_for_improvement
        elif isinstance(areas_for_improvement, str):
            feedback_areas = [areas_for_improvement]
        else:
            feedback_areas = []

        template_file = "emails/vetting_fail.html"
        context = {
            "first_name": user.first_name,
            "job_title": getattr(job, "title", "") if job else "",
            "company_name": getattr(job.company, "company_name", "") if job and job.company else "",
            "feedback_areas": feedback_areas,
            "jobs_url": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    return template_file, context


# ── Wrapper functions (preserve existing public API) ─────────────────────

def send_welcome_mail(user):
    template, ctx = get_email_template_and_context(user, "welcome")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Welcome to Tiaago", template, ctx, email_type="welcome",
    )

def approval_status_mail(user):
    template, ctx = get_email_template_and_context(user, "approval_status")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Your profile is under review", template, ctx,
        email_type="approval_status",
    )


def admin_approved_user_mail(user):
    template, ctx = get_email_template_and_context(user, "admin_approval")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Your Tiaago account is approved", template, ctx,
        email_type="admin_approval",
    )


def admin_reject_user_mail(user):
    template, ctx = get_email_template_and_context(user, "admin_rejection")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "An update on your Tiaago account", template, ctx,
        email_type="admin_rejection",
    )


def unread_message_mail(user):
    template, ctx = get_email_template_and_context(user, "unread_message")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "You have unread messages", template, ctx,
        email_type="unread_message",
    )


def meeting_invite_mail(user, company_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user, "meeting_invite", company_name=company_name, meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "You have an interview", template, ctx,
        email_type="meeting_invite",
    )

def meeting_invite_reminder(user, company_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user, "meeting_reminder", company_name=company_name,
        meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Your interview starts soon", template, ctx,
        email_type="meeting_reminder",
    )


def meeting_invite_others(user, user_emails: Optional[str], meeting_details):
    """Send meeting invite to comma-separated list of additional emails."""
    if not user_emails:
        return None
    recipients = [e.strip() for e in user_emails.split(",") if e.strip()]

    template, ctx = get_email_template_and_context(
        user, "meeting_invite_others", meeting_details=meeting_details,
    )
    if not template or not recipients:
        return None

    return _send_with_latest_flow(
        recipients, "Meeting invitation", template, ctx,
        email_type="meeting_invite_others",
    )


def job_approved_status_for_startup_mail(user, job):
    template, ctx = get_email_template_and_context(user, "job_approved_status", job=job)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Your job post is live", template, ctx,
        email_type="job_approved_status",
    )


def job_deactivated_mail(user, job):
    template, ctx = get_email_template_and_context(user, "job_deactivated", job=job)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, f"Job listing deactivated: {job.title}", template, ctx,
        email_type="job_deactivated",
    )


def job_reactivated_mail(user, job):
    template, ctx = get_email_template_and_context(user, "job_reactivated", job=job)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, f"Your job is back: {job.title}", template, ctx,
        email_type="job_reactivated",
    )


def talent_assessment_pass_mail(user):
    template, ctx = get_email_template_and_context(user, "talent_assessment_pass_mail")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Your profile is verified", template, ctx,
        email_type="talent_assessment_pass_mail",
    )


def startup_interview_acceptance_mail(user, company_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user, "startup_interview_acceptance_mail", company_name=company_name,
        meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Interview accepted", template, ctx,
        email_type="startup_interview_acceptance_mail",
    )


def applicant_vetting_mail(
    user,
    job,
    status: Literal["consider", "strongly consider", "unconsider"],
    areas_for_improvement=None,
    assessment_link=None,
):
    """Send vetting result email after resume screening.

    - consider / strongly consider → assessment invitation with link
    - unconsider → rejection with feedback areas
    """
    subject = f"Update on Your Application for {job.title}"

    if status in ["consider", "strongly consider"]:
        if not assessment_link:
            raise ValueError("Assessment link is required for 'consider' or 'strongly consider' status")
        template, ctx = get_email_template_and_context(
            user, "talent_vetting_pass", job=job, assessment_link=assessment_link,
        )
        etype = "talent_vetting_pass"
    elif status == "unconsider":
        template, ctx = get_email_template_and_context(
            user, "talent_vetting_fail", job=job,
            areas_for_improvement=areas_for_improvement,
        )
        etype = "talent_vetting_fail"
    else:
        raise ValueError(f"Invalid status: {status}")

    if not template:
        return None

    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type=etype,
    )


def meeting_cancelled_by_company(user, company_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user, "meeting_cancelled_by_company",
        company_name=company_name, meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Meeting cancelled", template, ctx,
        email_type="meeting_cancelled_by_company",
    )


def meeting_cancelled_by_talent(user, talent_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user, "meeting_cancelled_by_talent",
        talent_name=talent_name, meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Meeting cancelled by candidate", template, ctx,
        email_type="meeting_cancelled_by_talent",
    )


# ── Assessment result emails (called directly with EmailHandler) ─────────

def send_assessment_pass_via_handler(
    *, to_email, talent_name, total_score, assessment, submission, job_title, company_name, is_tiaago=True
):
    context = {
        "first_name": talent_name,
        "skill": assessment.title,
        "score": f"{total_score}%",
        "results_url": settings.TIAAGO_TALENT_LOGIN_URL,
        "company_name": company_name or "Tiaago",
    }
    subject = (
        "Congratulations! You passed your Tiaago skill assessment"
        if is_tiaago
        else "Congratulations on passing the skill assessment"
    )
    template = "emails/assessment_result.html"

    handler = EmailHandler(to_email)
    return handler.send_mail(
        subject=subject,
        context=context,
        template=template,
        email_type="ASSESSMENT_PASS",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "Tiaago <support@email.tiaago.com>"),
    )


def send_assessment_failure_via_handler(
    *, to_email, talent_name, total_score, retake_days, retake_link, job_title=None, company_name=None, is_tiaago=True
):
    context = {
        "first_name": talent_name,
        "score": f"{total_score}%",
        "job_title": job_title or "",
        "company_name": company_name or "Tiaago",
        "retake_days": retake_days,
        "retake_url": retake_link,
    }
    subject = (
        "Your Tiaago assessment results"
        if is_tiaago
        else f"Update on your application for {job_title} role"
    )
    template = "emails/assessment_fail.html"

    handler = EmailHandler(to_email)
    return handler.send_mail(
        subject=subject,
        context=context,
        template=template,
        email_type="ASSESSMENT_FAILURE",
    )
