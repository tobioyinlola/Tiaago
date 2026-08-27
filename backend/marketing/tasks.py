from celery import shared_task
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from create_user.models import CustomUser
from skill_assessment.models import CandidateAssessmentSubmission
from .convertkit import ConvertKitAPI, ConvertKitNotConfigured
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_user_to_convertkit(self, email: str, form_id: str, metadata: Dict[str, Any]) -> Dict:
    """
    Synchronize user data with ConvertKit via their API.
    This task can be retried up to 3 times if it fails.
    
    Args:
        email: User's email address
        form_id: ConvertKit form ID to subscribe to
        metadata: Dictionary of user data and custom fields
        
    Returns:
        Dict: Response from ConvertKit API
    """
    try:
        api = ConvertKitAPI()
        response = api.subscribe_to_form(email, form_id, metadata)
        logger.info(f"Successfully synced user {email} to ConvertKit form {form_id}")
        return response
    except ConvertKitNotConfigured as exc:
        # Config problem, not a transient one -- retrying 3 times cannot
        # set an env var, it just multiplies the log noise.
        logger.warning("Skipping ConvertKit call: %s", exc)
        return {}
    except Exception as exc:
        logger.error(f"Failed to sync user {email} to ConvertKit: {str(exc)}")
        # Retry after 5 minutes
        raise self.retry(exc=exc, countdown=60 * 5)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def tag_user_in_convertkit(self, email: str, tag_id: str, metadata: Optional[Dict[str, Any]] = None) -> Dict:
    """
    Add a tag to a user in ConvertKit.
    This task can be retried up to 3 times if it fails.
    
    Args:
        email: User's email address
        tag_id: ConvertKit tag ID to add
        metadata: Optional additional user data
        
    Returns:
        Dict: Response from ConvertKit API
    """
    try:
        api = ConvertKitAPI()
        response = api.add_tag_to_subscriber(email, tag_id, metadata)
        logger.info(f"Successfully added tag {tag_id} to user {email} in ConvertKit")
        return response
    except ConvertKitNotConfigured as exc:
        # Config problem, not a transient one -- retrying 3 times cannot
        # set an env var, it just multiplies the log noise.
        logger.warning("Skipping ConvertKit call: %s", exc)
        return {}
    except Exception as exc:
        logger.error(f"Failed to add tag {tag_id} to user {email} in ConvertKit: {str(exc)}")
        # Retry after 5 minutes
        raise self.retry(exc=exc, countdown=60 * 5)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def handle_incomplete_assessment(self, email: str, days_inactive: int) -> Dict:
    """
    Handle users who haven't completed their assessment after a certain period.
    Adds them to the incomplete assessment tag in ConvertKit.
    
    Args:
        email: User's email address
        days_inactive: Number of days the user has been inactive
        
    Returns:
        Dict: Response from ConvertKit API
    """
    try:
        api = ConvertKitAPI()
        tag_id = settings.CONVERTKIT_INCOMPLETE_ASSESSMENT_TAG
        response = api.add_tag_to_subscriber(email, tag_id)
        logger.info(f"Tagged user {email} for incomplete assessment after {days_inactive} days")
        return response
    except ConvertKitNotConfigured as exc:
        # Config problem, not a transient one -- retrying 3 times cannot
        # set an env var, it just multiplies the log noise.
        logger.warning("Skipping ConvertKit call: %s", exc)
        return {}
    except Exception as exc:
        logger.error(f"Failed to tag user {email} for incomplete assessment: {str(exc)}")
        # Retry after 5 minutes
        raise self.retry(exc=exc, countdown=60 * 5)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def handle_incomplete_profile(self, email: str) -> Dict:
    """
    Handle users who haven't completed their profile.
    Adds them to the incomplete profile tag in ConvertKit.
    
    Args:
        email: User's email address
        
    Returns:
        Dict: Response from ConvertKit API
    """
    try:
        api = ConvertKitAPI()
        tag_id = settings.CONVERTKIT_INCOMPLETE_PROFILE_TAG
        response = api.add_tag_to_subscriber(email, tag_id)
        logger.info(f"Tagged user {email} for incomplete profile")
        return response
    except ConvertKitNotConfigured as exc:
        # Config problem, not a transient one -- retrying 3 times cannot
        # set an env var, it just multiplies the log noise.
        logger.warning("Skipping ConvertKit call: %s", exc)
        return {}
    except Exception as exc:
        logger.error(f"Failed to tag user {email} for incomplete profile: {str(exc)}")
        # Retry after 5 minutes
        raise self.retry(exc=exc, countdown=60 * 5)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def handle_resume_screening_passed(self, email: str) -> Dict:
    """
    Handle users who passed resume screening but didn't proceed to skill assessment.
    Adds them to the resume screening passed tag in ConvertKit.
    
    Args:
        email: User's email address
        
    Returns:
        Dict: Response from ConvertKit API
    """
    try:
        api = ConvertKitAPI()
        tag_id = settings.CONVERTKIT_RESUME_SCREENING_PASSED_TAG
        response = api.add_tag_to_subscriber(email, tag_id)
        logger.info(f"Tagged user {email} for passing resume screening")
        return response
    except ConvertKitNotConfigured as exc:
        # Config problem, not a transient one -- retrying 3 times cannot
        # set an env var, it just multiplies the log noise.
        logger.warning("Skipping ConvertKit call: %s", exc)
        return {}
    except Exception as exc:
        logger.error(f"Failed to tag user {email} for passing resume screening: {str(exc)}")
        # Retry after 5 minutes
        raise self.retry(exc=exc, countdown=60 * 5)

