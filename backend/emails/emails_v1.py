import os
from typing import Literal
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage
from django.template.loader import get_template

User = get_user_model()

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
]


def send_email(recipient, subject, template_file, context):
    """
    Send an email with the provided template and context to the recipient.
    """
    from django.template.loader import get_template
    import logging

    logger = logging.getLogger(__name__)

    message = get_template(template_file).render(context)
    mail = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[recipient],
        reply_to=[settings.EMAIL_HOST_USER],
    )
    mail.content_subtype = "html"

    try:
        result = mail.send(fail_silently=False)
        logger.warning(f"Email send result to {recipient}: {result}")
        return result
    except Exception as e:
        logger.error(f"Email send failed to {recipient}: {e}", exc_info=True)
        raise


def get_email_template_and_context(user, email_type: EmailType, **kwargs):
    """
    Get the appropriate email template and context based on the user's type and email type.
    """
    if email_type == "welcome":
        if user.user_type == User.USER_TYPE.TALENT:
            template_file = os.path.join(
                settings.BASE_DIR, "emails", "email_templates", "Welcome_Talent.html"
            )
            context = {
                "name": user.first_name,
                "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
            }
        else:
            template_file = os.path.join(
                settings.BASE_DIR, "emails", "email_templates", "Welcome_Startup.html"
            )
        context = {
            "name": user.first_name,
            "TIAAGO_STARTUP_LOGIN_URL": settings.TIAAGO_STARTUP_LOGIN_URL,
        }

    elif email_type == "approval_status":
        if user.user_type == User.USER_TYPE.TALENT:
            template_file = os.path.join(
                settings.BASE_DIR,
                "emails",
                "email_templates",
                "Approval_Status_Talent.html",
            )
            context = {
                "name": user.first_name,
                "TIAAGO_MAIL_SUPPORT": settings.TIAAGO_MAIL_SUPPORT,
            }
        else:
            template_file = os.path.join(
                settings.BASE_DIR,
                "emails",
                "email_templates",
                "Approval_Status_Startup.html",
            )
            context = {
                "name": user.first_name,
                "TIAAGO_MAIL_SUPPORT": settings.TIAAGO_MAIL_SUPPORT,
            }

    elif email_type == "admin_approval":
        template_file = os.path.join(
            settings.BASE_DIR, "emails", "email_templates", "Approved.html"
        )
        context = {"name": user.first_name}

    elif email_type == "admin_rejection":
        template_file = os.path.join(
            settings.BASE_DIR, "emails", "email_templates", "Rejection.html"
        )
        context = {"name": user.first_name}

    elif email_type == "unread_message":
        template_file = os.path.join(
            settings.BASE_DIR, "emails", "email_templates", "unread_message.html"
        )
        context = {"name": user.first_name}

    elif email_type == "meeting_invite":
        template_file = os.path.join(
            settings.BASE_DIR,
            "emails",
            "email_templates",
            "Talent_Interview_Invite.html",
        )
        context = {
            "name": user.first_name,
            "company_name": kwargs.get("company_name"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "meeting_invite_others":
        template_file = os.path.join(
            settings.BASE_DIR,
            "emails",
            "email_templates",
            "Schedule_Meeting_Others.html",
        )
        context = {"name": user.first_name}

    elif email_type == "meeting_reminder":
        if user.user_type == User.USER_TYPE.TALENT:
            template_file = os.path.join(
                settings.BASE_DIR,
                "emails",
                "email_templates",
                "Schedule_Meeting_Talents.html",
            )
            context = {
                "name": user.first_name,
                "company_name": kwargs.get("company_name"),
                "meeting_instance": kwargs.get("meeting_instance"),
            }
        else:
            template_file = os.path.join(
                settings.BASE_DIR,
                "emails",
                "email_templates",
                "Schedule_Meeting_Startup.html",
            )
            context = {
                "name": user.first_name,
                "company_name": kwargs.get("company_name"),
                "meeting_instance": kwargs.get("meeting_instance"),
            }

    elif email_type == "meeting_cancelled_by_company":
        template_file = os.path.join(
            settings.BASE_DIR,
            "emails",
            "email_templates",
            "Meeting_Cancelled_By_Company.html",
        )
        context = {
            "name": user.first_name,
            "company_name": kwargs.get("company_name"),
            "meeting_details": kwargs.get("meeting_details"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "meeting_cancelled_by_talent":
        template_file = os.path.join(
            settings.BASE_DIR,
            "emails",
            "email_templates",
            "Meeting_Cancelled_By_Talent.html",
        )
        context = {
            "name": user.first_name,
            "talent_name": kwargs.get("talent_name"),
            "meeting_details": kwargs.get("meeting_details"),
            "TIAAGO_STARTUP_LOGIN_URL": settings.TIAAGO_STARTUP_LOGIN_URL,
        }

    elif email_type == "job_approved_status":
        template_file = os.path.join(
            settings.BASE_DIR, "emails", "email_templates", "Job_Post_Approved.html"
        )
        context = {"name": user.first_name, "job": kwargs.get("job")}

    elif email_type == "talent_assessment_pass_mail":
        template_file = os.path.join(
            settings.BASE_DIR,
            "emails",
            "email_templates",
            "Talent_Assessment_Pass.html",
        )
        context = {
            "name": user.first_name,
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "startup_interview_acceptance_mail":
        template_file = os.path.join(
            settings.BASE_DIR,
            "emails",
            "email_templates",
            "Startup_Interview_Acceptance.html",
        )
        context = {
            "name": user.first_name,
            "company_name": kwargs.get("company_name"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "talent_vetting_pass":
        template_file = os.path.join(
            settings.BASE_DIR, "emails", "email_templates", "Talent_Vetting_Pass.html"
        )
        job = kwargs.get("job")
        job_title = job.title if job else ""
        context = {
            "name": user.first_name,
            "job_title": job_title,
            "assessment_link": kwargs.get("assessment_link"),
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "talent_vetting_fail":
        template_file = os.path.join(
            settings.BASE_DIR, "emails", "email_templates", "Talent_Vetting_Fail.html"
        )
        areas_for_improvement = kwargs.get("areas_for_improvement")
        if isinstance(areas_for_improvement, list):
            areas_for_improvement = (
                areas_for_improvement[0] if areas_for_improvement else ""
            )
        elif not isinstance(areas_for_improvement, str):
            areas_for_improvement = ""
        job = kwargs.get("job")
        job_title = job.title if job else ""
        context = {
            "name": user.first_name,
            "job_title": job_title,
            "assessment_link": kwargs.get("assessment_link"),
            "areas_for_improvement": areas_for_improvement,
            "TIAAGO_TALENT_LOGIN_URL": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    else:
        template_file, context = None, None

    return template_file, context


def send_welcome_mail(user):
    """
    Send a welcome message to a registered user.
    """
    email_file, context = get_email_template_and_context(user, "welcome")
    if not email_file:
        return None

    return send_email(user.email, "Welcome", email_file, context)


def approval_status_mail(user):
    """
    Send an approval status update.
    """
    email_file, context = get_email_template_and_context(user, "approval_status")
    if not email_file:
        return None

    return send_email(
        user.email,
        "Account Approval Status: Your Application to join Tiaago",
        email_file,
        context,
    )


def admin_approved_user_mail(user):
    """
    Send an approval message to a registered user by the admin.
    """
    email_file, context = get_email_template_and_context(user, "admin_approval")
    if not email_file:
        return None

    return send_email(
        user.email, "Account Approval Update: Your Tiaago Account", email_file, context
    )


def admin_reject_user_mail(user):
    """
    Send a rejection message to a registered user by the admin.
    """
    email_file, context = get_email_template_and_context(user, "admin_rejection")
    if not email_file:
        return None

    return send_email(
        user.email, "Account Approval Update: Your Tiaago Account", email_file, context
    )


def unread_message_mail(user):
    """
    Send an unread message notification.
    """
    email_file, context = get_email_template_and_context(user, "unread_message")
    if not email_file:
        return None

    return send_email(user.email, "Unread Message Notification", email_file, context)


def meeting_invite_mail(user, company_name):
    """
    Send a meeting invite to a talent user.
    """
    email_file, context = get_email_template_and_context(
        user,
        "meeting_invite",
        company_name=company_name,
    )
    if not email_file:
        return None

    return send_email(
        user.email, "Interview Invitation: Action Required", email_file, context
    )


def meeting_invite_reminder(user, company_name, meeting_instance):
    """
    Send a meeting reminder email.
    """
    email_file, context = get_email_template_and_context(
        user,
        "meeting_reminder",
        company_name=company_name,
        meeting_instance=meeting_instance,
    )
    if not email_file:
        return None

    return send_email(user.email, "Meeting Reminder", email_file, context)


def meeting_invite_others(user, user_emails=None):
    """
    Send a meeting invite to other users
    """
    if user_emails is None:
        return
    user_emails = user_emails.split(",")
    if len(user_emails) >= 1:
        return
    email_file, context = get_email_template_and_context(user, "meeting_invite_others")
    if not email_file:
        return

    for email in user_emails:
        return send_email(email, "Meeting Invite", email_file, context)


def job_approved_status_for_startup_mail(user, job):
    """
    Notify a startup user of the approval status of their job post.
    """
    email_file, context = get_email_template_and_context(
        user, "job_approved_status", job=job
    )
    if not email_file:
        return None

    return send_email(
        user.email, "Your Job Post Has Been Approved!", email_file, context
    )


def talent_assessment_pass_mail(user):

    email_file, context = get_email_template_and_context(
        user,
        "talent_assessment_pass_mail",
    )
    if not email_file:
        return None

    return send_email(
        user.email,
        "Congratulations! You're Now a Vetted Talent on Tiaago",
        email_file,
        context,
    )


def startup_interview_acceptance_mail(user, company_name):
    email_file, context = get_email_template_and_context(
        user, "startup_interview_acceptance_mail", company_name=company_name
    )

    if not email_file:
        return None

    return send_email(
        user.email, "Interview Invitation Response: Action Taken", email_file, context
    )


def applicant_vetting_mail(
    user,
    job,
    status: Literal["consider", "unconsider"],
    areas_for_improvement=None,
    assessment_link=None,
):
    """
    Notify a talent of their approval status after vetting (with AI).
    """
    if status == "consider":
        email_file, context = get_email_template_and_context(
            user, "talent_vetting_pass", job=job, assessment_link=assessment_link
        )
    else:
        email_file, context = get_email_template_and_context(
            user,
            "talent_vetting_fail",
            job=job,
            areas_for_improvement=areas_for_improvement,
        )
    if not email_file:
        return None

    return send_email(user.email, "Update on your job application", email_file, context)


def meeting_cancelled_by_company(user, company_name, meeting_details):
    """
    Notify a talent that a meeting was cancelled by the company.
    """
    email_file, context = get_email_template_and_context(
        user,
        "meeting_cancelled_by_company",
        company_name=company_name,
        meeting_details=meeting_details,
    )
    if not email_file:
        return None

    return send_email(user.email, "Meeting Cancelled", email_file, context)


def meeting_cancelled_by_talent(user, talent_name, meeting_details):
    """
    Notify a company that a meeting was cancelled by the talent.
    """
    email_file, context = get_email_template_and_context(
        user,
        "meeting_cancelled_by_talent",
        talent_name=talent_name,
        meeting_details=meeting_details,
    )
    if not email_file:
        return None

    return send_email(user.email, "Meeting Cancelled", email_file, context)
