from create_user.models import Company
from payments.models import TiaagoPricing
from jobs.models import TalentScreening


def get_latest_tiaago_pricing():
    return TiaagoPricing.objects.order_by("-created_at").first()


def startup_has_exceeded_free_candidate_screening(startup: Company):
    """Helper function to check if a company has exceeded its free screenings"""
    tiaago_pricing = get_latest_tiaago_pricing()
    return (
        TalentScreening.objects.prefetch_related("job_application__job__company")
        .filter(job_application__job__company=startup)
        .count()
        >= tiaago_pricing.free_candidate_screening_count
    )
