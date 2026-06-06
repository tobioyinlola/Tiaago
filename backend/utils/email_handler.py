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

MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN")  # e.g. "mg.yourdomain.com"
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY")

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
    def send_mail(
        self, subject, context, template, email_type=None,
        from_email="notifications@tiaago.com"
    ):
        html = get_template(template).render(context)

        # Add environment prefixes
        if settings.IS_STAGING:
            subject = f"Staging : {subject}"
        if settings.IS_DEV:
            subject = f"Dev : {subject}"

        retry_count = 0
        email_log_id = None

        while retry_count < self.MAX_RETRIES:
            try:
                # Mailgun request payload
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
                )
                logger.info(f"Mailgun response: {response.status_code} - {response.text}")
                success = response.status_code == 200 
                # Log email if required
                if email_type is not None:
                    email_log_id = log_mail(
                        ", ".join(self.recipients), email_type, success
                    )

                if success:
                    logger.info(f"Email sent successfully via Mailgun to {self.recipients}")
                    return f"Email Track Model Id - {email_log_id}"

                # Failure (non-200)
                logger.error(f"Mailgun error: {response.text}")
                retry_count += 1
                time.sleep(self.RETRY_DELAY)

            except requests.exceptions.RequestException as e:
                # Handle request/connection errors (similar to SMTP disconnect)
                logger.error(f"Mailgun connection error: {e}. Retrying...")
                retry_count += 1
                time.sleep(self.RETRY_DELAY)

        # After all retries fail
        logger.error("Failed to send email via Mailgun after maximum retries.")
        return f"Email Track Model Id - {email_log_id}"
    def send_basic_email(self, subject, message):
        """
        Send a basic email with django's send_mail\n
        Does not use a HTML template
        """
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
