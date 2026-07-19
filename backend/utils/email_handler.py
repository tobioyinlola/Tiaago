import logging
import os
import time
import smtplib
from typing import TypedDict
from django.core.mail import send_mail
from django.conf import settings
from django.core.mail.message import EmailMultiAlternatives
from django.template.loader import get_template
from django.template import TemplateDoesNotExist
from django.utils.html import strip_tags
from management.models import EmailTrack
import requests
logger = logging.getLogger("emails")


def log_mail(email, email_type, email_status, provider_message_id="", delivery_status=None):
    """Log mails been sent out from the system."""
    email_track_obj = EmailTrack.objects.create(
        email=email,
        email_type=email_type,
        status=email_status,
        provider_message_id=provider_message_id or "",
        delivery_status=delivery_status or EmailTrack.DeliveryStatus.PENDING,
    )
    return email_track_obj.id


class EmailTypes:
    TALENT_ASSESSMENT_PASS_MAIL = "Talent Assessment Pass Mail"
    OTP_FOR_EMAIL_VERIFICATION = "One-Time Password for Email Verification"
    USER_INVITE = "User Invite to join Tiaago"
    PASSWORD_RESET = "Password Reset"
    COMPANY_TEAM_INVITE = "Company Team Invite"
    STAFF_INVITE = "Staff Invite"
    BILLING_NOTIFICATION = "Billing Notification"
    INTERVIEW_SLOT_SELECTION_MAIL = "Interview Slot Selection Mail"
    ASSESSMENT_SUBMITTED = "Assessment Submitted"
    ASSESSMENT_COMPLETED_RECRUITER_NOTICE = "Assessment Completed Recruiter Notice"
    LOW_BALANCE_ALERT = "Low Balance Alert"
    FREE_TIER_EXHAUSTED = "Free Tier Exhausted"
    WALLET_TOPUP_CONFIRMED = "Wallet Topup Confirmed"
    WALLET_TOPUP_FAILED = "Wallet Topup Failed"

MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN")  # e.g. "mg.yourdomain.com"
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY")

# Resend (primary provider). From addresses must belong to the domain
# verified in the Resend dashboard (email.tiaago.com) — the apex domain
# would be rejected with a 403 unless verified separately.
#
# Two sender identities (Resend advises against no-reply@ addresses — both
# are real addresses and replies route to RESEND_REPLY_TO):
#   - RESEND_FROM_EMAIL: general emails (welcome, billing, invites, ...)
#   - RESEND_SECURITY_EMAIL: security emails (OTP, password reset) — a
#     distinct sender so users and mail filters can tell them apart.
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv(
    "RESEND_FROM_EMAIL", "Tiaago <support@email.tiaago.com>"
)
RESEND_SECURITY_EMAIL = os.getenv(
    "RESEND_SECURITY_EMAIL", "Tiaago <verify@email.tiaago.com>"
)
RESEND_REPLY_TO = os.getenv("RESEND_REPLY_TO", "support@email.tiaago.com")

