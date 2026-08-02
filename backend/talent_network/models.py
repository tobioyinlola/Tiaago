import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.db import models

from base.models import TimeStampedModel

from .choices import (
    TalentNetworkCommunity,
    TalentNetworkEmailFrequency,
    TalentNetworkIndustry,
    TalentNetworkMemberStatus,
    TalentNetworkRoleCategory,
    TalentNetworkWorkMode,
    TalentNetworkYearsExperience,
)


class TalentNetworkMember(TimeStampedModel):
    """A professional who opted into the Talent Network -- see
    talent_network.matching.score_member_for_job for how these fields are
    compared against a published Job to decide who gets notified."""

    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True, default="")

    country = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")

    job_title = models.CharField(max_length=255, blank=True, default="")
    years_experience = models.CharField(max_length=10, choices=TalentNetworkYearsExperience.choices)
    industry = ArrayField(
        models.CharField(max_length=20, choices=TalentNetworkIndustry.choices), default=list, blank=True
    )
    interested_roles = ArrayField(
        models.CharField(max_length=30, choices=TalentNetworkRoleCategory.choices), default=list, blank=True
    )
    preferred_work_type = models.CharField(max_length=10, choices=TalentNetworkWorkMode.choices)
    preferred_locations = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    communities = ArrayField(
        models.CharField(max_length=30, choices=TalentNetworkCommunity.choices), default=list, blank=True
    )
    other_community = models.CharField(max_length=255, blank=True, default="")

    email_frequency = models.CharField(
        max_length=15, choices=TalentNetworkEmailFrequency.choices, default=TalentNetworkEmailFrequency.IMMEDIATE
    )
    consent = models.BooleanField(default=False)
    status = models.CharField(
        max_length=25, choices=TalentNetworkMemberStatus.choices, default=TalentNetworkMemberStatus.PENDING_CONFIRMATION
    )

    last_email_sent = models.DateTimeField(null=True, blank=True)
    last_opened = models.DateTimeField(null=True, blank=True)
    unsubscribe_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    confirmation_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        indexes = [
            models.Index(fields=["country"]),
            GinIndex(fields=["interested_roles"]),
            GinIndex(fields=["communities"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} <{self.email}>"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class JobMatchNotification(TimeStampedModel):
    """One row per (job, member) match above the notification threshold --
    tracks the whole email funnel (sent -> delivered -> opened -> clicked ->
    applied) for analytics. See talent_network.matching for how match_score
    and matched_criteria are computed."""

    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        SENT = "SENT", "Sent"
        DELIVERED = "DELIVERED", "Delivered"
        OPENED = "OPENED", "Opened"
        CLICKED = "CLICKED", "Clicked"
        APPLIED = "APPLIED", "Applied"
        FAILED = "FAILED", "Failed"

    class SendChannel(models.TextChoices):
        COMPANY_GMAIL = "COMPANY_GMAIL", "Company's connected Gmail"
        PLATFORM_DEFAULT = "PLATFORM_DEFAULT", "Platform default sender"

    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="talent_network_notifications")
    member = models.ForeignKey(TalentNetworkMember, on_delete=models.CASCADE, related_name="job_notifications")

    match_score = models.PositiveSmallIntegerField(help_text="0-100")
    matched_criteria = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED)
    send_channel = models.CharField(max_length=20, choices=SendChannel.choices, blank=True, default="")
    error_reason = models.TextField(blank=True, default="")

    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    applied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["job", "member"], name="unique_job_match_per_member")
        ]
        indexes = [
            models.Index(fields=["job"]),
            models.Index(fields=["member"]),
            models.Index(fields=["status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.member_id} x {self.job_id} ({self.match_score}%, {self.status})"


class TalentNetworkAuditLog(models.Model):
    """Append-only audit trail for every consequential Talent Network
    mutation -- see talent_network.audit.log_audit()."""

    class Action(models.TextChoices):
        SIGNUP = "SIGNUP", "Signup"
        CONFIRM = "CONFIRM", "Confirm"
        UNSUBSCRIBE = "UNSUBSCRIBE", "Unsubscribe"
        DEACTIVATE = "DEACTIVATE", "Deactivate"
        REACTIVATE = "REACTIVATE", "Reactivate"
        DELETE = "DELETE", "Delete"
        EXPORT_CSV = "EXPORT_CSV", "Export CSV"
        JOB_MATCH_SENT = "JOB_MATCH_SENT", "Job match notification sent"
        SETTINGS_UPDATE = "SETTINGS_UPDATE", "Settings update"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Null for system/automated actions (e.g. a Celery-triggered match send)",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    target_member = models.ForeignKey(
        TalentNetworkMember, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_entries"
    )
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["action"]), models.Index(fields=["target_member"])]

    def __str__(self):
        return f"{self.action} ({self.target_member_id}) @ {self.created_at:%Y-%m-%d %H:%M}"


class TalentNetworkSmtpConfig(TimeStampedModel):
    """Platform-wide Gmail App Password SMTP connection used to send Talent
    Network emails (the double opt-in confirmation, and the platform-default
    path for job-match notifications when a company hasn't connected its own
    Gmail) -- same mechanism as sourcing.models.GmailSmtpConfig, just not
    scoped to a company since the Talent Network isn't owned by any one
    recruiter. Configured from Admin > Settings. Singleton by convention --
    the admin UI only ever creates/updates a single row (see
    talent_network.views.TalentNetworkSmtpConfigView)."""

    gmail_address = models.EmailField()
    encrypted_app_password = models.TextField()
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Talent Network SMTP: {self.gmail_address}"

    @property
    def app_password(self):
        from utils.encryption import decrypt_value
        return decrypt_value(self.encrypted_app_password)

    @app_password.setter
    def app_password(self, value):
        from utils.encryption import encrypt_value
        self.encrypted_app_password = encrypt_value(value)


class TalentNetworkPageView(models.Model):
    """One row per (session, day) on the public /talent-network join page --
    same coarse (session_key, visited_date) dedup as analytics.PageView, kept
    as its own model so this app's page-view count is independent of (and
    never risks regressing) the separate site-wide visit tracker."""

    session_key = models.CharField(max_length=64, db_index=True)
    visited_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["session_key", "visited_date"], name="unique_tn_session_per_day")
        ]
        indexes = [models.Index(fields=["visited_date"])]

    def __str__(self):
        return f"{self.session_key} @ {self.visited_date}"
