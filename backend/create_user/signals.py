from django.contrib.auth.signals import user_logged_in
from django.core.cache import cache
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Company, CompanyTeamMember, CustomUser, TalentProfile
from .utils import generate_referral_code


@receiver(post_save, sender=CustomUser)
@receiver(post_save, sender=Company)
@receiver(post_save, sender=TalentProfile)
def invalidate_cached_authenticated_user(sender, instance, **kwargs):
    """Profile writes must be visible on the next authenticated request."""
    user_id = (
        instance.pk if sender is CustomUser else
        instance.company_rep_id if sender is Company else instance.user_id
    )

    def invalidate():
        try:
            cache.delete(f"jwt_user:{user_id}")
        except Exception:
            # Authentication already tolerates an unavailable cache.
            pass

    transaction.on_commit(invalidate)

@receiver(post_save, sender=TalentProfile)
def assign_referral_code(sender, instance, created, **kwargs):
    if created and not instance.referral_code:
        instance.referral_code = generate_referral_code()
        instance.save()


@receiver(user_logged_in)
def evaluate_tags_on_login(sender, request, user, **kwargs):
    from tags.tasks import evaluate_company_tags

    company_ids = set(Company.objects.filter(company_rep=user).values_list("id", flat=True))
    company_ids.update(CompanyTeamMember.objects.filter(user=user).values_list("company_id", flat=True))
    for company_id in company_ids:
        evaluate_company_tags.delay(company_id)
