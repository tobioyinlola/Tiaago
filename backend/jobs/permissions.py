from rest_framework import permissions
from create_user.models import CustomUser


class IsJobCreatorOrReadOnly(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.user.is_staff:
            return True

        try:
            company = request.user.company
        except CustomUser.company.RelatedObjectDoesNotExist:
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
        elif user.user_type == CustomUser.USER_TYPE.COMPANY_REP:
            try:
                company = request.user.company
                return obj.job.company == company
            except CustomUser.company.RelatedObjectDoesNotExist:
                return False
        else:
            return True


class IsJobApplicationCompany(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.user_type == CustomUser.USER_TYPE.COMPANY_REP:
            try:
                company = request.user.company
                return obj.job.company == company
            except CustomUser.company.RelatedObjectDoesNotExist:
                return False
        return False
