import string
import uuid

from django.db import models
from django.conf import settings
from django.utils.crypto import get_random_string

from base.models import TimeStampedModel
from create_user.models import Company

SHORT_CODE_CHARS = string.ascii_letters + string.digits


def generate_short_code():
    return get_random_string(7, SHORT_CODE_CHARS)


class PipelineCategory(TimeStampedModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="pipeline_categories",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_pipeline_categories",
    )

    class Meta:
        verbose_name_plural = "pipeline categories"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class PipelineInviteLink(TimeStampedModel):
    category = models.ForeignKey(
        PipelineCategory,
        on_delete=models.CASCADE,
        related_name="invite_links",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="pipeline_invite_links",
    )
    token = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    short_code = models.CharField(
        max_length=10, unique=True, default=generate_short_code, editable=False,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invite for {self.category.name} ({self.token})"


class PipelineCandidate(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        INTERESTED = "interested", "Interested"
        NOT_INTERESTED = "not-interested", "Not Interested"
        HIRED = "hired", "Hired"

    name = models.CharField(max_length=255)
    email = models.CharField(max_length=255, blank=True, default="")
    phone_number = models.CharField(max_length=50, blank=True, default="")
    role = models.CharField(max_length=255, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    years_of_expr = models.IntegerField(default=0)
    linkedin_profile = models.URLField(max_length=500, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    current_company = models.CharField(max_length=255, blank=True, default="")
    education = models.TextField(blank=True, default="")
    skills = models.JSONField(default=list)
    experience = models.JSONField(default=list)
    avatar = models.URLField(max_length=500, blank=True, default="")
    portfolio_url = models.URLField(blank=True, default="")
    resume = models.FileField(
        upload_to="pipeline_resumes/%Y/%m/%d/", blank=True, null=True,
    )
    experience_level = models.CharField(max_length=50, blank=True, default="")
    current_pay = models.CharField(max_length=50, blank=True, default="")
    pay_currency = models.CharField(max_length=10, blank=True, default="USD")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pipeline_entries",
    )
    invite_link = models.ForeignKey(
        PipelineInviteLink,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submissions",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    category = models.ForeignKey(
        PipelineCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="candidates",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="pipeline_candidates",
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="added_pipeline_candidates",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"


class GmailSmtpConfig(TimeStampedModel):
    company = models.OneToOneField(
        Company, on_delete=models.CASCADE, related_name="smtp_config",
    )
    gmail_address = models.EmailField()
    encrypted_app_password = models.TextField()
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"SMTP: {self.gmail_address} ({self.company})"

    @property
    def app_password(self):
        from utils.encryption import decrypt_value
        return decrypt_value(self.encrypted_app_password)

    @app_password.setter
    def app_password(self, value):
        from utils.encryption import encrypt_value
        self.encrypted_app_password = encrypt_value(value)


class OutreachEmail(TimeStampedModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    candidate = models.ForeignKey(
        PipelineCandidate, on_delete=models.CASCADE, related_name="outreach_emails",
    )
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="outreach_emails",
    )
    subject = models.CharField(max_length=500)
    body = models.TextField()
    recipient_email = models.EmailField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.QUEUED,
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    error_reason = models.TextField(blank=True, default="")
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Outreach to {self.recipient_email} ({self.status})"
