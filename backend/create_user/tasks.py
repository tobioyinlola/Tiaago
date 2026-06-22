import logging
import time

from celery import shared_task
from django.contrib.auth import get_user_model

from emails import emails

User = get_user_model()
logger = logging.getLogger("tasks")


@shared_task
def send_welcome_mail(user_pk):
    user = User.objects.get(pk=user_pk)
    return emails.send_welcome_mail(user)

@shared_task
def approval_status_mail(user_pk):
    user = User.objects.get(pk=user_pk)
    return emails.send_approval_status_mail(user)


@shared_task
def send_otp_mail(user_pk, otp):
    user = User.objects.get(pk=user_pk)
    return emails.send_otp(user, otp)


@shared_task
def test_celery():
    """Test task: returns 'pong' after a 2s delay. Queued from /test-ping/."""
    time.sleep(2)
    return "pong"


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_company_invite_email(self, invite_id):
    """Send company team invite email in background."""
    from .models import CompanyTeamInvite
    from .utils import send_invite_email

    try:
        invite = CompanyTeamInvite.objects.get(pk=invite_id)
    except CompanyTeamInvite.DoesNotExist:
        logger.error(f"Invite {invite_id} not found, cannot send email")
        return False

    try:
        send_invite_email(invite)
        logger.info(f"Invite email sent to {invite.email} for company {invite.company_id}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send invite email to {invite.email}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@shared_task
def send_referral_invite_email(email, referral_code):
    """Background task to send a referral invite email to an arbitrary address."""
    from .utils import send_referral_invite

    try:
        send_referral_invite(email, referral_code)
        return True
    except Exception as exc:
        logger.error(f"Failed to send referral invite to {email}: {exc}", exc_info=True)
        return False
