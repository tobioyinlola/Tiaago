from rest_framework import permissions
from .models import TalentCaseStudyProject

class IsCaseStudyAttemptedByTalent(permissions.BasePermission):
    '''Permission to check if the case study was taken by the talent'''
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.talent == request.user.profile