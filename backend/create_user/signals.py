from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Company, CompanyTeamMember, TalentProfile
from .utils import generate_referral_code

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
