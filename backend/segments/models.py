import uuid

from django.conf import settings
from django.db import models


class AudienceSegment(models.Model):
    class MatchType(models.TextChoices):
        ALL = "ALL", "Match all conditions"
        ANY = "ANY", "Match any condition"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=255, blank=True, default="")
    # Each condition: {"type": "has_tag"|"does_not_have_tag", "tag_slug": "..."}
    # or {"type": "property", "field": "...", "operator": "eq|neq|gt|gte|lt|lte|contains|not_contains", "value": ...}
    conditions = models.JSONField(default=list)
    match_type = models.CharField(max_length=3, choices=MatchType.choices, default=MatchType.ALL)
    estimated_size = models.PositiveIntegerField(default=0)
    last_evaluated_at = models.DateTimeField(null=True, blank=True)
    created_by_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_segments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self):
        return self.name
