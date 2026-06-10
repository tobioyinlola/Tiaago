from django.db import models
from base.models import TimeStampedModel


class EmailTrack(TimeStampedModel):
    """Model to represent the tracking of mail sent."""

    # Email Status
    FAILED = 0
    SUCCESS = 1

    EMAIL_STATUS_CHOICES = (
        (FAILED, 0),
        (SUCCESS, 1),
    )

    class DeliveryStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        DELIVERED = "delivered", "Delivered"
        DELAYED = "delayed", "Delayed"
        BOUNCED = "bounced", "Bounced"
        COMPLAINED = "complained", "Complained"
        FAILED = "failed", "Failed"

    email = models.EmailField()
    email_type = models.CharField(max_length=400)
    status = models.CharField(max_length=100, choices=EMAIL_STATUS_CHOICES)
    # Resend message id (from the send API response) — lets webhooks update
    # the exact row instead of guessing by recipient/time.
    provider_message_id = models.CharField(
        max_length=255, blank=True, default="", db_index=True
    )
    delivery_status = models.CharField(
        max_length=20,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING,
    )

    def __str__(self):
        return f"{self.email} | {self.email_type} - {self.status}"


class ProcessedWebhookEvent(models.Model):
    """Dedupe store for inbound webhook events (at-least-once delivery)."""

    provider = models.CharField(max_length=50)
    event_id = models.CharField(max_length=255)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("provider", "event_id")

    def __str__(self):
        return f"{self.provider}:{self.event_id}"
