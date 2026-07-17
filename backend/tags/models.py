import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from create_user.models import Company


class Tag(models.Model):
    class TagType(models.TextChoices):
        SYSTEM = "SYSTEM", "System"
        CUSTOM = "CUSTOM", "Custom"

    class Category(models.TextChoices):
        LIFECYCLE = "LIFECYCLE", "Lifecycle"
        WALLET = "WALLET", "Wallet & spend"
        SCREENING = "SCREENING", "Screening usage"
        ASSESSMENT = "ASSESSMENT", "Assessment usage"
        PIPELINE = "PIPELINE", "Pipeline"
        TEAM = "TEAM", "Team"
        ENGAGEMENT = "ENGAGEMENT", "Engagement"
        CUSTOM = "CUSTOM", "Custom"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    description = models.CharField(max_length=255, blank=True, default="")
    colour = models.CharField(max_length=7, default="#6B7280", help_text="Hex colour, e.g. #6B7280")
    tag_type = models.CharField(max_length=10, choices=TagType.choices)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.CUSTOM)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_tags",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            n = 1
            while Tag.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base_slug}-{n}"
            self.slug = slug
        super().save(*args, **kwargs)


class OrganisationTag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(Company, related_name="organisation_tags", on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, related_name="organisation_tags", on_delete=models.CASCADE)
    applied_at = models.DateTimeField(auto_now_add=True)
    removed_at = models.DateTimeField(null=True, blank=True)
    applied_by_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="applied_organisation_tags",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Set for manually-applied (custom) tags; null for system-rule-engine applications.",
    )

    class Meta:
        indexes = [
            models.Index(fields=["tag", "removed_at"]),
            models.Index(fields=["organisation", "removed_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["organisation", "tag"],
                condition=models.Q(removed_at__isnull=True),
                name="unique_active_organisation_tag",
            )
        ]

    def __str__(self):
        return f"{self.organisation_id} - {self.tag.slug}"


class TagAuditLog(models.Model):
    class Action(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        REMOVED = "REMOVED", "Removed"

    class TriggeredBy(models.TextChoices):
        SYSTEM_CRON = "SYSTEM_CRON", "System cron"
        ADMIN_MANUAL = "ADMIN_MANUAL", "Admin manual"
        IMPORT = "IMPORT", "Import"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(Company, related_name="tag_audit_logs", on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, related_name="audit_logs", on_delete=models.CASCADE)
    action = models.CharField(max_length=10, choices=Action.choices)
    triggered_by = models.CharField(max_length=15, choices=TriggeredBy.choices)
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="tag_audit_actions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=255, blank=True, default="")
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-occurred_at",)
        indexes = [
            models.Index(fields=["organisation", "occurred_at"]),
        ]

    def __str__(self):
        return f"{self.action} {self.tag.slug} on {self.organisation_id}"
