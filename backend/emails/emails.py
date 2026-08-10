"""Email dispatch: maps email types to templates, builds context, sends via EmailHandler."""

from typing import Literal, Optional, Tuple, Dict, Any, List
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
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
    "recruiter_interview_acceptance_mail",
    "recruiter_interview_reminder_mail",
    "talent_vetting_pass",
    "talent_vetting_fail",
    "application_received",
    "ASSESSMENT_PASS",
    "ASSESSMENT_FAILURE",
    "ticket_received",
    "ticket_admin_replied",
    "ticket_resolved",
    "assessment_submitted",
    "assessment_completed_recruiter_notice",
    "low_balance_alert",
    "free_tier_exhausted",
    "wallet_topup_confirmed",
    "wallet_topup_failed",
    "interview_candidate_feedback_mail",
    "interview_summary_ready_mail",
    "public_contact_received",
    "public_contact_admin_replied",
    "jobs_paused_for_billing",
    "jobs_reactivated_after_topup",
]

EMAIL_TYPE_TO_ENUM = {
    "talent_assessment_pass_mail": EmailTypes.TALENT_ASSESSMENT_PASS_MAIL,
    "assessment_submitted": EmailTypes.ASSESSMENT_SUBMITTED,
    "assessment_completed_recruiter_notice": EmailTypes.ASSESSMENT_COMPLETED_RECRUITER_NOTICE,
    "low_balance_alert": EmailTypes.LOW_BALANCE_ALERT,
    "free_tier_exhausted": EmailTypes.FREE_TIER_EXHAUSTED,
    "wallet_topup_confirmed": EmailTypes.WALLET_TOPUP_CONFIRMED,
    "wallet_topup_failed": EmailTypes.WALLET_TOPUP_FAILED,
    "jobs_paused_for_billing": EmailTypes.JOBS_PAUSED_FOR_BILLING,
    "jobs_reactivated_after_topup": EmailTypes.JOBS_REACTIVATED_AFTER_TOPUP,
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


def _format_deadline(dt):
    """"Friday 18 July 2026 at 11:59 PM" -- converted to the project's
    default timezone (Africa/Lagos, primary market is Nigeria) since no
    per-candidate timezone is tracked anywhere today."""
    if not dt:
        return None
    return timezone.localtime(dt).strftime("%A %-d %B %Y at %-I:%M %p")


def _format_money(amount, currency):
    """"$0.03" / "₦40.00" -- 2 decimal places, matching the frontend's
    formatPrice() convention (app/common/utils/index.ts)."""
    if amount is None:
        return None
    symbol = "₦" if (currency or "").upper() == "NGN" else "$"
    return f"{symbol}{amount:,.2f}"


def _flatten_meeting(meeting_details, company_name=None):
    """Convert meeting_details dict to flat context vars for new templates."""
    if not meeting_details:
        return {}
    md = meeting_details
    when = f"{md.get('date', '')} · {md.get('start_time', '')}"
    duration_mins = md.get("duration")
    # This is the human/Interview-Copilot meeting flow, not the separate
    # ai_interviews app -- "Live AI interview" here mislabeled every human
    # interview and reads as a real bug now that a genuine AI-conducted
    # interview also exists in the product.
    fmt = f"Live interview · {duration_mins} min" if duration_mins else "Live interview"
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
        # The Daily.co room is private -- the bare room_url _flatten_meeting
        # falls back to can't actually be joined without a token. Callers on
        # the token-based join flow (see jobs.views._claim_interview_slot)
        # pass the real app join_url explicitly; older/manual-scheduler
        # meetings without a candidate_join_token keep the room_url fallback.
        if kwargs.get("join_url"):
            context["join_url"] = kwargs["join_url"]

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
            "dashboard_url": f"{settings.FRONTEND_BASE_URL}/recruiter/dashboard/jobs/jobs-posted",
        }

    elif email_type == "talent_assessment_pass_mail":
        template_file = "emails/profile_approved.html"
        context = {
            "first_name": user.first_name,
            "profile_url": settings.TIAAGO_TALENT_LOGIN_URL,
        }

    elif email_type == "candidate_interview_confirmation_mail":
        # Reuses interview_invite.html (which now only shows When/Format if
        # actually provided, see _flatten_meeting) -- there was previously no
        # candidate-facing confirmation at all once they picked a slot.
        md = kwargs.get("meeting_details") or {}
        meeting_ctx = _flatten_meeting(md, kwargs.get("company_name"))
        template_file = "emails/interview_invite.html"
        context = {
            "first_name": user.first_name,
            "role": md.get("title", ""),
            **meeting_ctx,
        }

    elif email_type == "recruiter_interview_acceptance_mail":
        md = kwargs.get("meeting_details") or {}
        meeting_ctx = _flatten_meeting(md, kwargs.get("company_name"))
        template_file = "emails/interview_accepted.html"
        context = {
            # `user` here is the recruiter being emailed, not the candidate --
            # callers now pass the real candidate_name explicitly; falling
            # back to user.get_full_name() only if a caller doesn't (matches
            # the old, buggy behavior rather than showing a blank name).
            "candidate_name": kwargs.get("candidate_name") or user.get_full_name(),
            "role": md.get("title", ""),
            "pipeline_url": settings.TIAAGO_STARTUP_LOGIN_URL,
            **meeting_ctx,
        }

    elif email_type == "recruiter_interview_reminder_mail":
        md = kwargs.get("meeting_details") or {}
        meeting_ctx = _flatten_meeting(md, kwargs.get("company_name"))
        template_file = "emails/interview_reminder_recruiter.html"
        context = {
            "candidate_name": kwargs.get("candidate_name") or "the candidate",
            "role": md.get("title", ""),
            "countdown": kwargs.get("countdown", "in 30 minutes"),
            **meeting_ctx,
        }
        # See the matching comment in "meeting_reminder" above -- the
        # recruiter's join link is the authenticated dashboard workspace,
        # not the raw (private, token-gated) Daily.co room_url.
        if kwargs.get("join_url"):
            context["join_url"] = kwargs["join_url"]

    elif email_type == "interview_candidate_feedback_mail":
        template_file = "emails/interview_candidate_feedback.html"
        context = {
            "first_name": user.first_name,
            "job_title": kwargs.get("job_title", ""),
            "company_name": kwargs.get("company_name", ""),
            "feedback_content": kwargs.get("feedback_content", ""),
        }

    elif email_type == "interview_summary_ready_mail":
        template_file = "emails/interview_summary_ready.html"
        context = {
            "first_name": user.first_name,
            "candidate_name": kwargs.get("candidate_name", ""),
            "review_url": kwargs.get("review_url", ""),
        }

    elif email_type == "talent_vetting_pass":
        job = kwargs.get("job")
        duration_minutes = kwargs.get("duration_minutes")
        deadline = kwargs.get("deadline")
        template_file = "emails/assessment_invitation.html"
        context = {
            "first_name": user.first_name,
            "company": getattr(job.company, "company_name", "") if job and job.company else "",
            "skill": getattr(job, "title", "") if job else "",
            "assessment_url": kwargs.get("assessment_link", ""),
            "duration": f"{duration_minutes} minutes" if duration_minutes else None,
            "deadline": _format_deadline(deadline),
            "assessment_format": (
                "MCQ with live coding" if kwargs.get("has_coding_task") else "Multiple choice assessment"
            ),
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

    elif email_type == "application_received":
        job = kwargs.get("job")
        if job:
            template_file = "emails/application_received.html"
            context = {
                "first_name": user.first_name,
                "role": getattr(job, "title", ""),
                "company": getattr(job.company, "company_name", "") if job.company else "",
                "submitted": timezone.now().strftime("%b %-d, %Y"),
            }

    elif email_type == "ticket_received":
        ticket = kwargs.get("ticket")
        if ticket:
            template_file = "emails/ticket_received.html"
            context = {
                "first_name": user.first_name,
                "ticket_number": getattr(ticket, "display_number", ""),
                "title": getattr(ticket, "title", ""),
                "category": ticket.get_category_display() if hasattr(ticket, "get_category_display") else "",
                "ticket_url": _ticket_url(ticket),
            }

    elif email_type == "ticket_admin_replied":
        ticket = kwargs.get("ticket")
        reply = kwargs.get("reply")
        if ticket:
            template_file = "emails/ticket_admin_replied.html"
            context = {
                "first_name": user.first_name,
                "ticket_number": getattr(ticket, "display_number", ""),
                "title": getattr(ticket, "title", ""),
                "reply_message": getattr(reply, "message", "") if reply else "",
                "ticket_url": _ticket_url(ticket),
            }

    elif email_type == "ticket_resolved":
        ticket = kwargs.get("ticket")
        if ticket:
            template_file = "emails/ticket_resolved.html"
            context = {
                "first_name": user.first_name,
                "ticket_number": getattr(ticket, "display_number", ""),
                "title": getattr(ticket, "title", ""),
                "ticket_url": _ticket_url(ticket),
            }

    elif email_type == "assessment_submitted":
        job = kwargs.get("job")
        template_file = "emails/assessment_submitted.html"
        context = {
            "first_name": user.first_name,
            "company": getattr(job.company, "company_name", "") if job and job.company else "",
            "skill": getattr(job, "title", "") if job else "",
        }

    elif email_type == "assessment_completed_recruiter_notice":
        job = kwargs.get("job")
        candidate_name = kwargs.get("candidate_name") or ""
        template_file = "emails/assessment_completed_recruiter.html"
        context = {
            "first_name": user.first_name,
            "candidate_name": candidate_name,
            "job_title": getattr(job, "title", "") if job else "",
            "results_url": kwargs.get("results_url", ""),
        }

    elif email_type == "low_balance_alert":
        template_file = "emails/low_balance_alert.html"
        context = {
            "first_name": user.first_name,
            "balance": _format_money(kwargs.get("balance"), kwargs.get("currency")),
            "threshold": _format_money(kwargs.get("threshold"), kwargs.get("currency")),
            "wallet_url": kwargs.get("wallet_url", ""),
        }

    elif email_type == "free_tier_exhausted":
        template_file = "emails/free_tier_exhausted.html"
        context = {
            "first_name": user.first_name,
            "resume_screening_price": kwargs.get("resume_screening_price", ""),
            "assessment_price": kwargs.get("assessment_price", ""),
            "wallet_url": kwargs.get("wallet_url", ""),
        }

    elif email_type == "wallet_topup_confirmed":
        template_file = "emails/wallet_topup_confirmed.html"
        context = {
            "first_name": user.first_name,
            "amount": _format_money(kwargs.get("amount"), kwargs.get("currency")),
            "new_balance": _format_money(kwargs.get("new_balance"), kwargs.get("currency")),
            "wallet_url": kwargs.get("wallet_url", ""),
        }

    elif email_type == "wallet_topup_failed":
        template_file = "emails/wallet_topup_failed.html"
        context = {
            "first_name": user.first_name,
            "amount": _format_money(kwargs.get("amount"), kwargs.get("currency")),
            "failure_reason": kwargs.get("failure_reason", ""),
            "wallet_url": kwargs.get("wallet_url", ""),
        }

    elif email_type == "jobs_paused_for_billing":
        template_file = "emails/jobs_paused_for_billing.html"
        context = {
            "first_name": user.first_name,
            "job_titles": kwargs.get("job_titles") or [],
            "wallet_url": kwargs.get("wallet_url", ""),
        }

    elif email_type == "jobs_reactivated_after_topup":
        template_file = "emails/jobs_reactivated_after_topup.html"
        context = {
            "first_name": user.first_name,
            "job_titles": kwargs.get("job_titles") or [],
            "wallet_url": kwargs.get("wallet_url", ""),
        }

    return template_file, context


def _ticket_url(ticket):
    if not ticket:
        return ""
    ticket_id = getattr(ticket, "id", None)
    if not ticket_id:
        return ""
    return f"{settings.FRONTEND_BASE_URL}/recruiter/dashboard/support/tickets/{ticket_id}"


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

def meeting_invite_reminder(user, company_name, meeting_details, join_url=None):
    template, ctx = get_email_template_and_context(
        user, "meeting_reminder", company_name=company_name,
        meeting_details=meeting_details, join_url=join_url,
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


def job_approved_status_for_recruiter_mail(user, job):
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


def candidate_interview_confirmation_mail(user, company_name, meeting_details):
    """Candidate-side confirmation once they've picked an interview slot --
    previously only the recruiter got a confirmation email; the candidate
    got nothing beyond the synchronous API response."""
    template, ctx = get_email_template_and_context(
        user, "candidate_interview_confirmation_mail", company_name=company_name,
        meeting_details=meeting_details,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Your interview is confirmed", template, ctx,
        email_type="candidate_interview_confirmation_mail",
    )


def recruiter_interview_acceptance_mail(user, company_name, meeting_details, candidate_name=None):
    template, ctx = get_email_template_and_context(
        user, "recruiter_interview_acceptance_mail", company_name=company_name,
        meeting_details=meeting_details, candidate_name=candidate_name,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Interview accepted", template, ctx,
        email_type="recruiter_interview_acceptance_mail",
    )


def recruiter_interview_reminder_mail(user, candidate_name, company_name, meeting_details, join_url=None):
    """30-minutes-before reminder to the recruiter -- `user` is the company
    rep being emailed; `candidate_name` is passed explicitly since `user`
    here is not the candidate (matching the pattern to the confusingly-
    named `candidate_name` context var over in recruiter_interview_acceptance_mail,
    which is actually populated from the recruiter's own name -- that's an
    existing quirk in this codebase, not repeated here)."""
    template, ctx = get_email_template_and_context(
        user, "recruiter_interview_reminder_mail", company_name=company_name,
        candidate_name=candidate_name, meeting_details=meeting_details, join_url=join_url,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, "Your interview starts in 30 minutes", template, ctx,
        email_type="recruiter_interview_reminder_mail",
    )


def interview_candidate_feedback_mail(user, job_title, company_name, feedback_content):
    """`user` is the candidate's own account (InterviewCandidateFeedback.candidate.user)
    -- feedback_content is the recruiter-reviewed, AI-drafted text from the
    review page, sent verbatim."""
    template, ctx = get_email_template_and_context(
        user, "interview_candidate_feedback_mail", job_title=job_title,
        company_name=company_name, feedback_content=feedback_content,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, f"Feedback on your interview for {job_title}", template, ctx,
        email_type="interview_candidate_feedback_mail",
    )


def interview_summary_ready_mail(user, candidate_name, review_url):
    """Notifies the recruiter that the AI-generated post-interview summary
    for `candidate_name` finished processing and is ready to review."""
    template, ctx = get_email_template_and_context(
        user, "interview_summary_ready_mail", candidate_name=candidate_name, review_url=review_url,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, f"Your interview summary for {candidate_name} is ready", template, ctx,
        email_type="interview_summary_ready_mail",
    )


def applicant_vetting_mail(
    user,
    job,
    status: Literal["consider", "strongly consider", "unconsider"],
    areas_for_improvement=None,
    assessment_link=None,
    duration_minutes=None,
    deadline=None,
    has_coding_task=False,
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
            duration_minutes=duration_minutes, deadline=deadline, has_coding_task=has_coding_task,
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


def _standalone_assessment_format_label(assessment):
    """Describes what the candidate will actually face, from the section
    types really on this assessment -- not a single has-coding-task flag,
    which used to default to "Multiple choice assessment" for e.g. an
    all-open-ended test, or "MCQ with live coding" for one with coding +
    open-ended but no MCQ at all."""
    types = set(assessment.sections.values_list("type", flat=True).distinct())
    labels = {
        "MCQ": "multiple choice",
        "CODING_TASK": "live coding",
        "OPEN_ENDED": "open-ended written response",
    }
    present = [labels[t] for t in ("MCQ", "CODING_TASK", "OPEN_ENDED") if t in types]
    if not present:
        return "assessment"
    if len(present) == 1:
        return present[0].capitalize() + " assessment"
    return " + ".join(present) + " assessment"


def standalone_assessment_invite_mail(email, name, assessment, deadline=None):
    """Invite email for a recruiter-built, account-less assessment invite --
    there's no CustomUser/TalentProfile to address this to (see
    GeneralSkillAssessment.invited_email/invited_name), so this builds the
    template context directly instead of going through
    get_email_template_and_context (which expects a real user). Reuses the
    same assessment_invitation.html template as the job-application flow."""
    assessment_link = f"{settings.FRONTEND_BASE_URL}/assessment-invite/{assessment.invite_token}/"
    context = {
        "first_name": name,
        "company": getattr(assessment.company, "company_name", "") if assessment.company_id else "",
        "skill": assessment.title,
        "assessment_url": assessment_link,
        "duration": f"{assessment.duration_minutes} minutes" if assessment.duration_minutes else None,
        "deadline": _format_deadline(deadline),
        "assessment_format": _standalone_assessment_format_label(assessment),
        "is_standalone_invite": True,
    }
    subject = f"You've been invited to take an assessment: {assessment.title}"
    return _send_with_latest_flow(
        email, subject, "emails/assessment_invitation.html", context,
        email_type="standalone_assessment_invite",
    )


def standalone_assessment_completed_candidate_mail(email, name, assessment):
    """Confirmation sent to a standalone (account-less) candidate once their
    entire assessment is graded -- mirrors assessment_submitted_mail, built
    directly since there's no CustomUser for get_email_template_and_context.
    Deliberately never includes the score/pass status here regardless of
    show_results_to_candidate -- that's the results page's job (see
    SubmissionSerializer), not the email's."""
    context = {
        "first_name": name,
        "company": getattr(assessment.company, "company_name", "") if assessment.company_id else "",
        "skill": assessment.title,
    }
    subject = "We've received your assessment submission"
    return _send_with_latest_flow(
        email, subject, "emails/assessment_submitted.html", context,
        email_type="standalone_assessment_submitted",
    )


def application_received_mail(user, job):
    """Confirmation sent immediately after a candidate submits a job
    application through the no-login apply form -- separate from
    `send_welcome_mail`, since no account signup actually happened here."""
    if not job:
        return None
    subject = f"We've received your application for {getattr(job, 'title', 'the role')}"
    template, ctx = get_email_template_and_context(user, "application_received", job=job)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="application_received",
    )


def assessment_submitted_mail(user, job):
    """Confirmation sent to the candidate once, right after the ENTIRE
    assessment (every section) has been submitted -- never per section."""
    subject = "We've received your assessment submission"
    template, ctx = get_email_template_and_context(user, "assessment_submitted", job=job)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="assessment_submitted",
    )


def assessment_completed_recruiter_notice_mail(user, job, candidate_name, results_url):
    """Notifies the recruiter once a candidate finishes their full assessment,
    with a link to the results. Sent alongside assessment_submitted_mail,
    same one-time completion event."""
    subject = f"{candidate_name} completed their assessment" if candidate_name else "A candidate completed their assessment"
    template, ctx = get_email_template_and_context(
        user, "assessment_completed_recruiter_notice", job=job, candidate_name=candidate_name, results_url=results_url,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="assessment_completed_recruiter_notice",
    )


def low_balance_alert_mail(user, balance, threshold, currency, wallet_url):
    """Sent when a wallet's balance drops below the org's configured
    low-balance threshold -- rate-limited to once per 24h by the caller
    (BillingService.check_and_send_low_balance_alert)."""
    subject = "Your Tiaago wallet balance is running low"
    template, ctx = get_email_template_and_context(
        user, "low_balance_alert", balance=balance, threshold=threshold, currency=currency, wallet_url=wallet_url,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="low_balance_alert",
    )


def free_tier_exhausted_mail(user, resume_screening_price, assessment_price, wallet_url, free_tier_limit=20):
    """Sent once, the moment an organisation's last free credit is used --
    tells them their wallet will now be charged for every candidate."""
    subject = f"You've used all {free_tier_limit} of your free candidate processings"
    template, ctx = get_email_template_and_context(
        user, "free_tier_exhausted", resume_screening_price=resume_screening_price,
        assessment_price=assessment_price, wallet_url=wallet_url, free_tier_limit=free_tier_limit,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="free_tier_exhausted",
    )


def wallet_topup_confirmed_mail(user, amount, new_balance, currency, wallet_url):
    subject = "Your wallet top-up was successful"
    template, ctx = get_email_template_and_context(
        user, "wallet_topup_confirmed", amount=amount, new_balance=new_balance, currency=currency, wallet_url=wallet_url,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="wallet_topup_confirmed",
    )


def wallet_topup_failed_mail(user, amount, currency, failure_reason, wallet_url):
    subject = "Your wallet top-up could not be completed"
    template, ctx = get_email_template_and_context(
        user, "wallet_topup_failed", amount=amount, currency=currency, failure_reason=failure_reason, wallet_url=wallet_url,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="wallet_topup_failed",
    )


def jobs_paused_for_billing_mail(user, job_titles, wallet_url):
    """Sent when a company's wallet can no longer cover resume screening/
    assessment charges -- all of the company's ACTIVE jobs are paused at once
    (see subscriptions.billing_service._pause_company_jobs_for_wallet_exhaustion),
    so this tells every recipient which jobs stopped accepting applications
    and links them to fund the wallet."""
    subject = "Your jobs are paused -- wallet balance exhausted"
    template, ctx = get_email_template_and_context(
        user, "jobs_paused_for_billing", job_titles=job_titles, wallet_url=wallet_url,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="jobs_paused_for_billing",
    )


def jobs_reactivated_after_topup_mail(user, job_titles, wallet_url):
    """Sent when a wallet top-up auto-resumes jobs that were paused for
    billing (see subscriptions.billing_service._resume_company_jobs_after_wallet_topup).
    Never fires for a recruiter's own manual ON_HOLD -- those don't auto-resume."""
    subject = "Your jobs are active again"
    template, ctx = get_email_template_and_context(
        user, "jobs_reactivated_after_topup", job_titles=job_titles, wallet_url=wallet_url,
    )
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="jobs_reactivated_after_topup",
    )


