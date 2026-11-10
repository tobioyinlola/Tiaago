"""Durable candidate notifications (transactional outbox with retry)."""
import logging
from datetime import timedelta

from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.html import escape

logger = logging.getLogger(__name__)

# Delay before attempt N+1 after attempt N fails; the last failure is terminal.
RETRY_BACKOFF = (
    timedelta(minutes=1), timedelta(minutes=5), timedelta(minutes=30),
    timedelta(hours=2), timedelta(hours=6),
)
MAX_ATTEMPTS = len(RETRY_BACKOFF) + 1
FROM_EMAIL = "Tiaago <support@email.tiaago.com>"


class CannotDeliver(Exception):
    """The notification can never be delivered by this channel (not retried)."""


def queue_notification(application, kind, *, dedupe_key=None, payload=None):
    """Persist a notification and schedule its delivery after commit.

    ``dedupe_key`` makes this idempotent: queueing the same event twice (a
    re-delivered Celery task, a double click) creates one message.
    """
    from .models import ApplicationNotification

    key = dedupe_key or f"{kind}:{application.id}:{timezone.now().timestamp()}"
    try:
        with transaction.atomic():
            notification, created = ApplicationNotification.objects.get_or_create(
                dedupe_key=key[:160],
                defaults={"application": application, "kind": kind, "payload": payload or {}},
            )
    except IntegrityError:  # concurrent creator won the race
        return ApplicationNotification.objects.get(dedupe_key=key[:160])
    if created:
        from .tasks import deliver_application_notification

        transaction.on_commit(lambda nid=notification.id: deliver_application_notification.delay(nid))
    return notification


# ------------------------------------------------------------------ handlers

def _recipient(application):
    email = (application.candidate_email or "").strip()
    if not email:
        raise CannotDeliver("No email address on file; contact the candidate by phone.")
    return email


def _send(application, subject, lines):
    body = "\n\n".join(lines)
    html = "".join(f"<p>{escape(line)}</p>" for line in lines)
    message = EmailMultiAlternatives(subject=subject, body=body, from_email=FROM_EMAIL, to=[_recipient(application)])
    message.attach_alternative(html, "text/html")
    message.send(fail_silently=False)


def _slot_line(payload):
    return f"When: {payload.get('starts_at', '')}. Where: {payload.get('location', '')}."


def _practical_booked(application, payload):
    _send(application, f"Your practical assessment is booked – {application.job.title}", [
        f"Hello {application.candidate_full_name},",
        f"Your {payload.get('title', 'practical assessment')} for {application.job.title} is confirmed.",
        _slot_line(payload),
        payload.get("instructions", ""),
    ])


def _practical_cancelled(application, payload):
    _send(application, f"Your practical assessment was cancelled – {application.job.title}", [
        f"Hello {application.candidate_full_name},",
        f"Your {payload.get('title', 'practical assessment')} appointment ({_slot_line(payload)}) was cancelled.",
        payload.get("note") or "The hiring team will contact you about rebooking.",
    ])


def _practical_no_show(application, payload):
    _send(application, f"Missed practical assessment – {application.job.title}", [
        f"Hello {application.candidate_full_name},",
        f"We recorded that you did not attend your {payload.get('title', 'practical assessment')} ({_slot_line(payload)}).",
        payload.get("note") or "Please contact the hiring team about whether a retest is available.",
    ])


def _practical_invite(application, payload):
    _send(application, f"Book your practical assessment – {application.job.title}", [
        f"Hello {application.candidate_full_name},",
        f"Please choose a time for your {payload.get('title', 'practical assessment')}: {payload.get('url', '')}",
        "This link is personal to you. Do not share it.",
    ])


def _manual_rejection(application, payload):
    from emails import emails

    emails.applicant_vetting_mail(
        application.as_email_recipient(), application.job, "unconsider",
        areas_for_improvement=payload.get("reason", ""),
    )


def _contact_by_phone(application, payload):
    """A message that has no electronic channel: surface it for a phone call."""
    raise CannotDeliver(payload.get("reason") or "This candidate has no email address; contact them by phone.")


HANDLERS = {
    "contact_by_phone": _contact_by_phone,
    "practical_booked": _practical_booked,
    "practical_cancelled": _practical_cancelled,
    "practical_no_show": _practical_no_show,
    "practical_booking_invite": _practical_invite,
    "manual_rejection": _manual_rejection,
}


# ------------------------------------------------------------------ delivery

def deliver(notification_id):
    """Attempt one delivery; update the outbox row. Safe to call repeatedly."""
    from .models import ApplicationNotification as N

    with transaction.atomic():
        notification = (
            N.objects.select_for_update(skip_locked=True, of=("self",))
            .select_related("application__job__company", "application__applicant__user")
            .filter(id=notification_id, status=N.Status.PENDING)
            .first()
        )
        if not notification:
            return None
        handler = HANDLERS.get(notification.kind)
        notification.attempts += 1
        try:
            if handler is None:
                raise CannotDeliver(f"No handler for notification kind {notification.kind!r}.")
            handler(notification.application, notification.payload)
        except CannotDeliver as exc:
            notification.status = N.Status.SKIPPED
            notification.last_error = str(exc)[:500]
        except Exception as exc:  # noqa: BLE001 - any channel failure is retried
            notification.last_error = f"{type(exc).__name__}: {exc}"[:500]
            if notification.attempts >= MAX_ATTEMPTS:
                notification.status = N.Status.DEAD
            else:
                notification.next_attempt_at = timezone.now() + RETRY_BACKOFF[notification.attempts - 1]
            logger.warning("Notification %s attempt %s failed: %s", notification.id, notification.attempts, exc)
        else:
            notification.status = N.Status.SENT
            notification.sent_at = timezone.now()
            notification.last_error = ""
        notification.save(update_fields=(
            "status", "attempts", "next_attempt_at", "last_error", "sent_at", "updated_at",
        ))
    return notification


def retry_dead(notification):
    """Recruiter-requested retry of a failed/skipped notification."""
    from .models import ApplicationNotification as N

    if notification.status not in (N.Status.DEAD, N.Status.SKIPPED):
        return notification
    notification.status = N.Status.PENDING
    notification.attempts = 0
    notification.next_attempt_at = timezone.now()
    notification.last_error = ""
    notification.save(update_fields=("status", "attempts", "next_attempt_at", "last_error", "updated_at"))
    from .tasks import deliver_application_notification

    transaction.on_commit(lambda nid=notification.id: deliver_application_notification.delay(nid))
    return notification
