"""updated the email sending logic to use the new EmailHandler class
and EmailTypes constants."""

from typing import Literal, Optional, Tuple, Dict, Any, List
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.db import transaction
from django.dispatch import receiver
from skill_assessment.models import CandidateAssessmentSubmission
import logging
from django.templatetags.static import static

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
    "talent_assessment_pass_mail",
    "startup_interview_acceptance_mail",
    "talent_vetting_pass",
    "talent_vetting_fail",
    "ASSESSMENT_PASS",
    "ASSESSMENT_FAILURE",
]

# Optional: map legacy types to your EmailTypes for logging/analytics
EMAIL_TYPE_TO_ENUM = {
    "talent_assessment_pass_mail": EmailTypes.TALENT_ASSESSMENT_PASS_MAIL,
    # add more when you create concrete types for them
    # "user_invite": EmailTypes.USER_INVITE,
    # "otp": EmailTypes.OTP_FOR_EMAIL_VERIFICATION,
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
) -> str:
    """
    Thin shim to the new EmailHandler: DO NOT render here.
    The latest EmailHandler expects (subject, context, template, email_type).
    """
    recipients = recipient_or_recipients
    if isinstance(recipient_or_recipients, str):
        recipients = [recipient_or_recipients]

    handler = EmailHandler(recipients)
    # Map legacy email_type -> new EmailTypes constant when available
    email_type_enum = _email_type_to_enum(email_type) or email_type
    return handler.send_mail(
        subject=subject,
        context=context,
        template=template_file,  # ← pass the template path, not rendered HTML
        email_type=email_type_enum,
        from_email=from_email,
    )


