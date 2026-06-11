from django.db import models


class ActiveObjectsManager(models.Manager):
    """Returns items that are not deleted"""

    # Filtering must live in get_queryset(): overriding only filter() lets
    # soft-deleted rows leak through .all(), .get(), .count(), aggregates, …
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    all_objects = models.Manager()
    objects = ActiveObjectsManager()

    class Meta:
        abstract = True
