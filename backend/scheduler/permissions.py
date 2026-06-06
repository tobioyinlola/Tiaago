from django.contrib.auth import get_user_model
from rest_framework import permissions

User = get_user_model()

class IsScheduledByCompanyOrTalent(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.user_type == User.USER_TYPE.TALENT:
            try:
                talent = user.profile
                return obj.talent == talent
            except User.profile.RelatedObjectDoesNotExist:
                return False
        elif user.user_type == User.USER_TYPE.COMPANY_REP:
            try:
                company_rep = user.company
                return obj.company == company_rep
            except User.company.RelatedObjectDoesNotExist:
                return False
        else:
            return False