def get_email_template_and_context(
    user, email_type: EmailType, **kwargs
) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Return Django template path (relative to TEMPLATES DIRS) and context.
    """
    # Shortcuts
    T_TALENT = "emails/email_templates"
    T_STARTUP = "emails/email_templates"

    template_file = None
    context: Dict[str, Any] | None = None

    if email_type == "welcome":
        if user.user_type == User.USER_TYPE.TALENT:
            template_file = f"{T_TALENT}/Welcome_Talent.html"
            context = {
                "name": user.first_name,
                "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
            }
        else:
            template_file = f"{T_STARTUP}/Welcome_Startup.html"
            context = {
                "name": user.first_name,
                "TIAAGO_STARTUP_LOGIN_URL": settings.TIAAGO_STARTUP_LOGIN_URL,
            }

    elif email_type == "approval_status":
        if user.user_type == User.USER_TYPE.TALENT:
            template_file = f"{T_TALENT}/Approval_Status_Talent.html"
        else:
            template_file = f"{T_STARTUP}/Approval_Status_Startup.html"
        context = {
            "name": user.first_name,
            "TIAAGO_MAIL_SUPPORT": settings.TIAAGO_MAIL_SUPPORT,
        }

    elif email_type == "admin_approval":
        template_file = f"{T_STARTUP}/Approved.html"
        context = {"name": user.first_name}

    elif email_type == "admin_rejection":
        template_file = f"{T_STARTUP}/Rejection.html"
        context = {"name": user.first_name}

    elif email_type == "unread_message":
        template_file = f"{T_STARTUP}/unread_message.html"
        context = {"name": user.first_name}

    elif email_type == "meeting_invite":
        template_file = f"{T_TALENT}/Talent_Interview_Invite.html"
        context = {
            "name": user.first_name,
            "company_name": kwargs.get("company_name"),
            "meeting" : kwargs.get("meeting_details"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
            "logo_url": f"{settings.BASE_URL}/static/emails/assets/Tiaago_logo.png"
        }

    elif email_type == "meeting_invite_others":
        template_file = f"{T_STARTUP}/Schedule_Meeting_Others.html"
        context = {
            "name": user.first_name,
            "meeting": kwargs.get("meeting_details"),
        }

    elif email_type == "meeting_reminder":
        if user.user_type == User.USER_TYPE.TALENT:
            template_file = f"{T_TALENT}/Schedule_Meeting_Talents.html"
        else:
            template_file = f"{T_STARTUP}/Schedule_Meeting_Startup.html"
        context = {
            "name": user.first_name,
            "company_name": kwargs.get("company_name"),
            "meeting": kwargs.get("meeting_details"),
        }

    elif email_type == "meeting_cancelled_by_company":
        template_file = f"{T_TALENT}/Meeting_Cancelled_By_Company.html"
        context = {
            "name": user.first_name,
            "company_name": kwargs.get("company_name"),
            "meeting_details": kwargs.get("meeting_details"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "meeting_cancelled_by_talent":
        template_file = f"{T_STARTUP}/Meeting_Cancelled_By_Talent.html"
        context = {
            "name": user.first_name,
            "talent_name": kwargs.get("talent_name"),
            "meeting_details": kwargs.get("meeting_details"),
            "TIAAGO_STARTUP_LOGIN_URL": settings.TIAAGO_STARTUP_LOGIN_URL,
        }

    elif email_type == "job_approved_status":
        template_file = f"{T_STARTUP}/Job_Post_Approved.html"
        context = {
            "name": user.first_name,
            "job": kwargs.get("job"),
        }

    elif email_type == "talent_assessment_pass_mail":
        template_file = f"{T_TALENT}/Talent_Assessment_Pass.html"
        context = {
            "name": user.first_name,
            "job_title": kwargs.get("job_title"),
            "company_name": kwargs.get("company_name"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "startup_interview_acceptance_mail":
        template_file = f"{T_STARTUP}/Startup_Interview_Acceptance.html"
        context = {
            "name": user.first_name,
            "company_name": kwargs.get("company_name"),
            "meeting": kwargs.get("meeting_details"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "talent_vetting_pass":
        job = kwargs.get("job")
        template_file = f"{T_TALENT}/Talent_Vetting_Pass.html"
        context = {
            "name": user.first_name,
            "job_title": getattr(job, "title", "") if job else "",
            "company_name": getattr(job.company, "company_name", "") if job and job.company else "",
            "assessment_link": kwargs.get("assessment_link"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "talent_vetting_fail":
        template_file = f"{T_TALENT}/Talent_Vetting_Fail.html"
        areas_for_improvement = kwargs.get("areas_for_improvement")

        feedback_areas: None
        if isinstance(areas_for_improvement, list):
            feedback_areas = areas_for_improvement
        elif isinstance(areas_for_improvement, str):
            feedback_areas = [areas_for_improvement]
        else:
            feedback_areas = []

        job = kwargs.get("job")
        context = {
            "name": user.first_name,
            "job_title": getattr(job, "title", "") if job else "",
            "company_name": getattr(job.company, "company_name", "") if job and job.company else "",
            "assessment_link": kwargs.get("assessment_link"),
            "feedback_areas": feedback_areas,
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    # logo url for all emails
    if context is not None:
        context["logo_url"] = f"{settings.BASE_URL}/static/emails/assets/Tiaago_logo.png"
        context["welcome_image_url"] = f"{settings.BASE_URL}/static/emails/assets/welcome_onboard.jpg"

    return template_file, context


def send_welcome_mail(user):
    template, ctx = get_email_template_and_context(user, "welcome")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Welcome to Tiaago",
        template,
        ctx,
        email_type="welcome",
    )

def approval_status_mail(user):
    template, ctx = get_email_template_and_context(user, "approval_status")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Account Approval Status: Your Application to join Tiaago",
        template,
        ctx,
        email_type="approval_status",
    )


def admin_approved_user_mail(user):
    template, ctx = get_email_template_and_context(user, "admin_approval")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Account Approval Update: Your Tiaago Account",
        template,
        ctx,
        email_type="admin_approval",
    )


def admin_reject_user_mail(user):
    template, ctx = get_email_template_and_context(user, "admin_rejection")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Account Approval Update: Your Tiaago Account",
        template,
        ctx,
        email_type="admin_rejection",
    )


def unread_message_mail(user):
    template, ctx = get_email_template_and_context(user, "unread_message")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Unread Message Notification",
        template,
        ctx,
        email_type="unread_message",
    )


def meeting_invite_mail(user, company_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user, "meeting_invite", company_name=company_name, meeting_details=meeting_details
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Interview Invitation: Action Required",
        template,
        ctx,
        email_type="meeting_invite",
    )

def meeting_invite_reminder(user, company_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user,
        "meeting_reminder",
        company_name=company_name,
        meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Meeting Reminder",
        template,
        ctx,
        email_type="meeting_reminder",
    )


def meeting_invite_others(user, user_emails: Optional[str], meeting_details):
    """
    Comma-separated list of emails → send to each.
    Fixed: the old version returned early and never sent.
    """
    if not user_emails:
        return None
    recipients = [e.strip() for e in user_emails.split(",") if e.strip()]

    template, ctx = get_email_template_and_context(user, "meeting_invite_others", meeting_details=meeting_details)
    if not template or not recipients:
        return None

    return _send_with_latest_flow(
        recipients,
        "Meeting Invite",
        template,
        ctx,
        email_type="meeting_invite_others",
    )


def job_approved_status_for_startup_mail(user, job):
    template, ctx = get_email_template_and_context(user, "job_approved_status", job=job)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Your Job Post Has Been Approved!",
        template,
        ctx,
        email_type="job_approved_status",
    )


def talent_assessment_pass_mail(user):
    template, ctx = get_email_template_and_context(user, "talent_assessment_pass_mail")
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Congratulations! You're Now a Vetted Talent on Tiaago",
        template,
        ctx,
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
        user.email,
        "Interview Invitation Response: Action Taken",
        template,
        ctx,
        email_type="startup_interview_acceptance_mail",
    )


# def applicant_vetting_mail(
#     user,
#     job,
#     status: Literal["consider", "unconsider"],
#     areas_for_improvement=None,
#     assessment_link=None,
# ):
#     if status == "consider":
#         template, ctx = get_email_template_and_context(
#             user, "talent_vetting_pass", job=job, assessment_link=assessment_link
#         )
#         subject = "Update on your job application"
#         etype = "talent_vetting_pass"
#     else:
#         template, ctx = get_email_template_and_context(
#             user,
#             "talent_vetting_fail",
#             job=job,
#             areas_for_improvement=areas_for_improvement,
#         )
#         subject = "Update on your job application"
#         etype = "talent_vetting_fail"

#     if not template:
#         return None
#     return _send_with_latest_flow(
#         user.email,
#         subject,
#         template,
#         ctx,
#         email_type=etype,
#     )
# Job Skill assessment Emails after they have passed the resume screening
def applicant_vetting_mail(
    user,
    job,
    status: Literal["consider", "strongly consider", "unconsider"],
    areas_for_improvement=None,
    assessment_link=None,
):
    """
    Send an email to the applicant for vetting purposes.
    - If status is 'consider' or 'strongly consider', sends an assessment invitation with the assessment link.
    - If status is 'unconsider', sends a rejection email with areas for improvement.
    """
    subject = f"Update on Your Application for {job.title}"
    context = {
        "name": user.get_full_name() or user.email,
        "job_title": job.title,
        "company_name": str(job.company.company_name) if job.company else "",
        "assessment_link": assessment_link,
        "areas_for_improvement": areas_for_improvement,
        "status": status,
        "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
    }
    context["logo_url"] = f"{settings.BASE_URL}/static/emails/assets/Tiaago_logo.png"
    context["dashboard_link"] = settings.TIAAGO_TALENT_LOGIN_URL

    if status in ["consider", "strongly consider"]:
        if not assessment_link:
            raise ValueError("Assessment link is required for 'consider' or 'strongly consider' status")
        template, ctx = get_email_template_and_context(
            user,
            "talent_vetting_pass",
            job=job,
            **context,
        )
        etype = "talent_vetting_pass"

    elif status == "unconsider":
        template, ctx = get_email_template_and_context(
            user,
            "talent_vetting_fail",
            job=job,
            **context,
        )
        etype = "talent_vetting_fail"

    else:
        raise ValueError(f"Invalid status: {status}")

    if not template:
        return None

    logger.warning("vetting mail called")
    return _send_with_latest_flow(
        user.email,
        subject,
        template,
        ctx,
        email_type=etype,
    )



def meeting_cancelled_by_company(user, company_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user,
        "meeting_cancelled_by_company",
        company_name=company_name,
        meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Meeting Cancelled",
        template,
        ctx,
        email_type="meeting_cancelled_by_company",
    )


def meeting_cancelled_by_talent(user, talent_name, meeting_details):
    template, ctx = get_email_template_and_context(
        user,
        "meeting_cancelled_by_talent",
        talent_name=talent_name,
        meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email,
        "Meeting Cancelled",
        template,
        ctx,
        email_type="meeting_cancelled_by_talent",
    )

# Talent Assessment Emails
def send_assessment_pass_via_handler(
    *, to_email, talent_name, total_score, assessment, submission, job_title, company_name,is_tiaago=True
):
    context = {
        "name": talent_name,
        "assessment_title": assessment.title,
        "score": total_score,
        "job_title": job_title,
        "logo_url": f"{settings.BASE_URL}{static('emails/assets/Tiaago_logo.png')}",
        "company_name": company_name or "Tiaago",
        "issued_at": (
            submission.completed_at.date().isoformat()
            if submission.completed_at
            else ""
        ),
        "certificate_id": f"TIAAGO-{submission.id:06d}",
        "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
    }
    logger.info(f"{context}")
    if is_tiaago:
        subject = "🎉 Congratulations! You passed your Tiaago skill assessment"
        template = "emails/email_templates/Assessment_Success.html"
    else:
        subject = f"Congratulations on Passing The Skill Assessment"
        template = "emails/email_templates/Job_Assessment_Success.html"

    handler = EmailHandler(to_email)
    return handler.send_mail(
        subject=subject,
        context=context,
        template=template,
        email_type="ASSESSMENT_PASS",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "Tiaago <support@email.tiaago.com>"),
    )


def send_assessment_failure_via_handler(
    *, to_email, talent_name, total_score, retake_days, retake_link, job_title=None, company_name=None,is_tiaago=True
):
    logger.warning("assessment failure mail called ")
    context = {
        "name": talent_name,
        "score": total_score,
        "job_title": job_title or "",
        "company_name": company_name or "Tiaago",
        "retake_days": retake_days,
        "retake_link": retake_link,
        "logo_url": f"{settings.BASE_URL}{static('emails/assets/Tiaago_logo.png')}",
        "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
    }
    if is_tiaago:
        subject = "Your Tiaago Assessment Results"
        template = "emails/email_templates/Assessment_Failure.html"
    else:
        subject = f"Update on Your Application for {job_title} Role"
        template = "emails/email_templates/Job_Assessment_Failure.html"
    logger.info(f"is_tiaago {is_tiaago}")

    handler = EmailHandler(to_email)
    return handler.send_mail(
        subject=subject,
        context=context,
        template=template,
        email_type="ASSESSMENT_FAILURE",
    )
