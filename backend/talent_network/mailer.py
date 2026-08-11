"""Sends Talent Network emails. Every Talent Network email -- job-match
notifications and the double opt-in welcome/confirmation email alike --
sends through the platform-wide TalentNetworkSmtpConfig (Admin > Settings >
Email Integration), i.e. the single Google account an admin has connected
for the Talent Network specifically. It deliberately never uses a
recruiter's own connected Gmail (sourcing.models.GmailSmtpConfig, the
"Email Integration" recruiters use to message pipeline candidates) -- the
Talent Network is a platform-wide list the member opted into, not any one
company's, so it must always come from the platform's own address, not a
recruiter's personal inbox. Falls back further to the platform's existing
Resend-based sender (utils.email_handler) only if TalentNetworkSmtpConfig
hasn't been configured either -- so the feature keeps working out of the
box before an admin sets up SMTP. Every path is logged to the existing
management.models.EmailTrack table for platform-wide visibility.
"""

import logging

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from management.models import EmailTrack
from utils.email_handler import EmailHandler
from utils.gmail_smtp import send_gmail_email

from .models import JobMatchNotification, TalentNetworkMember, TalentNetworkSmtpConfig

logger = logging.getLogger("talent_network")

EMAIL_TYPE_JOB_MATCH = "Talent Network Job Match"
EMAIL_TYPE_WELCOME = "Talent Network Welcome"


def _get_platform_smtp_config():
    config = TalentNetworkSmtpConfig.objects.first()
    return config if config and config.is_verified else None


def _send_via_platform_smtp_or_fallback(to_email: str, subject: str, template: str, context: dict, email_type: str):
    """Sends through the platform-wide Gmail SMTP config if one is connected
    and verified, else falls back to EmailHandler (Resend/Mailgun). Returns
    (success, error_message), and self-logs to EmailTrack on the SMTP path
    (EmailHandler already logs its own EmailTrack row internally)."""
    platform_config = _get_platform_smtp_config()
    if platform_config is not None:
        html_body = render_to_string(template, context)
        success, error = send_gmail_email(
            smtp_config=platform_config,
            from_name="Tiaago Talent Network",
            to_email=to_email,
            subject=subject,
            html_body=html_body,
        )
        _log_email_track(to_email, email_type, success)
        if success:
            platform_config.last_used_at = timezone.now()
            platform_config.save(update_fields=["last_used_at"])
        return success, error

    try:
        result = EmailHandler([to_email]).send_mail(
            subject=subject, context=context, template=template, email_type=email_type,
        )
        track_id = result.rsplit("-", 1)[-1].strip()
        track = EmailTrack.objects.filter(id=track_id).first() if track_id.isdigit() else None
        success = bool(track and track.status == EmailTrack.SUCCESS)
        error = "" if success else "Send failed via all configured providers (see EmailTrack log)"
        return success, error
    except Exception as e:
        return False, str(e)[:500]


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

    # BASE_URL is the Django backend's own public origin -- distinct from
    # FRONTEND_URL (the Next.js app). TrackClickView/TrackOpenView are
    # backend API routes (api/talent-network/track/...), so they must use
    # this, not the frontend origin, or "Apply" 404s on the frontend
    # (same fix as campaigns.send_renderer._backend_base_url).
    backend_base = getattr(settings, "BASE_URL", None) or "http://localhost:8000"
    tracking_base = f"{backend_base.rstrip('/')}/api/talent-network/track"
    subject = f"A new {job.role} opportunity matches your profile"

    context = _base_email_context({
        "first_name": member.first_name,
        "job": job,
        "company_name": company.company_name if company else "",
        "matched_criteria": notification.matched_criteria,
        # Straight to the real frontend job page -- never a backend
        # redirect hop (BASE_URL isn't validated as required-in-prod the
        # way FRONTEND_URL is, so a misconfigured/unset BASE_URL used to
        # silently embed an unreachable localhost link here). ?tn= is read
        # by the apply page itself to record the click -- see
        # TrackClickView's docstring.
        "apply_url": f"{job.get_apply_url()}?tn={notification.id}",
        "open_pixel_url": f"{tracking_base}/open/{notification.id}/",
        "unsubscribe_url": f"{settings.FRONTEND_URL.rstrip('/')}/unsubscribe?token={member.unsubscribe_token}",
    })

    # Always the platform's admin-linked Google account (TalentNetworkSmtpConfig),
    # never the recruiter/company's own Gmail -- see module docstring. A
    # company's connected Gmail is intentionally not consulted here.
    success, error = _send_via_platform_smtp_or_fallback(
        to_email=member.email,
        subject=subject,
        template="emails/talent_network_job_match.html",
        context=context,
        email_type=EMAIL_TYPE_JOB_MATCH,
    )
    notification.send_channel = JobMatchNotification.SendChannel.PLATFORM_DEFAULT

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
    """Sends the double opt-in confirmation email through the platform-wide
    TalentNetworkSmtpConfig (Admin > Settings > Email Integration) if one is
    connected and verified, else falls back to EmailHandler/Resend."""
    confirm_url = f"{settings.FRONTEND_URL.rstrip('/')}/talent-network/confirm/{member.confirmation_token}/"
    context = _base_email_context({"first_name": member.first_name, "confirm_url": confirm_url})
    success, error = _send_via_platform_smtp_or_fallback(
        to_email=member.email,
        subject="Confirm your spot in the TIAAGO Talent Network",
        template="emails/talent_network_welcome.html",
        context=context,
        email_type=EMAIL_TYPE_WELCOME,
    )
    if not success:
        logger.warning("Talent Network welcome email failed for %s: %s", member.email, error)
    return success
