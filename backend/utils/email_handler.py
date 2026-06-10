import logging
import time
import smtplib
from typing import TypedDict
from django.core.mail import send_mail
from django.conf import settings
from django.core.mail.message import EmailMultiAlternatives
from django.template.loader import get_template
from management.models import EmailTrack
import os
import requests
logger = logging.getLogger("emails")


def log_mail(email, email_type, email_status):
    """Log mails been sent out from the system."""
    email_track_obj = EmailTrack.objects.create(
        email=email, email_type=email_type, status=email_status
    )
    return email_track_obj.id


class EmailTypes:
    TALENT_ASSESSMENT_PASS_MAIL = "Talent Assessment Pass Mail"
    OTP_FOR_EMAIL_VERIFICATION = "One-Time Password for Email Verification"
    USER_INVITE = "User Invite to join Tiaago"
    PASSWORD_RESET = "Password Reset"
    COMPANY_TEAM_INVITE = "Company Team Invite"

MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN")  # e.g. "mg.yourdomain.com"
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY")

# Resend (primary provider). From addresses must belong to the domain
# verified in the Resend dashboard (email.tiaago.com) — the apex domain
# would be rejected with a 403 unless verified separately.
#
# Two sender identities:
#   - RESEND_FROM_EMAIL: replyable emails (welcome, billing, invites, ...)
#     with reply-to RESEND_REPLY_TO so replies reach a monitored inbox.
#   - RESEND_NO_REPLY_EMAIL: mechanical emails (OTP, password reset) where
#     a reply serves no purpose; no reply-to is attached.
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv(
    "RESEND_FROM_EMAIL", "Tiaago <support@email.tiaago.com>"
)
RESEND_NO_REPLY_EMAIL = os.getenv(
    "RESEND_NO_REPLY_EMAIL", "Tiaago <no-reply@email.tiaago.com>"
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
    def _send_via_resend(self, subject, html, no_reply=False) -> bool:
        """Send through the Resend HTTP API. Returns True on 2xx."""
        payload = {
            "from": RESEND_NO_REPLY_EMAIL if no_reply else RESEND_FROM_EMAIL,
            "to": self.recipients,
            "subject": subject,
            "text": "See HTML version for full content.",
            "html": html,
        }
        if not no_reply and RESEND_REPLY_TO:
            payload["reply_to"] = RESEND_REPLY_TO
        response = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json=payload,
            timeout=10,
        )
        logger.info(f"Resend response: {response.status_code} - {response.text}")
        if not (200 <= response.status_code < 300):
            logger.error(f"Resend error: {response.text}")
            return False
        logger.info(f"Email sent successfully via Resend to {self.recipients}")
        return True

    def _send_via_mailgun(self, subject, html, from_email) -> bool:
        """Send through the Mailgun HTTP API. Returns True on 200."""
        data = {
            "from": from_email,
            "to": self.recipients,
            "subject": subject,
            "text": "See HTML version for full content.",
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
        no_reply=False,
    ):
        """Send an email: Resend first (2 attempts), Mailgun as fallback.

        `no_reply=True` sends from the no-reply identity with no reply-to —
        use for mechanical emails (OTP, password reset) where replies serve
        no purpose. All other emails send from the support identity with
        reply-to attached.

        `from_email` only applies to the Mailgun fallback — Resend requires
        the from address to be on its verified domain, so it picks the
        identity from the no_reply flag.
        """
        html = get_template(template).render(context)

        # Add environment prefixes
        if settings.IS_STAGING:
            subject = f"Staging : {subject}"
        if settings.IS_DEV:
            subject = f"Dev : {subject}"

        success = False

        if RESEND_API_KEY:
            for attempt in range(2):
                try:
                    if self._send_via_resend(subject, html, no_reply=no_reply):
                        success = True
                        break
                except requests.exceptions.RequestException as e:
                    logger.error(f"Resend connection error: {e}")
                if attempt == 0:
                    time.sleep(2)
        else:
            logger.warning("RESEND_API_KEY not set; skipping Resend.")

        if not success and MAILGUN_API_KEY and MAILGUN_DOMAIN:
            try:
                mailgun_from = RESEND_NO_REPLY_EMAIL if no_reply else from_email
                success = self._send_via_mailgun(subject, html, mailgun_from)
            except requests.exceptions.RequestException as e:
                logger.error(f"Mailgun fallback connection error: {e}")

        if not success:
            logger.error("Failed to send email via all providers.")

        email_log_id = None
        if email_type is not None:
            email_log_id = log_mail(
                ", ".join(self.recipients), email_type, success
            )
        return f"Email Track Model Id - {email_log_id}"
    def send_basic_email(self, subject, message):
        """
        Send a basic plain-text email.\n
        Tries Resend first; falls back to Django's send_mail (SMTP).
        """
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
                    return
                logger.error(f"Resend error (basic email): {response.text}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Resend connection error (basic email): {e}")
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=self.recipients,  # Accepting a list of emails here
                fail_silently=False,
            )
            logger.info(f"Email sent to {', '.join(self.recipients)}")
        except Exception as e:
            logger.error(f"Error sending email to {', '.join(self.recipients)}: {e}")
