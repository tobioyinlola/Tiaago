"""Sends Talent Network emails, preferring the job's own company's
connected Gmail (sourcing.models.GmailSmtpConfig -- the same "Email
Integration" recruiters already use to message pipeline candidates) so the
notification reads as a direct, personal invite from that company, falling
back to the platform's existing Resend-based sender (utils.email_handler)
for companies that haven't connected Gmail. Either path is logged to the
existing management.models.EmailTrack table for platform-wide visibility.
"""

import logging

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from management.models import EmailTrack
from utils.email_handler import EmailHandler
from utils.gmail_smtp import send_gmail_email

from .models import JobMatchNotification, TalentNetworkMember

logger = logging.getLogger("talent_network")

EMAIL_TYPE_JOB_MATCH = "Talent Network Job Match"
EMAIL_TYPE_WELCOME = "Talent Network Welcome"


def _base_email_context(extra: dict) -> dict:
    frontend = getattr(settings, "FRONTEND_URL", "https://www.tiaago.com/").rstrip("/")
    asset_url = f"{frontend}/emails/assets"
    context = {
        "asset_url": asset_url,
        "logo_url": f"{asset_url}/Tiaago_logo_white.png",
        "hero_url": f"{asset_url}/welcome-onboard.png",
        "wave_url": f"{asset_url}/wave-indigo-alpha.png",
    }
    context.update(extra)
    return context


def _log_email_track(email: str, email_type: str, success: bool) -> None:
    EmailTrack.objects.create(
        email=email,
        email_type=email_type,
        status=EmailTrack.SUCCESS if success else EmailTrack.FAILED,
        delivery_status=EmailTrack.DeliveryStatus.SENT if success else EmailTrack.DeliveryStatus.FAILED,
    )


def notify_member_of_job(notification: JobMatchNotification) -> bool:
    """Sends the job-match notification email for a single
    JobMatchNotification row and updates its status/send_channel in place.
    Returns True on success. Never raises -- failures are recorded on the
    notification itself so a batch run can continue past one bad send."""
    member = notification.member
    job = notification.job
    company = job.company

    tracking_base = f"{settings.FRONTEND_URL.rstrip('/')}/api/talent-network/track"
    subject = f"A new {job.role} opportunity matches your profile"

    context = _base_email_context({
        "first_name": member.first_name,
        "job": job,
        "company_name": company.company_name if company else "",
        "matched_criteria": notification.matched_criteria,
        "apply_url": f"{tracking_base}/click/{notification.id}/",
        "open_pixel_url": f"{tracking_base}/open/{notification.id}/",
        "unsubscribe_url": f"{settings.FRONTEND_URL.rstrip('/')}/unsubscribe?token={member.unsubscribe_token}",
    })

    html_body = render_to_string("emails/talent_network_job_match.html", context)

    smtp_config = getattr(company, "smtp_config", None) if company else None
    if smtp_config is not None and smtp_config.is_verified:
        success, error = send_gmail_email(
            smtp_config=smtp_config,
            from_name=company.company_name or "Tiaago",
            to_email=member.email,
            subject=subject,
            html_body=html_body,
        )
        notification.send_channel = JobMatchNotification.SendChannel.COMPANY_GMAIL
    else:
        # EmailHandler.send_mail() never raises and never returns a boolean --
        # it always returns "Email Track Model Id - {id}" regardless of
        # whether Resend/Mailgun actually succeeded, logging the real
        # outcome only on the EmailTrack row itself. So the only reliable
        # way to know if this send worked is to read that row back.
        try:
            result = EmailHandler([member.email]).send_mail(
                subject=subject,
                context=context,
                template="emails/talent_network_job_match.html",
                email_type=EMAIL_TYPE_JOB_MATCH,
            )
            track_id = result.rsplit("-", 1)[-1].strip()
            track = EmailTrack.objects.filter(id=track_id).first() if track_id.isdigit() else None
            success = bool(track and track.status == EmailTrack.SUCCESS)
            error = "" if success else "Send failed via all configured providers (see EmailTrack log)"
        except Exception as e:
            success, error = False, str(e)[:500]
        notification.send_channel = JobMatchNotification.SendChannel.PLATFORM_DEFAULT

    if smtp_config is not None and smtp_config.is_verified:
        # Only the direct-SMTP path needs a manual EmailTrack row --
        # EmailHandler.send_mail already logs one internally.
        _log_email_track(member.email, EMAIL_TYPE_JOB_MATCH, success)

    if success:
        notification.status = JobMatchNotification.Status.SENT
        notification.sent_at = timezone.now()
        member.last_email_sent = notification.sent_at
        member.save(update_fields=["last_email_sent"])
    else:
        notification.status = JobMatchNotification.Status.FAILED
        notification.error_reason = error
        logger.warning("Talent Network notification failed for member %s / job %s: %s", member.id, job.id, error)

    notification.save(update_fields=["status", "send_channel", "error_reason", "sent_at"])
    return success


def send_welcome_confirmation(member: TalentNetworkMember) -> bool:
    """Sends the double opt-in confirmation email."""
    confirm_url = f"{settings.FRONTEND_URL.rstrip('/')}/talent-network/confirm/{member.confirmation_token}/"
    context = _base_email_context({"first_name": member.first_name, "confirm_url": confirm_url})
    try:
        EmailHandler([member.email]).send_mail(
            subject="Confirm your spot in the TIAAGO Talent Network",
            context=context,
            template="emails/talent_network_welcome.html",
            email_type=EMAIL_TYPE_WELCOME,
        )
        return True
    except Exception as e:
        logger.warning("Talent Network welcome email failed for %s: %s", member.email, e)
        return False
