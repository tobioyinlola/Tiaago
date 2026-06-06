from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from create_user.models import CustomUser
from skill_assessment.models import (
    GeneralSkillAssessment,
    CandidateAssessmentSubmission
)
from .tasks import (
    handle_incomplete_assessment,
    handle_incomplete_profile,
    handle_resume_screening_passed,
)
import logging

logger = logging.getLogger(__name__)

class MarketingMiddleware:
    """
    Middleware to handle various marketing automation triggers.
    
    Note: This middleware may have performance implications if called on every request.
    Consider using scheduled Celery tasks instead for production.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only run checks on authenticated API requests
        if request.user.is_authenticated and hasattr(request, 'path'):
            # Skip checks for certain paths to avoid overhead
            skip_paths = ['/admin/', '/static/', '/media/', '/api/docs/']
            if not any(request.path.startswith(path) for path in skip_paths):
                try:
                    self._check_marketing_triggers(request.user)
                except Exception as e:
                    # Don't break the request if marketing checks fail
                    logger.error(f"Error in marketing middleware: {str(e)}")
        
        return response

    def _check_marketing_triggers(self, user):
        """
        Check all marketing automation triggers for a user.
        """
        if not user or not user.is_authenticated:
            return
        
        self._check_incomplete_assessment(user)
        self._check_incomplete_profile(user)
        # Note: Resume screening check should be done via signals, not middleware

    def _check_incomplete_assessment(self, user):
        """
        Check if user hasn't completed any assessment after 14 days.
        This could be expensive on every request - consider moving to a scheduled task.
        """
        if not user.is_talent():
            return
        try:
            _ = user.profile
        except CustomUser.profile.RelatedObjectDoesNotExist:
            return

        try:
            # Get user's profile
            profile = user.profile

            # Check for any completed assessments
            has_completed_assessment = CandidateAssessmentSubmission.objects.filter(
                candidate=profile,
                is_completed=True
            ).exists()

            if not has_completed_assessment:
                days_since_signup = (timezone.now() - user.date_joined).days if user.date_joined else 0
                if days_since_signup >= 14:
                    # Only trigger once per user - you might want to track this
                    handle_incomplete_assessment.delay(
                        email=user.email,
                        days_inactive=days_since_signup
                    )
                    logger.info(f"Triggered incomplete assessment check for user {user.email}")
        except Exception as e:
            logger.error(f"Error checking incomplete assessment for user {user.email}: {str(e)}")

    def _check_incomplete_profile(self, user):
        """
        Check if user hasn't completed their profile after 7 days.
        This could be expensive on every request - consider moving to a scheduled task.
        """
        if not user.is_talent():
            return
            
        try:
            # Check if user has profile (for talent users)
            try:
                _ = user.profile
                has_profile = True
            except CustomUser.profile.RelatedObjectDoesNotExist:
                has_profile = False

            if not has_profile:
                days_since_signup = (timezone.now() - user.date_joined).days if user.date_joined else 0
                if days_since_signup >= 7:
                    # Only trigger once per user - you might want to track this
                    handle_incomplete_profile.delay(email=user.email)
                    logger.info(f"Triggered incomplete profile check for user {user.email}")
        except Exception as e:
            logger.error(f"Error checking incomplete profile for user {user.email}: {str(e)}")