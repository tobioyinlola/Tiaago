from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TalentProfile
from .utils import generate_referral_code 

@receiver(post_save, sender=TalentProfile)
def assign_referral_code(sender, instance, created, **kwargs):
    if created and not instance.referral_code:
        instance.referral_code = generate_referral_code()
        instance.save()
