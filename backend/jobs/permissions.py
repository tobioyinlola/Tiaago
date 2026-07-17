from rest_framework import permissions
from create_user.models import CustomUser
from create_user.permissions import get_user_company


class IsJobCreatorOrReadOnly(permissions.BasePermission):
    """Gates JobRetrieveUpdateView/JobDeleteView -- the recruiter's own
    "manage this job" endpoints. Despite the name (kept for the two existing
    call sites), read access is NOT public here: this class only ever backs
    owner-facing views, so GET requires the same ownership check as writes.
    Public job viewing goes through JobDetailView/JobByTokenAPIView instead,
    which have their own, separately-scoped permissions."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
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
