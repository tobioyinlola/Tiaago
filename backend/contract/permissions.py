from rest_framework import permissions
from create_user.models import CustomUser

class IsContractByCompanyOruserPermission(permissions.BasePermission):
    '''Permission to check if a talent or company are involved in this contract'''
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.user_type == CustomUser.USER_TYPE.TALENT:
            try:
                talent = request.user.profile
                return obj.talent == talent
            except CustomUser.profile.RelatedObjectDoesNotExist:
                return False
        elif user.user_type == CustomUser.USER_TYPE.COMPANY_REP:
            try:
                company = request.user.company
                return obj.company == company
            except CustomUser.company.RelatedObjectDoesNotExist:
                return False
        else:
            return True