def ticket_received_mail(user, ticket):
    """Sent to the submitting user immediately after a support ticket is created."""
    if not ticket:
        return None
    subject = f"Your support request has been received — {getattr(ticket, 'display_number', '')}"
    template, ctx = get_email_template_and_context(user, "ticket_received", ticket=ticket)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="ticket_received",
    )


def ticket_admin_replied_mail(user, ticket, reply):
    """Sent to the ticket's submitting user when an admin posts a (non-internal) reply."""
    if not ticket:
        return None
    subject = f"Tiaago Support replied to your ticket — {getattr(ticket, 'display_number', '')}"
    template, ctx = get_email_template_and_context(user, "ticket_admin_replied", ticket=ticket, reply=reply)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="ticket_admin_replied",
    )


def ticket_resolved_mail(user, ticket):
    """Sent to the ticket's submitting user when an admin marks it RESOLVED."""
    if not ticket:
        return None
    subject = f"Your support ticket has been resolved — {getattr(ticket, 'display_number', '')}"
    template, ctx = get_email_template_and_context(user, "ticket_resolved", ticket=ticket)
    if not template:
        return None
    return _send_with_latest_flow(
        user.email, subject, template, ctx, email_type="ticket_resolved",
    )


def public_contact_received_mail(name, email, ticket):
    """Sent to a public /contact form submitter -- no CustomUser exists for
    them (see SupportTicket.Source.PUBLIC_CONTACT_FORM), so this builds the
    template context directly instead of going through
    get_email_template_and_context, matching standalone_assessment_invite_mail's
    account-less pattern."""
    if not ticket:
        return None
    subject = f"We've received your message — {getattr(ticket, 'display_number', '')}"
    context = {
        "first_name": (name or "").split(" ")[0] or "there",
        "ticket_number": getattr(ticket, "display_number", ""),
    }
    return _send_with_latest_flow(
        email, subject, "emails/public_contact_received.html", context, email_type="public_contact_received",
    )


def public_contact_admin_replied_mail(name, email, ticket, reply):
    """Sent to a public /contact form submitter when the support team
    replies -- they have no account/login, so unlike ticket_admin_replied_mail
    this has no 'view ticket' CTA, just the reply itself."""
    if not ticket:
        return None
    subject = f"Tiaago Support replied to your message — {getattr(ticket, 'display_number', '')}"
    context = {
        "first_name": (name or "").split(" ")[0] or "there",
        "ticket_number": getattr(ticket, "display_number", ""),
        "reply_message": getattr(reply, "message", "") if reply else "",
    }
    return _send_with_latest_flow(
        email, subject, "emails/public_contact_admin_replied.html", context, email_type="public_contact_admin_replied",
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
