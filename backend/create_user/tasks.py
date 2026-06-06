from celery import shared_task
from django.contrib.auth import get_user_model
import time
from emails import emails

User = get_user_model()

@shared_task
def send_welcome_mail(user_pk):
    user = User.objects.get(pk=user_pk)
    return emails.send_welcome_mail(user)

@shared_task
def approval_status_mail(user_pk):
    user = User.objects.get(pk=user_pk)
    return emails.approval_status_mail(user)

@shared_task
def admin_approved_user_mail(user_pk):
    user = User.objects.get(pk=user_pk)
    return emails.admin_approved_user_mail(user)

@shared_task
def admin_reject_user_mail(user_pk):
    user = User.objects.get(pk=user_pk)
    return emails.admin_reject_user_mail(user)

@shared_task
def ping_task():
    time.sleep(2)  # simulate some work
    return "pong"


@shared_task
def send_company_invite_email(invite_id):
    """Send company team invite email in background.

    Keeps the actual rendering/sending in utils.send_invite_email so behavior
    remains the same; this task just looks up the invite and calls it.
    """
    from .models import CompanyTeamInvite
    from .utils import send_invite_email

    try:
        invite = CompanyTeamInvite.objects.get(pk=invite_id)
    except CompanyTeamInvite.DoesNotExist:
        return False

    try:
        send_invite_email(invite)
        return True
    except Exception:
        # Let the task fail silently and be retried by Celery if configured
        return False


@shared_task
def send_referral_invite_email(email, referral_code):
    """Background task to send a referral invite email to an arbitrary address.

    This wraps `send_invite_to_user` from utils so that HTTP request handlers
    can return quickly and offload email work to Celery.
    """
    from .utils import send_invite_to_user

    try:
        send_invite_to_user(email, referral_code)
        return True
    except Exception:
        return False