from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction
import logging

from create_user.models import Referral, ReferralWallet, WithdrawalRequest
from skill_assessment.models import SkillAssessmentPayment
from .services import ReferralRewardService

logger = logging.getLogger(__name__)

REFERRAL_REWARD_AMOUNT = Decimal('1000.00')


@receiver(post_save, sender=SkillAssessmentPayment)
def credit_referral_reward_on_assessment_payment(sender, instance, created, **kwargs):
    """
    Automatically credit referral reward when:
    1. Assessment payment is marked as paid (is_paid=True)
    2. User was referred
    3. Reward hasn't been paid yet
    
    Note: The service method checks if reward was already given, so this is safe
    to call multiple times.
    """
    # Only process when payment is marked as paid
    if not instance.is_paid:
        return
    

    update_fields = kwargs.get('update_fields')
    if update_fields is not None and 'is_paid' not in update_fields:
        return
    
    try:
        # Get the talent who paid for the assessment
        talent = instance.talent
        user = talent.user
        
        # Check if user was referred
        if not talent.referred_by:
            return
        
        try:
            referral = Referral.objects.get(
                invitee=user,
                has_received_reward=False
            )
        except Referral.DoesNotExist:
            # User was not referred or already rewarded
            logger.debug(f"User {user.email} was not referred or already rewarded")
            return
        except Referral.MultipleObjectsReturned:
            referral = Referral.objects.filter(
                invitee=user,
                has_received_reward=False
            ).first()
            if not referral:
                return
        
    
        success, message, wallet_transaction = ReferralRewardService.credit_referral_reward(
            referral_obj=referral
        )
        
        if success:
            logger.info(f"✓ Referral reward credited: {message} for user {user.email} (referrer: {referral.inviter.user.email})")
        else:
            logger.warning(f"✗ Referral reward failed: {message} for user {user.email}")
            
    except Exception as e:
        logger.error(f"⚠ Error processing referral reward: {str(e)}", exc_info=True)

