import logging

from celery import shared_task
from django.contrib.auth import get_user_model

logger = logging.getLogger("tasks")
User = get_user_model()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_staff_invite_email(self, user_id, inviter_name):
    from staff.utils import send_staff_invite_email as _send

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.error("Staff invite target %s not found, cannot send email", user_id)
        return False

    try:
        _send(user, inviter_name)
        logger.info("Staff invite email sent to %s", user.email)
        return True
    except Exception as exc:
        logger.error("Failed to send staff invite email to %s: %s", user.email, exc, exc_info=True)
        raise self.retry(exc=exc)