@shared_task
def batch_check_incomplete_assessments():
    """
    Scheduled task to check all users who haven't completed assessments after 14 days.
    This should be run daily via Celery Beat.
    
    Returns:
        int: Number of users tagged
    """
    logger.info("Starting batch check for incomplete assessments...")
    tagged_count = 0
    
    # Get all talent users
    talent_users = CustomUser.objects.filter(user_type=CustomUser.USER_TYPE.TALENT)
    
    for user in talent_users:
        try:
            # Skip if user doesn't have a profile
            try:
                profile = user.profile
            except CustomUser.profile.RelatedObjectDoesNotExist:
                continue
            
            # Check for any completed assessments
            has_completed_assessment = CandidateAssessmentSubmission.objects.filter(
                candidate=profile,
                is_completed=True
            ).exists()
            
            # If no completed assessment and user signed up 14+ days ago
            if not has_completed_assessment:
                days_since_signup = (timezone.now() - user.date_joined).days if user.date_joined else 0
                if days_since_signup >= 14:
                    handle_incomplete_assessment.delay(
                        email=user.email,
                        days_inactive=days_since_signup
                    )
                    tagged_count += 1
        except Exception as e:
            logger.error(f"Error processing user {user.email} for incomplete assessment: {str(e)}")
    
    logger.info(f"Batch check complete. Tagged {tagged_count} users for incomplete assessments.")
    return tagged_count

@shared_task
def batch_check_incomplete_profiles():
    """
    Scheduled task to check all users who haven't completed their profile after 7 days.
    This should be run daily via Celery Beat.
    
    Returns:
        int: Number of users tagged
    """
    logger.info("Starting batch check for incomplete profiles...")
    tagged_count = 0
    
    # Get all talent users
    talent_users = CustomUser.objects.filter(user_type=CustomUser.USER_TYPE.TALENT)
    
    for user in talent_users:
        try:
            # Check if user has profile
            try:
                _ = user.profile
                has_profile = True
            except CustomUser.profile.RelatedObjectDoesNotExist:
                has_profile = False

            # If no profile and user signed up 7+ days ago
            if not has_profile:
                days_since_signup = (timezone.now() - user.date_joined).days if user.date_joined else 0
                if days_since_signup >= 7:
                    handle_incomplete_profile.delay(email=user.email)
                    tagged_count += 1
        except Exception as e:
            logger.error(f"Error processing user {user.email} for incomplete profile: {str(e)}")
    
    logger.info(f"Batch check complete. Tagged {tagged_count} users for incomplete profiles.")
    return tagged_count