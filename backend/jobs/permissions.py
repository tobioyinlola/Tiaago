from rest_framework import permissions
from create_user.models import CustomUser
from create_user.permissions import get_user_company


class IsJobCreatorOrReadOnly(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.user.is_staff:
            return True

        company = get_user_company(request.user)
        if not company:
            return False

        return obj.company == company


class IsJobApplicationCompanyOrTalentApplicant(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.user_type == CustomUser.USER_TYPE.TALENT:
            try:
                talent = request.user.profile
                return obj.applicant == talent
            except CustomUser.profile.RelatedObjectDoesNotExist:
                return False

        company = get_user_company(user)
        if company:
            return obj.job.company == company

        return user.is_staff


class IsJobApplicationCompany(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff:
            return True

        company = get_user_company(user)
        if company:
            return obj.job.company == company

        return False