class EmailHandler:
    """
    For sending mails
    """

    MAX_RETRIES = 3
    RETRY_DELAY = 5  # seconds

    def __init__(self, recipients):
        if isinstance(recipients, str):
            self.recipients = [recipients]
        elif isinstance(recipients, list):
            self.recipients = recipients
        else:
            raise Exception("Wrong recipient type passed!")

    def send_mail_via_smptp(self, subject, context, template, email_type=None):
        html = get_template(template).render(context)
        if settings.IS_STAGING:
            subject = f"Staging : {subject}"
        if settings.IS_DEV:
            subject = f"Dev : {subject}"
        msg = EmailMultiAlternatives(
            subject=subject,
            to=self.recipients,
        )
        msg.attach_alternative(html, "text/html")
        retry_count = 0
        email_log_id = None
        while retry_count < self.MAX_RETRIES:
            try:
                success = msg.send()
                if email_type is not None:
                    email_log_id = log_mail(
                        ", ".join(self.recipients), email_type, success
                    )
                return  # Email sent successfully, exit the loop
            except smtplib.SMTPServerDisconnected:
                # SMTP server disconnected, retry after delay
                logger.error("SMTP server disconnected. Retrying...")
                retry_count += 1
                time.sleep(self.RETRY_DELAY)
        else:
            # Maximum retries reached, log error or raise exception
            logger.error("Failed to send email after maximum retries.")
        return f"Email Track Model Id - {email_log_id}"
    @staticmethod
    def _render_text_twin(html_template_path, context):
        """Try to render a plain-text twin for the HTML template.

        Convention: emails/<name>.html -> emails/text/<name>.txt
        Falls back to stripping tags from the HTML if no .txt exists.
        """
        import os.path as osp
        parts = html_template_path.rsplit("/", 1)
        if len(parts) == 2:
            dirname, filename = parts
            name, _ = osp.splitext(filename)
            txt_path = f"{dirname}/text/{name}.txt"
        else:
            txt_path = None

        if txt_path:
            try:
                return get_template(txt_path).render(context)
            except TemplateDoesNotExist:
                pass
        return None

    def _send_via_resend(self, subject, html, security=False, text_body=None, from_override=None, headers=None):
        """Send through the Resend HTTP API.

        Returns the Resend message id (str) on 2xx, None on failure.
        """
        if from_override:
            from_addr = from_override
        else:
            from_addr = RESEND_SECURITY_EMAIL if security else RESEND_FROM_EMAIL
        payload = {
            "from": from_addr,
            "to": self.recipients,
            "subject": subject,
            "text": text_body or "See HTML version for full content.",
            "html": html,
        }
        if RESEND_REPLY_TO:
            payload["reply_to"] = RESEND_REPLY_TO
        if headers:
            payload["headers"] = headers
        response = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json=payload,
            timeout=10,
        )
        logger.info(f"Resend response: {response.status_code} - {response.text}")
        if not (200 <= response.status_code < 300):
            logger.error(f"Resend error: {response.text}")
            return None
        logger.info(f"Email sent successfully via Resend to {self.recipients}")
        try:
            return response.json().get("id", "")
        except ValueError:
            return ""

    def _send_via_mailgun(self, subject, html, from_email, text_body=None) -> bool:
        """Send through the Mailgun HTTP API. Returns True on 200."""
        data = {
            "from": from_email,
            "to": self.recipients,
            "subject": subject,
            "text": text_body or "See HTML version for full content.",
            "html": html,
        }
        response = requests.post(
            f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
            auth=("api", MAILGUN_API_KEY),
            data=data,
            timeout=10,
        )
        logger.info(f"Mailgun response: {response.status_code} - {response.text}")
        if response.status_code != 200:
            logger.error(f"Mailgun error: {response.text}")
            return False
        logger.info(f"Email sent successfully via Mailgun to {self.recipients}")
        return True

    def send_mail(
        self, subject, context, template, email_type=None,
        from_email="Tiaago <support@email.tiaago.com>",
        security=False,
        from_name=None,
        headers=None,
    ):
        """Send an email: Resend first (2 attempts), Mailgun as fallback.

        `security=True` sends from the security identity (verify@...) -
        use for OTP and password-reset emails so users and mail filters can
        distinguish them from general mail. Replies always route to
        RESEND_REPLY_TO regardless of identity.

        `from_email` only applies to the Mailgun fallback - Resend requires
        the from address to be on its verified domain, so it picks the
        identity from the security flag.

        `from_name` overrides the display name in the From header while
        keeping the verified email address (e.g. "Jane via Tiaago").

        `headers` is an optional dict of custom email headers to include
        (e.g. {"X-Entity-Ref-ID": "..."} for deliverability).
        """
        frontend = getattr(settings, "FRONTEND_URL", "https://www.tiaago.com/").rstrip("/")
        asset_url = f"{frontend}/emails/assets"
        context.setdefault("asset_url", asset_url)
        context.setdefault("logo_url", f"{asset_url}/Tiaago_logo_white.png")
        context.setdefault("hero_url", f"{asset_url}/welcome-onboard.png")
        context.setdefault("wave_url", f"{asset_url}/wave-indigo-alpha.png")

        html = get_template(template).render(context)

        text_body = self._render_text_twin(template, context)

        # Add environment prefixes
        if settings.IS_STAGING:
            subject = f"Staging : {subject}"
        if settings.IS_DEV:
            subject = f"Dev : {subject}"

        # Build from_override for Resend if from_name was provided
        from_override = None
        if from_name and not security:
            import re
            match = re.search(r'<(.+)>', RESEND_FROM_EMAIL)
            base_email = match.group(1) if match else RESEND_FROM_EMAIL
            from_override = f"{from_name} <{base_email}>"

        success = False
        provider_message_id = ""
        delivery_status = None  # pending - updated by Resend webhooks

        if RESEND_API_KEY:
            for attempt in range(2):
                try:
                    message_id = self._send_via_resend(
                        subject, html, security=security, text_body=text_body,
                        from_override=from_override, headers=headers,
                    )
                    if message_id is not None:
                        success = True
                        provider_message_id = message_id
                        # Resend accepted the message — record SENT now instead
                        # of relying on the email.sent webhook; webhooks upgrade
                        # to delivered/bounced/etc. from here.
                        delivery_status = EmailTrack.DeliveryStatus.SENT
                        break
                except requests.exceptions.RequestException as e:
                    logger.error(f"Resend connection error: {e}")
                if attempt == 0:
                    time.sleep(2)
        else:
            logger.warning("RESEND_API_KEY not set; skipping Resend.")

        if not success and MAILGUN_API_KEY and MAILGUN_DOMAIN:
            try:
                mailgun_from = RESEND_SECURITY_EMAIL if security else from_email
                success = self._send_via_mailgun(subject, html, mailgun_from, text_body=text_body)
                if success:
                    # No webhook tracking on the fallback — mark explicitly
                    # so the row doesn't sit at "pending" forever.
                    delivery_status = EmailTrack.DeliveryStatus.SENT_VIA_MAILGUN
            except requests.exceptions.RequestException as e:
                logger.error(f"Mailgun fallback connection error: {e}")

        if not success:
            logger.error("Failed to send email via all providers.")
            delivery_status = EmailTrack.DeliveryStatus.FAILED

        email_log_id = None
        if email_type is not None:
            email_log_id = log_mail(
                ", ".join(self.recipients), email_type, success,
                provider_message_id=provider_message_id,
                delivery_status=delivery_status,
            )
        return f"Email Track Model Id - {email_log_id}"
    def send_basic_email(self, subject, message, email_type=EmailTypes.BILLING_NOTIFICATION):
        """
        Send a basic plain-text email.\n
        Tries Resend first; falls back to Django's send_mail (SMTP).
        Logs to EmailTrack (pass email_type=None to skip logging).
        """
        success = False
        provider_message_id = ""
        delivery_status = None  # pending → updated by Resend webhooks

        if RESEND_API_KEY:
            try:
                payload = {
                    "from": RESEND_FROM_EMAIL,
                    "to": self.recipients,
                    "subject": subject,
                    "text": message,
                }
                if RESEND_REPLY_TO:
                    payload["reply_to"] = RESEND_REPLY_TO
                response = requests.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                    json=payload,
                    timeout=10,
                )
                if 200 <= response.status_code < 300:
                    logger.info(f"Email sent via Resend to {', '.join(self.recipients)}")
                    success = True
                    delivery_status = EmailTrack.DeliveryStatus.SENT
                    try:
                        provider_message_id = response.json().get("id", "")
                    except ValueError:
                        pass
                else:
                    logger.error(f"Resend error (basic email): {response.text}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Resend connection error (basic email): {e}")

        if not success:
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=self.recipients,  # Accepting a list of emails here
                    fail_silently=False,
                )
                logger.info(f"Email sent to {', '.join(self.recipients)}")
                success = True
                # SMTP has no webhook tracking — terminal on send.
                delivery_status = EmailTrack.DeliveryStatus.SENT_VIA_MAILGUN
            except Exception as e:
                logger.error(f"Error sending email to {', '.join(self.recipients)}: {e}")
                delivery_status = EmailTrack.DeliveryStatus.FAILED

        if email_type is not None:
            log_mail(
                ", ".join(self.recipients), email_type, success,
                provider_message_id=provider_message_id,
                delivery_status=delivery_status,
            )
