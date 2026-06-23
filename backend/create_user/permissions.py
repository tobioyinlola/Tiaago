from rest_framework import permissions
from django.shortcuts import get_object_or_404

from .models import CompanyTeamMember, Company


def get_company_membership(user, company):
    """
    Return CompanyTeamMember instance or None.
    Treat company.company_rep as implicit ADMIN.
    """
    if not user or not user.is_authenticated:
        return None

    try:
        if hasattr(company, "company_rep") and company.company_rep_id == user.id:
            # Return a lightweight CompanyTeamMember-like object
            return CompanyTeamMember(company=company, user=user, role=CompanyTeamMember.ROLE.ADMIN, invited_by=user)
    except Exception:
        pass

    try:
        return CompanyTeamMember.objects.get(company=company, user=user)
    except CompanyTeamMember.DoesNotExist:
        return None


def user_is_company_role(user, company, roles):
    """
    Check if `user` has one of the given `roles` for `company`.
    `roles` should be an iterable of role string values (e.g. ['admin','recruiter']).
    """
    membership = get_company_membership(user, company)
    if not membership:
        return False
    return membership.role in roles


class IsCompanyAdmin(permissions.BasePermission):
    message = "Only company admins may perform this action."

    def has_permission(self, request, view):
        company = getattr(request.user, "company", None)
        if not company:
            company_id = view.kwargs.get("company_id") or request.data.get("company_id")
            if company_id:
                try:
                    company = get_object_or_404(Company, id=company_id)
                except Exception:
                    company = None
        return bool(company and user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN]))


class IsCompanyRecruiterOrAdmin(permissions.BasePermission):
    message = "Only company recruiters or admins may perform this action."

    def has_permission(self, request, view):
        company = getattr(request.user, "company", None)
        if not company:
            company_id = view.kwargs.get("company_id") or request.data.get("company_id")
            if company_id:
                try:
                    company = get_object_or_404(Company, id=company_id)
                except Exception:
                    company = None
        return bool(company and user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]))


class IsCompanyViewerOrAbove(permissions.BasePermission):
    message = "You must be a member of the company team to access this resource."

    def has_permission(self, request, view):
        company = getattr(request.user, "company", None)
        if not company:
            company_id = view.kwargs.get("company_id") or request.data.get("company_id")
            if company_id:
                try:
                    company = get_object_or_404(Company, id=company_id)
                except Exception:
                    company = None
        return bool(company and get_company_membership(request.user, company) is not None)


def get_user_company(user):
    """Resolve a user's company: CompanyTeamMember first (handles invited
    team members), then direct company_rep FK as fallback.
    Returns the Company instance or None."""
    if not user or not user.is_authenticated:
        return None
    membership = CompanyTeamMember.objects.filter(
        user=user
    ).select_related("company").first()
    if membership:
        return membership.company
    return getattr(user, "company", None)