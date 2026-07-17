from django.core.cache import cache
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from create_user.models import CustomUser

PERMISSIONS_CACHE_TTL = 60  # matches the jwt_user cache TTL in create_user/authentication.py
SUPER_ADMIN_SLUG = "super_admin"


def _permissions_cache_key(user_id):
    return f"staff_permissions:{user_id}"


def get_staff_permissions(user) -> set:
    """Returns the set of permission slugs granted to a staff user, cached per-user."""
    if not user or not user.is_authenticated or user.user_type != CustomUser.USER_TYPE.STAFF:
        return set()

    cache_key = _permissions_cache_key(user.id)
    perms = cache.get(cache_key)
    if perms is None:
        role = getattr(user, "staff_role", None)
        perms = set(role.permissions.values_list("slug", flat=True)) if role else set()
        cache.set(cache_key, perms, PERMISSIONS_CACHE_TTL)
    return perms


def is_super_admin(user) -> bool:
    role = getattr(user, "staff_role", None)
    return bool(role and role.slug == SUPER_ADMIN_SLUG)


def invalidate_staff_permissions_cache(user_id):
    cache.delete(_permissions_cache_key(user_id))


def requirePermission(slug: str):
    """
    Factory returning a DRF BasePermission subclass, used exactly like the
    existing IsStaffUser/IsAdminUser classes:
        permission_classes = [requirePermission('organisations.view')]
    Super Admin always passes, bypassing the permission-set lookup entirely.
    A denied request raises PermissionDenied with a dict detail, which DRF
    serializes directly as the response body (no extra "detail" wrapping).
    """

    class _RequiresPermission(permissions.BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not bool(user and user.is_authenticated and user.user_type == CustomUser.USER_TYPE.STAFF):
                return False
            if is_super_admin(user):
                return True
            if slug not in get_staff_permissions(user):
                raise PermissionDenied({"error": "Access denied", "required_permission": slug})
            return True

    return _RequiresPermission
