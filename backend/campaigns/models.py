import secrets
import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

from create_user.models import Company
from segments.models import AudienceSegment
from tags.models import Tag


class EmailTemplate(models.Model):
    class Category(models.TextChoices):
        ONBOARDING = "ONBOARDING", "Onboarding"
        UPSELL = "UPSELL", "Upsell"
        WINBACK = "WINBACK", "Winback"
        ANNOUNCEMENT = "ANNOUNCEMENT", "Announcement"
        EDUCATIONAL = "EDUCATIONAL", "Educational"
        TRANSACTIONAL = "TRANSACTIONAL", "Transactional"
        CUSTOM = "CUSTOM", "Custom"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.CUSTOM)
    subject_line = models.CharField(max_length=120)
    preview_text = models.CharField(max_length=160, blank=True, default="")
    # Ordered array of block dicts -- the editable source of truth for the
    # block editor. html_body/plain_text_body below are generated FROM this
    # by campaigns.block_renderer.render_blocks() on every save.
    blocks = models.JSONField(default=list)
    html_body = models.TextField(blank=True, default="")
    plain_text_body = models.TextField(blank=True, default="")
    merge_tags = models.JSONField(default=list, help_text="Merge tags referenced by this template's blocks.")
    thumbnail_url = models.URLField(null=True, blank=True)
    is_preset = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self):
        return self.name


class EmailCampaign(models.Model):
    class AudienceType(models.TextChoices):
        SEGMENT = "SEGMENT", "Segment"
        TAG = "TAG", "Tag"
        MANUAL = "MANUAL", "Manual selection"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SCHEDULED = "SCHEDULED", "Scheduled"
        SENDING = "SENDING", "Sending"
        SENT = "SENT", "Sent"
        CANCELLED = "CANCELLED", "Cancelled"
        PAUSED = "PAUSED", "Paused"

    class ScheduleType(models.TextChoices):
        IMMEDIATE = "IMMEDIATE", "Immediate"
        SCHEDULED = "SCHEDULED", "Scheduled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    subject_line = models.CharField(max_length=120)
    preview_text = models.CharField(max_length=160, blank=True, default="")

    audience_type = models.CharField(max_length=10, choices=AudienceType.choices, null=True, blank=True)
    audience_segment = models.ForeignKey(
        AudienceSegment, related_name="campaigns", on_delete=models.SET_NULL, null=True, blank=True
    )
    audience_tag = models.ForeignKey(
        Tag, related_name="campaigns", on_delete=models.SET_NULL, null=True, blank=True
    )
    manual_organisation_ids = ArrayField(models.IntegerField(), default=list, blank=True)

    email_template = models.ForeignKey(
        EmailTemplate, related_name="campaigns", on_delete=models.SET_NULL, null=True, blank=True
    )
    template_variables = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, db_index=True)
    schedule_type = models.CharField(max_length=10, choices=ScheduleType.choices, default=ScheduleType.IMMEDIATE)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    created_by_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_campaigns",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.name


def _generate_unsubscribe_token():
    return secrets.token_urlsafe(24)


class CampaignSend(models.Model):
    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        SENT = "SENT", "Sent"
        DELIVERED = "DELIVERED", "Delivered"
        OPENED = "OPENED", "Opened"
        CLICKED = "CLICKED", "Clicked"
        BOUNCED = "BOUNCED", "Bounced"
        FAILED = "FAILED", "Failed"
        UNSUBSCRIBED = "UNSUBSCRIBED", "Unsubscribed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(EmailCampaign, related_name="sends", on_delete=models.CASCADE)
    organisation = models.ForeignKey(
        Company, related_name="campaign_sends", on_delete=models.CASCADE, null=True, blank=True
    )
    recipient_email = models.EmailField()
    recipient_name = models.CharField(max_length=150, blank=True, default="")

    status = models.CharField(max_length=15, choices=Status.choices, default=Status.QUEUED, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    bounce_reason = models.CharField(max_length=255, blank=True, default="")
    failure_reason = models.CharField(max_length=255, blank=True, default="")

    unsubscribe_token = models.CharField(max_length=64, unique=True, default=_generate_unsubscribe_token, editable=False)

    class Meta:
        ordering = ("-sent_at",)
        indexes = [
            models.Index(fields=["campaign", "status"]),
        ]

    def __str__(self):
        return f"{self.campaign_id} -> {self.recipient_email}"


class CampaignLinkClick(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign_send = models.ForeignKey(CampaignSend, related_name="link_clicks", on_delete=models.CASCADE)
    link_url = models.URLField(max_length=1000)
    clicked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-clicked_at",)

    def __str__(self):
        return f"{self.campaign_send_id} -> {self.link_url}"


class EmailUnsubscribe(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    organisation = models.ForeignKey(
        Company, related_name="email_unsubscribes", on_delete=models.SET_NULL, null=True, blank=True
    )
    unsubscribed_at = models.DateTimeField(auto_now_add=True)
    source_campaign = models.ForeignKey(
        EmailCampaign, related_name="unsubscribes", on_delete=models.SET_NULL, null=True, blank=True
    )
    reason = models.CharField(max_length=255, blank=True, default="")

    def __str__(self):
        return self.email
