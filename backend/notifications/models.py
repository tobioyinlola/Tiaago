import uuid

from django.conf import settings
from django.db import models

from create_user.models import Company


class Notification(models.Model):
    class Type(models.TextChoices):
        ANNOUNCEMENT = "ANNOUNCEMENT", "Announcement"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        FEATURE_UPDATE = "FEATURE_UPDATE", "Feature Update"
        BILLING_ALERT = "BILLING_ALERT", "Billing Alert"
        GENERAL = "GENERAL", "General"

    class TargetScope(models.TextChoices):
        ALL_USERS = "ALL_USERS", "All Users"
        ORGANISATION = "ORGANISATION", "Organisation"
        SEGMENT = "SEGMENT", "Segment"
        TAG = "TAG", "Tag"
        SPECIFIC_USER = "SPECIFIC_USER", "Specific User"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.GENERAL)
    title = models.CharField(max_length=80)
    message = models.TextField()
    link_url = models.URLField(null=True, blank=True)
    link_label = models.CharField(max_length=60, null=True, blank=True)

    target_scope = models.CharField(max_length=20, choices=TargetScope.choices)
    target_organisation = models.ForeignKey(
        Company, related_name="targeted_notifications", on_delete=models.CASCADE, null=True, blank=True
    )
    segment = models.ForeignKey(
        "segments.AudienceSegment", related_name="notifications", on_delete=models.SET_NULL, null=True, blank=True
    )
    tag = models.ForeignKey(
        "tags.Tag", related_name="notifications", on_delete=models.SET_NULL, null=True, blank=True
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="targeted_user_notifications",
        on_delete=models.CASCADE, null=True, blank=True,
    )

    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="sent_notifications", on_delete=models.SET_NULL, null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    # Stored for future use -- no scheduling worker exists in this build, so
    # a notification is always fanned out immediately at creation regardless
    # of this value (matches the "send immediately if null" spec literally,
    # since null is the only case actually handled today).
    scheduled_for = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.title


class NotificationRead(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification = models.ForeignKey(Notification, related_name="reads", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="notification_reads", on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("notification", "user")

    def __str__(self):
        return f"{self.user} read {self.notification_id}"
