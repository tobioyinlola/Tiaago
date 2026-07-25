"""Single entry point for writing to TalentNetworkAuditLog -- every
consequential mutation (signup, confirm, unsubscribe, deactivate, delete,
CSV export, notification sent, settings change) should go through this
rather than creating TalentNetworkAuditLog rows ad hoc, so the audit trail
stays consistent."""

from typing import Optional

from .models import TalentNetworkAuditLog, TalentNetworkMember


def _client_ip(request) -> Optional[str]:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit(
    action: str,
    *,
    actor=None,
    target_member: Optional[TalentNetworkMember] = None,
    request=None,
    **metadata,
) -> TalentNetworkAuditLog:
    return TalentNetworkAuditLog.objects.create(
        action=action,
        actor=actor if (actor is not None and getattr(actor, "is_authenticated", False)) else None,
        target_member=target_member,
        ip_address=_client_ip(request),
        metadata=metadata,
    )
