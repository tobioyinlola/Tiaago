import base64
import hashlib
import hmac
import json
import logging
import os
import time

from django.db import IntegrityError
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK
from .models import EmailTrack, ProcessedWebhookEvent
from .utils import get_user_and_registration_metrics, get_startup_metrics, get_contract_metrics, get_talent_metrics

logger = logging.getLogger(__name__)

class AdminMetricsAPIView(APIView):
    '''
    API Endpoint to fetch statistics.

    Returns user metrics, talent metrics, startup metrics and contract metrics
    '''
    permission_classes = [IsAdminUser]

    def get(self, request):
        talent_metrics = get_talent_metrics()
        user_metrics, registration_metrics = get_user_and_registration_metrics()
        startup_metrics = get_startup_metrics()
        contract_metrics = get_contract_metrics()
        data = {
            "talent_metrics":talent_metrics,
            "user_metrics":user_metrics,
            "startup_metrics":startup_metrics,
            "contract_metrics":contract_metrics,
            "registration_metrics":registration_metrics
        }
        return Response(data=data, status=HTTP_200_OK)


RESEND_WEBHOOK_SECRET = os.getenv("RESEND_WEBHOOK_SECRET", "")

# Resend event type -> EmailTrack.delivery_status
_RESEND_EVENT_STATUS = {
    "email.scheduled": EmailTrack.DeliveryStatus.SCHEDULED,
    "email.sent": EmailTrack.DeliveryStatus.SENT,
    "email.delivery_delayed": EmailTrack.DeliveryStatus.DELAYED,
    "email.delivered": EmailTrack.DeliveryStatus.DELIVERED,
    "email.bounced": EmailTrack.DeliveryStatus.BOUNCED,
    "email.complained": EmailTrack.DeliveryStatus.COMPLAINED,
    "email.suppressed": EmailTrack.DeliveryStatus.SUPPRESSED,
    "email.failed": EmailTrack.DeliveryStatus.FAILED,
}

# Events arrive out of order ("sent" can land after "delivered"). Each
# status has a rank; we only ever move the row to a higher rank. Terminal
# outcomes (bounced/complained/suppressed/failed) rank highest so nothing
# overwrites them.
_STATUS_RANK = {
    EmailTrack.DeliveryStatus.PENDING: 0,
    EmailTrack.DeliveryStatus.SCHEDULED: 1,
    EmailTrack.DeliveryStatus.SENT: 2,
    EmailTrack.DeliveryStatus.DELAYED: 3,
    EmailTrack.DeliveryStatus.DELIVERED: 4,
    EmailTrack.DeliveryStatus.SENT_VIA_MAILGUN: 5,
    EmailTrack.DeliveryStatus.BOUNCED: 6,
    EmailTrack.DeliveryStatus.COMPLAINED: 6,
    EmailTrack.DeliveryStatus.SUPPRESSED: 6,
    EmailTrack.DeliveryStatus.FAILED: 6,
}

_WEBHOOK_TOLERANCE_SECONDS = 300


def _verify_svix_signature(request) -> str | None:
    """Verify the Svix signature on a Resend webhook request.

    Returns the svix-id on success, None on any failure.
    Scheme: HMAC-SHA256 over "{id}.{timestamp}.{raw_body}" keyed with the
    base64-decoded secret (after the "whsec_" prefix); header carries one or
    more space-separated "v1,<base64sig>" entries.
    """
    svix_id = request.headers.get("svix-id")
    svix_timestamp = request.headers.get("svix-timestamp")
    svix_signature = request.headers.get("svix-signature")
    if not (svix_id and svix_timestamp and svix_signature):
        return None

    try:
        if abs(time.time() - int(svix_timestamp)) > _WEBHOOK_TOLERANCE_SECONDS:
            logger.warning("Resend webhook timestamp outside tolerance")
            return None
    except ValueError:
        return None

    secret = RESEND_WEBHOOK_SECRET
    if secret.startswith("whsec_"):
        secret = secret[len("whsec_"):]
    try:
        secret_bytes = base64.b64decode(secret)
    except Exception:
        logger.error("RESEND_WEBHOOK_SECRET is not valid base64")
        return None

    signed_content = f"{svix_id}.{svix_timestamp}.".encode() + request.body
    expected = base64.b64encode(
        hmac.new(secret_bytes, signed_content, hashlib.sha256).digest()
    ).decode()

    for part in svix_signature.split(" "):
        try:
            version, signature = part.split(",", 1)
        except ValueError:
            continue
        if version == "v1" and hmac.compare_digest(signature, expected):
            return svix_id
    return None


@csrf_exempt
def resend_webhook(request):
    """Receive Resend email events and update EmailTrack delivery status."""
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=405)

    if not RESEND_WEBHOOK_SECRET:
        logger.error("RESEND_WEBHOOK_SECRET not set; rejecting webhook")
        return JsonResponse({"error": "Webhook not configured"}, status=503)

    svix_id = _verify_svix_signature(request)
    if not svix_id:
        return JsonResponse({"error": "Invalid signature"}, status=401)

    # Idempotency: Resend delivers at-least-once.
    try:
        ProcessedWebhookEvent.objects.create(provider="resend", event_id=svix_id)
    except IntegrityError:
        return JsonResponse({"status": "already processed"}, status=200)

    try:
        event = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid payload"}, status=400)

    event_type = event.get("type", "")
    data = event.get("data", {})

    is_engagement = event_type in ("email.opened", "email.clicked")
    new_status = _RESEND_EVENT_STATUS.get(event_type)
    if new_status is None and not is_engagement:
        return JsonResponse({"status": "ignored"}, status=200)

    message_id = data.get("email_id", "")
    if not message_id:
        return JsonResponse({"status": "no email_id"}, status=200)

    track = EmailTrack.objects.filter(provider_message_id=message_id).first()
    if not track:
        logger.info(f"Resend webhook for unknown message id: {message_id}")
        return JsonResponse({"status": "unknown message"}, status=200)

    # Engagement events: stamp first-seen timestamps, leave delivery_status
    # alone (opened also implies delivered, handled below).
    if is_engagement:
        update_fields = []
        if event_type == "email.opened" and track.opened_at is None:
            track.opened_at = timezone.now()
            update_fields.append("opened_at")
        if event_type == "email.clicked" and track.clicked_at is None:
            track.clicked_at = timezone.now()
            update_fields.append("clicked_at")
        # An open/click proves delivery even if the delivered event was lost.
        delivered_rank = _STATUS_RANK[EmailTrack.DeliveryStatus.DELIVERED]
        if _STATUS_RANK.get(track.delivery_status, 0) < delivered_rank:
            track.delivery_status = EmailTrack.DeliveryStatus.DELIVERED
            update_fields.append("delivery_status")
        if update_fields:
            track.save(update_fields=update_fields)
        return JsonResponse({"status": "processed"}, status=200)

    # Delivery events: only ever move to a higher-ranked status so
    # out-of-order events never downgrade the row.
    if _STATUS_RANK[new_status] <= _STATUS_RANK.get(track.delivery_status, 0):
        return JsonResponse({"status": "stale event ignored"}, status=200)

    track.delivery_status = new_status
    track.save(update_fields=["delivery_status"])

    if new_status in (
        EmailTrack.DeliveryStatus.BOUNCED,
        EmailTrack.DeliveryStatus.COMPLAINED,
        EmailTrack.DeliveryStatus.SUPPRESSED,
    ):
        logger.warning(
            f"Email to {track.email} ({track.email_type}) {new_status}: "
            f"{json.dumps(data.get('bounce') or {})}"
        )

    return JsonResponse({"status": "processed"}, status=200)

        
