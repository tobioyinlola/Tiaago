from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from create_user.models import CustomUser
from .tasks import sync_user_to_convertkit
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=CustomUser)
def sync_new_user_to_convertkit(sender, instance, created, **kwargs):
    """
    When a new user is created, sync their data to ConvertKit.
    This signal is registered when the marketing app is ready.
    """
    if created:
        # Avoid using hasattr() on reverse OneToOne relations — accessing
        # `instance.company` or `instance.profile` can raise
        # RelatedObjectDoesNotExist. Use a safe try/except check instead.
        try:
            has_company = bool(instance.company)
        except CustomUser.company.RelatedObjectDoesNotExist:
            has_company = False

        try:
            has_profile = bool(instance.profile)
        except CustomUser.profile.RelatedObjectDoesNotExist:
            has_profile = False

        # Prepare user metadata
        metadata = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "signup_date": instance.date_joined.isoformat() if instance.date_joined else None,
            "user_type": instance.get_user_type_display(),
            "profile_completed": has_profile or has_company,
        }

        # Determine which form to use based on user type
        form_id = (
            settings.CONVERTKIT_RECRUITER_FORM
            if instance.user_type == CustomUser.USER_TYPE.COMPANY_REP
            else settings.CONVERTKIT_CANDIDATE_FORM
        )

        # Only sync if form_id is configured
        if form_id:
            # Async task to sync user to ConvertKit
            try:
                sync_user_to_convertkit.delay(
                    email=instance.email,
                    form_id=form_id,
                    metadata=metadata
                )
                logger.info(f"Queued user {instance.email} for ConvertKit sync")
            except Exception as e:
                logger.error(f"Failed to queue ConvertKit sync for user {instance.email}: {str(e)}")
        else:
            logger.warning(f"ConvertKit form_id not configured. Skipping sync for user {instance.email}")