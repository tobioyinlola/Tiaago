import secrets
import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

from create_user.models import Company
from segments.models import AudienceSegment
from tags.models import Tag
from talent_network.choices import (
    TalentNetworkIndustry,
    TalentNetworkRoleCategory,
    TalentNetworkWorkMode,
    TalentNetworkYearsExperience,
)


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
    class AudiencePool(models.TextChoices):
        COMPANY = "COMPANY", "Companies / recruiters"
        TALENT_NETWORK = "TALENT_NETWORK", "Talent Network"

    class AudienceType(models.TextChoices):
        ALL = "ALL", "All"
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

    # Which recipient universe this campaign draws from -- COMPANY uses
    # audience_type/audience_segment/audience_tag/manual_organisation_ids
    # below (unchanged from the original single-audience design). TALENT_NETWORK
    # uses the tn_* fields instead and sends via the platform's connected SMTP
    # (talent_network.models.TalentNetworkSmtpConfig) rather than Resend/Mailgun
    # -- see campaigns.audience/campaigns.tasks for the branch points.
    audience_pool = models.CharField(max_length=15, choices=AudiencePool.choices, default=AudiencePool.COMPANY)

    audience_type = models.CharField(max_length=10, choices=AudienceType.choices, null=True, blank=True)
    audience_segment = models.ForeignKey(
        AudienceSegment, related_name="campaigns", on_delete=models.SET_NULL, null=True, blank=True
    )
    audience_tag = models.ForeignKey(
        Tag, related_name="campaigns", on_delete=models.SET_NULL, null=True, blank=True
    )
    manual_organisation_ids = ArrayField(models.IntegerField(), default=list, blank=True)

    # Talent Network audience filters -- only meaningful when
    # audience_pool=TALENT_NETWORK. Mirror TalentNetworkMember's own fields
    # exactly (empty list/blank means "don't filter on this").
    tn_role_categories = ArrayField(
        models.CharField(max_length=30, choices=TalentNetworkRoleCategory.choices), default=list, blank=True
    )
    tn_industries = ArrayField(
        models.CharField(max_length=20, choices=TalentNetworkIndustry.choices), default=list, blank=True
    )
    tn_years_experience = ArrayField(
        models.CharField(max_length=10, choices=TalentNetworkYearsExperience.choices), default=list, blank=True
    )
    tn_work_type = models.CharField(max_length=10, choices=TalentNetworkWorkMode.choices, blank=True, default="")

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


class CampaignEmail(models.Model):
    """One email in a campaign's sequence. Every campaign has at least one
    (sequence_number=1, send_delay_type=IMMEDIATELY, condition_type=ALWAYS) --
    a "single blast" campaign is just a sequence of length 1, not a special
    case. subject/preview_text/from_name/reply_to are per-step overrides;
    blank subject/preview_text fall back to the linked EmailTemplate's own.

    Deliberately no from_email override: Resend (the primary provider, see
    utils.email_handler._send_via_resend) can only override the display
    name, not the sending address -- only the Mailgun fallback and the
    Talent Network Gmail path can actually change it, so exposing a field
    that silently no-ops on the primary send path would be misleading."""

    class SendDelayType(models.TextChoices):
        IMMEDIATELY = "IMMEDIATELY", "Immediately"
        DELAY_AFTER_PREVIOUS = "DELAY_AFTER_PREVIOUS", "After a delay"

    class ConditionType(models.TextChoices):
        ALWAYS = "ALWAYS", "Always"
        IF_PREVIOUS_OPENED = "IF_PREVIOUS_OPENED", "If previous email was opened"
        IF_PREVIOUS_NOT_OPENED = "IF_PREVIOUS_NOT_OPENED", "If previous email was not opened"
        IF_PREVIOUS_CLICKED = "IF_PREVIOUS_CLICKED", "If previous email was clicked"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SENDING = "SENDING", "Sending"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(EmailCampaign, related_name="emails", on_delete=models.CASCADE)
    sequence_number = models.PositiveSmallIntegerField()

    email_template = models.ForeignKey(
        EmailTemplate, related_name="campaign_emails", on_delete=models.SET_NULL, null=True, blank=True
    )
    subject = models.CharField(max_length=120, blank=True, default="")
    preview_text = models.CharField(max_length=160, blank=True, default="")
    from_name = models.CharField(max_length=100, blank=True, default="Tiaago")
    reply_to = models.EmailField(null=True, blank=True)

    send_delay_type = models.CharField(
        max_length=25, choices=SendDelayType.choices, default=SendDelayType.IMMEDIATELY
    )
    send_delay_hours = models.PositiveSmallIntegerField(null=True, blank=True)
    send_delay_days = models.PositiveSmallIntegerField(null=True, blank=True)
    condition_type = models.CharField(max_length=25, choices=ConditionType.choices, default=ConditionType.ALWAYS)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    # Denormalized counters, kept in step with CampaignSend writes -- avoids
    # a full aggregate query every time the builder/report page needs a
    # per-step summary.
    total_sent = models.PositiveIntegerField(default=0)
    total_opened = models.PositiveIntegerField(default=0)
    total_clicked = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sequence_number",)
        constraints = [
            models.UniqueConstraint(fields=["campaign", "sequence_number"], name="unique_campaign_sequence_number"),
        ]

    def __str__(self):
        return f"{self.campaign_id} -- email {self.sequence_number}"

    @property
    def delay_seconds(self):
        if self.send_delay_type != self.SendDelayType.DELAY_AFTER_PREVIOUS:
            return 0
        return (self.send_delay_days or 0) * 86400 + (self.send_delay_hours or 0) * 3600


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
    # Denormalized alongside campaign_email (always campaign_email.campaign,
    # set together at row-creation time) -- kept so every existing
    # whole-sequence aggregate (analytics, recipient_count, unsubscribe's
    # source_campaign) can keep filtering on `campaign` alone. campaign_email
    # is the new, purely additive per-step axis.
    campaign = models.ForeignKey(EmailCampaign, related_name="sends", on_delete=models.CASCADE)
    campaign_email = models.ForeignKey(CampaignEmail, related_name="sends", on_delete=models.CASCADE)
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
        constraints = [
            # Guards against double-dispatch: dispatch_scheduled_campaigns/
            # advance_sequence_steps only flip status once a task starts
            # executing, so a backed-up worker could see the same
            # (campaign_email, recipient) pair queued twice across ticks.
            models.UniqueConstraint(fields=["campaign_email", "recipient_email"], name="unique_campaign_email_recipient"),
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
