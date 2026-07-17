import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from utils.email_handler import EmailHandler, EmailTypes

logger = logging.getLogger("staff")


def log_staff_activity(actor, action, target_type="", target_id="", metadata=None):
    """Best-effort activity log write -- never lets a logging failure break the caller."""
    from staff.models import StaffActivityLog

    try:
        StaffActivityLog.objects.create(
            actor=actor,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id != "" else "",
            metadata=metadata or {},
        )
    except Exception:
        logger.exception("Failed to write staff activity log for action=%s", action)


def send_staff_invite_email(user, inviter_name):
    """Send a staff invite email pointing at the existing /admin/reset-password
    flow -- staff invites reuse Django's password-reset uid/token rather than
    a bespoke invite-token model, since the account already exists (unusable
    password) at invite time."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base_url = settings.FRONTEND_URL.rstrip("/")
    set_password_url = f"{base_url}/admin/reset-password/?uid={uid}&token={token}"

    role_name = user.staff_role.name if user.staff_role else "Staff member"
    context = {
        "inviter": inviter_name,
        "role_name": role_name,
        "set_password_url": set_password_url,
    }
    EmailHandler(user.email).send_mail(
        subject=f"{inviter_name} invited you to join Tiaago Admin",
        context=context,
        template="emails/staff_invite.html",
        email_type=EmailTypes.STAFF_INVITE,
        from_name=f"{inviter_name} via Tiaago",
    )
