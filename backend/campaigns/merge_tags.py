"""Per-recipient merge tag value resolution -- queried live from that
organisation's current data immediately before sending, per the spec's
requirement that merge tags reflect live state (not a stale cached value).
This is intentionally a per-recipient set of small queries (not a bulk map
like tags.signals) since sends already happen in batches of 50 with a
1-second delay between batches; it is not the hot path the tag rule engine's
performance requirement was aimed at, but would be worth bulk-optimizing the
same way if campaign audiences grow into the thousands.
"""

from jobs.models import Job
from skill_assessment.models import GeneralSkillAssessment, ResumeAnalysis
from sourcing.models import PipelineCandidate
from django.utils import timezone


def build_merge_context(company, recipient_name):
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    try:
        wallet_balance = float(company.wallet.balance)
    except Exception:
        wallet_balance = 0.0

    resumes_total = ResumeAnalysis.objects.filter(job_application__job__company=company).count()
    resumes_month = ResumeAnalysis.objects.filter(
        job_application__job__company=company, created_at__gte=month_start
    ).count()
    assessments_total = GeneralSkillAssessment.objects.filter(company=company, job_application__isnull=False).count()
    active_jobs = Job.objects.filter(company=company, job_status=Job.JobStatus.ACTIVE).count()
    pipeline_count = PipelineCandidate.objects.filter(company=company).count()
    account_age_days = (now - company.created_at).days

    return {
        "first_name": recipient_name or company.company_name,
        "org_name": company.company_name,
        "wallet_balance": f"{wallet_balance:,.2f}",
        "resumes_screened_total": str(resumes_total),
        "resumes_screened_month": str(resumes_month),
        "assessments_total": str(assessments_total),
        "active_jobs": str(active_jobs),
        "pipeline_count": str(pipeline_count),
        "account_age_days": str(account_age_days),
    }
