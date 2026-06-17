import uuid

from django.db import models
from django.conf import settings

from base.models import TimeStampedModel
from create_user.models import Company


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
