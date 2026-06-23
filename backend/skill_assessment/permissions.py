from rest_framework import permissions
from create_user.permissions import get_user_company


class IsCreator(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        company = get_user_company(request.user)
        if not company:
            return False
        return company == obj.company


class IsTalentOwnerOrStaffUser(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff:
            return True
        if user.is_talent():
            try:
                return user.profile == obj.talent
            except Exception:
                return False
        return False