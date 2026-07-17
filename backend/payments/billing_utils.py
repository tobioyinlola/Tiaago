from create_user.models import Company
from payments.models import TiaagoPricing
from jobs.models import TalentScreening


def get_latest_tiaago_pricing():
    return TiaagoPricing.objects.order_by("-created_at").first()


def recruiter_has_exceeded_free_candidate_screening(recruiter: Company):
    """Helper function to check if a company has exceeded its free screenings"""
    tiaago_pricing = get_latest_tiaago_pricing()
    if not tiaago_pricing:
        # No TiaagoPricing configured yet: default to the free tier so we neither
        # bill the recruiter nor crash the caller. Without this guard a missing pricing
        # row raises AttributeError and stalls the resume-analysis sweeper.
        return False
    return (
        TalentScreening.objects.prefetch_related("job_application__job__company")
        .filter(job_application__job__company=recruiter)
        .count()
        >= tiaago_pricing.free_candidate_screening_count
    )
