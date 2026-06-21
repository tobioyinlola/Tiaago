from rest_framework import permissions
from subscriptions.models import SubPlan

from create_user.models import CustomUser

class IsUserVerified(permissions.BasePermission):
    """ is the user verified? """

    message = "You are not verified"
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.verified) 


class HasBasicSubscription(permissions.BasePermission):
    """does the user has basic subscription? """

    message = "You need a basic subscription to access this feature"

    def has_permission(self, request, view):
        user = request.user
        if not bool(user and user.is_authenticated):
            return False
        try:
            allowed = user.subscription.sub_plan.sub_type == SubPlan.SUB_TYPE.BASIC
        except CustomUser.subscription.RelatedObjectDoesNotExist:
            allowed = False

        return bool(allowed)
    
class HasPremiumSubscription(permissions.BasePermission):
    """does the user has premium subscription? """

    message = "You are not subscribed to premium plan"

    def has_permission(self, request, view):
        user = request.user
        if not bool(user and user.is_authenticated):
            return False
        try:
            allowed = user.subscription.sub_plan.sub_type == SubPlan.SUB_TYPE.PREMIUM
        except CustomUser.subscription.RelatedObjectDoesNotExist:
            allowed = False

        return bool(allowed)


class IsTalentUser(permissions.BasePermission):
    """ is the user talent? """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        return bool(request.user.user_type == CustomUser.USER_TYPE.TALENT)

class IsTalentOrStaffUser(permissions.BasePermission):
    """ is the user a talent or staff? """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        accepted = (request.user.user_type == CustomUser.USER_TYPE.TALENT) \
            or (request.user.user_type == CustomUser.USER_TYPE.STAFF)
        return bool(accepted)

class IsCompanyRepUser(permissions.BasePermission):
    """ is the user a company representative """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        return bool(request.user.user_type == CustomUser.USER_TYPE.COMPANY_REP)

class IsCompanyRepOrStaffUser(permissions.BasePermission):
    """ is the user a company representative or staff? """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        accepted = (request.user.user_type == CustomUser.USER_TYPE.COMPANY_REP) \
            or (request.user.user_type == CustomUser.USER_TYPE.STAFF)
        return bool(accepted)

class IsCompanyRepOrTalentUser(permissions.BasePermission):
    """ is the user a talent or company representative? """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        accepted = (request.user.user_type == CustomUser.USER_TYPE.COMPANY_REP) \
            or (request.user.user_type == CustomUser.USER_TYPE.TALENT)
        return bool(accepted)

class IsStaffUser(permissions.BasePermission):
    """ is the user a staff? """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        return bool(request.user.user_type == CustomUser.USER_TYPE.STAFF)
    
class IsStaffUserOrCompanyRepOrTalentUser(permissions.BasePermission):
    """is the user a talent or company rep or staff"""
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        accepted = (request.user.user_type == CustomUser.USER_TYPE.COMPANY_REP) \
            or (request.user.user_type == CustomUser.USER_TYPE.TALENT) or \
            (request.user.user_type == CustomUser.USER_TYPE.STAFF)
        return bool(accepted)


class IsCompanyTeamAdmin(permissions.BasePermission):
    """Only allows access to users who are admins of their company team."""

    message = "Only company admins can access this resource."

    def has_permission(self, request, view):
        from create_user.models import CompanyTeamMember, Company

        if not bool(request.user and request.user.is_authenticated):
            return False

        membership = CompanyTeamMember.objects.filter(user=request.user).first()
        if not membership:
            # Auto-promote company owner to admin (matches existing behavior)
            company = Company.objects.filter(company_rep=request.user).first()
            if company:
                membership = CompanyTeamMember.objects.create(
                    company=company, user=request.user, role=CompanyTeamMember.ROLE.ADMIN
                )
        if not membership:
            return False
        return membership.role == CompanyTeamMember.ROLE.ADMIN