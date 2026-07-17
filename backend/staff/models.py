import uuid

from django.conf import settings
from django.db import models


class StaffPermission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    group = models.CharField(max_length=50)
    description = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("group", "name")

    def __str__(self):
        return self.slug


class StaffRole(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True, default="")
    is_system_role = models.BooleanField(default=False)
    permissions = models.ManyToManyField(
        StaffPermission, through="StaffRolePermission", related_name="roles", blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class StaffRolePermission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(StaffRole, related_name="role_permissions", on_delete=models.CASCADE)
    permission = models.ForeignKey(StaffPermission, related_name="permission_roles", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("role", "permission")

    def __str__(self):
        return f"{self.role.slug} - {self.permission.slug}"


class StaffActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="staff_activity_logs", on_delete=models.SET_NULL, null=True
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=50, blank=True, default="")
    target_id = models.CharField(max_length=64, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["action", "created_at"]),
        ]

    def __str__(self):
        return f"{self.action} by {self.actor_id}"
