"""Aggregation helpers for the admin analytics boards. Each public function
follows the same cache idiom as management/utils.py: a fixed cache key,
cache.get short-circuit, compute, cache.set(..., timeout=300).

'Activity' for an org is defined as a real billable action -- a resume
screened (ResumeAnalysis row) or an assessment created for a candidate
(GeneralSkillAssessment with a non-null job_application). This is used
instead of WalletTransaction, since usage covered by a subscription quota
(rather than PAYG wallet fallback) never creates a WalletTransaction at all.
"""

from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, Sum, Q, Max, Min
from django.utils import timezone

from create_user.models import Company, CustomUser, CompanyTeamMember
from jobs.models import Job, JobApplication
from skill_assessment.models import ResumeAnalysis, GeneralSkillAssessment, CandidateAssessmentSubmission
from subscriptions.models import Wallet, WalletTransaction

CACHE_TIMEOUT = 300


def _last_n_days(n):
    return timezone.now() - timedelta(days=n)


def get_company_activity_status(company, resume_dates=None, assessment_dates=None):
    """Returns one of 'active' | 'dormant' | 'churned' | 'free_credits',
    per the product's own literal definitions:
    - active: at least one billable action (resume screen or assessment) in the last 30 days
    - dormant: had billable activity historically but none in the last 30+ days
    - churned: signed up 30+ days ago and has zero billable actions ever
    - free_credits: never funded the wallet (no wallet_topup transaction) and hasn't churned/gone dormant

    resume_dates/assessment_dates: optional pre-fetched dicts of
    {company_id: last_activity_datetime} to avoid N+1 queries when called
    in a loop over many companies (see get_organisation_list).
    """
    now = timezone.now()
    cutoff_30d = now - timedelta(days=30)

    if resume_dates is not None and assessment_dates is not None:
        last_resume = resume_dates.get(company.id)
        last_assessment = assessment_dates.get(company.id)
    else:
        last_resume = (
            ResumeAnalysis.objects.filter(job_application__job__company=company)
            .order_by("-created_at").values_list("created_at", flat=True).first()
        )
        last_assessment = (
            GeneralSkillAssessment.objects.filter(company=company, job_application__isnull=False)
            .order_by("-created_at").values_list("created_at", flat=True).first()
        )

    last_activity = max([d for d in [last_resume, last_assessment] if d], default=None)

    if last_activity and last_activity >= cutoff_30d:
        return "active"
    if last_activity:
        return "dormant"

    if company.created_at >= cutoff_30d:
        has_topped_up = WalletTransaction.objects.filter(
            wallet__company=company, service_type=WalletTransaction.ServiceType.WALLET_TOPUP
        ).exists()
        return "free_credits" if not has_topped_up else "dormant"

    return "churned"


def get_overview_metrics():
    cache_key = "analytics_overview_metrics"
    cached = cache.get(cache_key)
    if cached:
        return cached

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    last_week_start = week_start - timedelta(days=7)
    month_start = today_start.replace(day=1)
    prev_month_end = month_start - timedelta(microseconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_24h = now - timedelta(hours=24)
    cutoff_30d = now - timedelta(days=30)

    total_companies = Company.objects.count()

    active_company_ids = set(
        ResumeAnalysis.objects.filter(created_at__gte=cutoff_30d, job_application__job__company__isnull=False)
        .values_list("job_application__job__company_id", flat=True)
    ) | set(
        GeneralSkillAssessment.objects.filter(
            created_at__gte=cutoff_30d, job_application__isnull=False, company__isnull=False
        ).values_list("company_id", flat=True)
    )
    active_companies = len(active_company_ids)

    new_this_week = Company.objects.filter(created_at__gte=week_start).count()
    new_last_week = Company.objects.filter(created_at__gte=last_week_start, created_at__lt=week_start).count()

    ever_active_company_ids = set(
        ResumeAnalysis.objects.filter(job_application__job__company__isnull=False)
        .values_list("job_application__job__company_id", flat=True)
    ) | set(
        GeneralSkillAssessment.objects.filter(job_application__isnull=False, company__isnull=False)
        .values_list("company_id", flat=True)
    )
    churned_companies = Company.objects.filter(created_at__lt=cutoff_30d).exclude(
        id__in=ever_active_company_ids
    ).count()

    def _count_in_range(qs, field, start):
        return qs.filter(**{f"{field}__gte": start}).count()

    resumes_today = _count_in_range(ResumeAnalysis.objects, "created_at", today_start)
    resumes_week = _count_in_range(ResumeAnalysis.objects, "created_at", week_start)
    resumes_month = _count_in_range(ResumeAnalysis.objects, "created_at", month_start)

    assessment_qs = GeneralSkillAssessment.objects.filter(job_application__isnull=False)
    assessments_today = _count_in_range(assessment_qs, "created_at", today_start)
    assessments_week = _count_in_range(assessment_qs, "created_at", week_start)
    assessments_month = _count_in_range(assessment_qs, "created_at", month_start)

    revenue_this_month = WalletTransaction.objects.filter(
        transaction_type="debit", created_at__gte=month_start
    ).aggregate(total=Sum("amount"))["total"] or 0
    revenue_last_month = WalletTransaction.objects.filter(
        transaction_type="debit", created_at__gte=prev_month_start, created_at__lte=prev_month_end
    ).aggregate(total=Sum("amount"))["total"] or 0
    revenue_growth_pct = (
        round(((float(revenue_this_month) - float(revenue_last_month)) / float(revenue_last_month)) * 100, 1)
        if revenue_last_month else None
    )

    active_jobs = Job.objects.filter(job_status=Job.JobStatus.ACTIVE).count()
    total_candidates = JobApplication.objects.values("applicant_id").distinct().count()

    # Morning digest trio
    active_orgs_today = len(
        set(
            ResumeAnalysis.objects.filter(created_at__gte=today_start, job_application__job__company__isnull=False)
            .values_list("job_application__job__company_id", flat=True)
        ) | set(
            GeneralSkillAssessment.objects.filter(
                created_at__gte=today_start, job_application__isnull=False, company__isnull=False
            ).values_list("company_id", flat=True)
        )
    )
    resumes_last_24h = ResumeAnalysis.objects.filter(created_at__gte=last_24h).count()
    topups_last_24h = WalletTransaction.objects.filter(
        service_type=WalletTransaction.ServiceType.WALLET_TOPUP, created_at__gte=last_24h
    ).aggregate(total=Sum("amount"))["total"] or 0

    # 30-day daily series
    daily_revenue = []
    daily_active_orgs = []
    for i in range(29, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_revenue = WalletTransaction.objects.filter(
            transaction_type="debit", created_at__gte=day_start, created_at__lt=day_end
        ).aggregate(total=Sum("amount"))["total"] or 0
        day_active = len(
            set(
                ResumeAnalysis.objects.filter(
                    created_at__gte=day_start, created_at__lt=day_end, job_application__job__company__isnull=False
                ).values_list("job_application__job__company_id", flat=True)
            ) | set(
                GeneralSkillAssessment.objects.filter(
                    created_at__gte=day_start, created_at__lt=day_end,
                    job_application__isnull=False, company__isnull=False,
                ).values_list("company_id", flat=True)
            )
        )
        daily_revenue.append({"date": day_start.date().isoformat(), "amount": float(day_revenue)})
        daily_active_orgs.append({"date": day_start.date().isoformat(), "count": day_active})

    result = {
        "morning_digest": {
            "active_organisations_today": active_orgs_today,
            "resumes_screened_last_24h": resumes_last_24h,
            "wallet_topups_last_24h_ngn": float(topups_last_24h),
        },
        "organisations": {
            "total": total_companies,
            "active_30d": active_companies,
            "new_this_week": new_this_week,
            "new_last_week": new_last_week,
            "churned": churned_companies,
        },
        "resumes_screened": {"today": resumes_today, "week": resumes_week, "month": resumes_month},
        "assessments_taken": {"today": assessments_today, "week": assessments_week, "month": assessments_month},
        "revenue": {
            "this_month_ngn": float(revenue_this_month),
            "last_month_ngn": float(revenue_last_month),
            "mom_growth_pct": revenue_growth_pct,
        },
        "active_jobs": active_jobs,
        "total_candidates": total_candidates,
        "daily_revenue_30d": daily_revenue,
        "daily_active_organisations_30d": daily_active_orgs,
    }
    cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
    return result


# ---------------------------------------------------------------------------
# Board 1 -- Organisations
# ---------------------------------------------------------------------------

def _bulk_company_signal_maps():
    """One bulk query per signal, keyed by company_id, to avoid N+1 across
    the whole organisation list. Returns a dict of dicts."""
    last_resume = dict(
        ResumeAnalysis.objects.filter(job_application__job__company__isnull=False)
        .values("job_application__job__company_id")
        .annotate(last=Max("created_at"))
        .values_list("job_application__job__company_id", "last")
    )
    last_assessment = dict(
        GeneralSkillAssessment.objects.filter(job_application__isnull=False, company__isnull=False)
        .values("company_id").annotate(last=Max("created_at"))
        .values_list("company_id", "last")
    )
    total_resumes = dict(
        ResumeAnalysis.objects.filter(job_application__job__company__isnull=False)
        .values("job_application__job__company_id").annotate(c=Count("id"))
        .values_list("job_application__job__company_id", "c")
    )
    total_assessments = dict(
        GeneralSkillAssessment.objects.filter(job_application__isnull=False, company__isnull=False)
        .values("company_id").annotate(c=Count("id"))
        .values_list("company_id", "c")
    )
    active_jobs = dict(
        Job.objects.filter(job_status=Job.JobStatus.ACTIVE)
        .values("company_id").annotate(c=Count("id")).values_list("company_id", "c")
    )
    team_counts = dict(
        CompanyTeamMember.objects.values("company_id").annotate(c=Count("id")).values_list("company_id", "c")
    )
    wallet_balances = dict(Wallet.objects.values_list("company_id", "balance"))
    total_spend = dict(
        WalletTransaction.objects.filter(transaction_type="debit")
        .values("wallet__company_id").annotate(total=Sum("amount"))
        .values_list("wallet__company_id", "total")
    )
    last_login = dict(
        CustomUser.objects.filter(company__isnull=False).values_list("company__id", "last_login")
    )
    three_months_ago = timezone.now() - timedelta(days=90)
    spend_3mo = dict(
        WalletTransaction.objects.filter(transaction_type="debit", created_at__gte=three_months_ago)
        .values("wallet__company_id").annotate(total=Sum("amount"))
        .values_list("wallet__company_id", "total")
    )
    return {
        "last_resume": last_resume,
        "last_assessment": last_assessment,
        "total_resumes": total_resumes,
        "total_assessments": total_assessments,
        "active_jobs": active_jobs,
        "team_counts": team_counts,
        "wallet_balances": wallet_balances,
        "total_spend": total_spend,
        "last_login": last_login,
        "spend_3mo": spend_3mo,
    }


def _bulk_org_tags_map():
    """One bulk query -- company_id -> list of {slug, name, colour} for
    every currently-active OrganisationTag. Local import to avoid a circular
    import (tags.signals imports analytics.utils for the same reason)."""
    from tags.models import OrganisationTag

    tags_map = {}
    rows = OrganisationTag.objects.filter(removed_at__isnull=True).select_related("tag").values(
        "organisation_id", "tag__slug", "tag__name", "tag__colour"
    )
    for r in rows:
        tags_map.setdefault(r["organisation_id"], []).append(
            {"slug": r["tag__slug"], "name": r["tag__name"], "colour": r["tag__colour"]}
        )
    return tags_map


def _build_org_row(company, signals, tags_map=None):
    last_resume = signals["last_resume"].get(company.id)
    last_assessment = signals["last_assessment"].get(company.id)
    last_active = max([d for d in [last_resume, last_assessment] if d], default=None)
    resume_dates = {company.id: last_resume}
    assessment_dates = {company.id: last_assessment}
    status = get_company_activity_status(company, resume_dates, assessment_dates)
    wallet_balance = float(signals["wallet_balances"].get(company.id) or 0)
    total_spend = float(signals["total_spend"].get(company.id) or 0)
    spend_3mo = float(signals["spend_3mo"].get(company.id) or 0)
    return {
        "id": company.id,
        "company_name": company.company_name,
        "date_joined": company.created_at.isoformat(),
        "status": status,
        "wallet_balance_ngn": wallet_balance,
        "wallet_low": wallet_balance < 500,
        "total_resumes_screened": signals["total_resumes"].get(company.id, 0),
        "total_assessments_taken": signals["total_assessments"].get(company.id, 0),
        "active_jobs_count": signals["active_jobs"].get(company.id, 0),
        "team_members_count": signals["team_counts"].get(company.id, 0),
        "last_active": last_active.isoformat() if last_active else None,
        "last_login": signals["last_login"].get(company.id).isoformat() if signals["last_login"].get(company.id) else None,
        "total_spend_ngn": total_spend,
        "monthly_avg_spend_ngn": round(spend_3mo / 3, 2),
        "tags": (tags_map or {}).get(company.id, []),
    }


def get_organisation_list(page=1, page_size=20, search=None, status_filter=None,
                           joined_after=None, joined_before=None, wallet_below=None,
                           last_active_before=None, ordering="-created_at",
                           tag_slugs=None, tag_match="any"):
    from tags.models import OrganisationTag

    companies = Company.objects.all()
    if search:
        companies = companies.filter(Q(company_name__icontains=search) | Q(company_email__icontains=search))
    if joined_after:
        companies = companies.filter(created_at__gte=joined_after)
    if joined_before:
        companies = companies.filter(created_at__lte=joined_before)
    if tag_slugs:
        if tag_match == "all":
            for slug in tag_slugs:
                companies = companies.filter(
                    id__in=OrganisationTag.objects.filter(
                        tag__slug=slug, removed_at__isnull=True
                    ).values("organisation_id")
                )
        else:
            companies = companies.filter(
                id__in=OrganisationTag.objects.filter(
                    tag__slug__in=tag_slugs, removed_at__isnull=True
                ).values("organisation_id")
            )

    sortable_db_fields = {"created_at", "-created_at", "company_name", "-company_name"}
    companies = companies.order_by(ordering if ordering in sortable_db_fields else "-created_at")

    signals = _bulk_company_signal_maps()
    tags_map = _bulk_org_tags_map()
    rows = [_build_org_row(c, signals, tags_map) for c in companies]

    if status_filter:
        rows = [r for r in rows if r["status"] == status_filter]
    if wallet_below is not None:
        rows = [r for r in rows if r["wallet_balance_ngn"] < wallet_below]
    if last_active_before is not None:
        rows = [r for r in rows if not r["last_active"] or r["last_active"] < last_active_before.isoformat()]

    if ordering in ("wallet_balance_ngn", "-wallet_balance_ngn", "total_spend_ngn", "-total_spend_ngn"):
        key = ordering.lstrip("-")
        rows.sort(key=lambda r: r[key], reverse=ordering.startswith("-"))

    total = len(rows)
    start = (page - 1) * page_size
    return rows[start:start + page_size], total


def get_organisation_detail(company_id):
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return None

    signals = _bulk_company_signal_maps()
    row = _build_org_row(company, signals)

    resume_events = list(
        ResumeAnalysis.objects.filter(job_application__job__company=company)
        .order_by("-created_at").values("created_at", "total_score")[:20]
    )
    assessment_events = list(
        GeneralSkillAssessment.objects.filter(company=company, job_application__isnull=False)
        .order_by("-created_at").values("created_at", "id")[:20]
    )
    billing_events = list(
        WalletTransaction.objects.filter(wallet__company=company)
        .order_by("-created_at").values("created_at", "transaction_type", "service_type", "amount")[:20]
    )
    timeline = sorted(
        [{"type": "resume_screened", "date": e["created_at"].isoformat(), "score": e["total_score"]} for e in resume_events]
        + [{"type": "assessment_created", "date": e["created_at"].isoformat()} for e in assessment_events]
        + [{"type": "billing", "date": e["created_at"].isoformat(), "transaction_type": e["transaction_type"],
            "service_type": e["service_type"], "amount": float(e["amount"])} for e in billing_events],
        key=lambda x: x["date"], reverse=True,
    )
    row["timeline"] = timeline[:30]
    return row


def get_organisation_alerts():
    cache_key = "analytics_org_alerts"
    cached = cache.get(cache_key)
    if cached:
        return cached

    now = timezone.now()
    cutoff_14d = now - timedelta(days=14)
    cutoff_7d = now - timedelta(days=7)

    low_wallet = [
        {"id": c_id, "company_name": name, "wallet_balance_ngn": float(balance)}
        for c_id, name, balance in Wallet.objects.filter(balance__lt=500)
        .values_list("company_id", "company__company_name", "balance")
    ]

    no_login_14d = [
        {"id": c.id, "company_name": c.company_name}
        for c in Company.objects.filter(
            Q(company_rep__last_login__lt=cutoff_14d) | Q(company_rep__last_login__isnull=True)
        )
    ]

    signed_up_never_screened = [
        {"id": c.id, "company_name": c.company_name, "date_joined": c.created_at.isoformat()}
        for c in Company.objects.filter(created_at__lte=cutoff_7d).exclude(
            id__in=ResumeAnalysis.objects.filter(job_application__job__company__isnull=False)
            .values_list("job_application__job__company_id", flat=True)
        )
    ]

    only_one_login = [
        {"id": company_id, "company_name": name, "team_size": count}
        for company_id, name, count in (
            CompanyTeamMember.objects.values("company_id", "company__company_name")
            .annotate(team_size=Count("id"))
            .filter(team_size__gt=1)
            .values_list("company_id", "company__company_name", "team_size")
        )
        if CustomUser.objects.filter(
            id__in=CompanyTeamMember.objects.filter(company_id=company_id).values_list("user_id", flat=True),
            last_login__isnull=False,
        ).count() <= 1
    ]

    result = {
        "low_wallet_balance": low_wallet,
        "no_login_14d_plus": no_login_14d,
        "never_screened_after_7d": signed_up_never_screened,
        "team_exists_but_one_login": only_one_login,
    }
    cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
    return result


# ---------------------------------------------------------------------------
# Board 2 -- Revenue and Billing
# ---------------------------------------------------------------------------

def get_revenue_summary(days=30):
    cache_key = f"analytics_revenue_summary_{days}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)

    daily_revenue = []
    for i in range(days - 1, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        amount = WalletTransaction.objects.filter(
            transaction_type="debit", created_at__gte=day_start, created_at__lt=day_end
        ).aggregate(total=Sum("amount"))["total"] or 0
        daily_revenue.append({"date": day_start.date().isoformat(), "amount": float(amount)})

    by_service_type = {
        row["service_type"]: float(row["total"])
        for row in WalletTransaction.objects.filter(transaction_type="debit", service_type__isnull=False)
        .values("service_type").annotate(total=Sum("amount"))
    }

    top_orgs = list(
        WalletTransaction.objects.filter(transaction_type="debit", created_at__gte=month_start)
        .values("wallet__company_id", "wallet__company__company_name")
        .annotate(spend=Sum("amount")).order_by("-spend")[:10]
    )
    total_month_spend = float(
        WalletTransaction.objects.filter(transaction_type="debit", created_at__gte=month_start)
        .aggregate(total=Sum("amount"))["total"] or 0
    )
    top_orgs_ranked = [
        {
            "company_id": o["wallet__company_id"],
            "company_name": o["wallet__company__company_name"],
            "spend_ngn": float(o["spend"]),
            "pct_of_total_revenue": round((float(o["spend"]) / total_month_spend) * 100, 1) if total_month_spend else 0,
        }
        for o in top_orgs
    ]

    topups = WalletTransaction.objects.filter(
        service_type=WalletTransaction.ServiceType.WALLET_TOPUP, created_at__gte=month_start
    )
    topup_agg = topups.aggregate(total=Sum("amount"), count=Count("id"))
    avg_deposit = float(topup_agg["total"] or 0) / topup_agg["count"] if topup_agg["count"] else 0

    companies_with_topup = set(
        WalletTransaction.objects.filter(service_type=WalletTransaction.ServiceType.WALLET_TOPUP)
        .values_list("wallet__company_id", flat=True)
    )
    total_companies = Company.objects.count()
    orgs_on_free_credits = total_companies - len(companies_with_topup)

    # AI cost margin -- placeholder until AIUsageLog.estimated_cost_usd has real data
    from analytics.models import AIUsageLog
    has_cost_data = AIUsageLog.objects.filter(estimated_cost_usd__isnull=False).exists()

    result = {
        "daily_revenue": daily_revenue,
        "by_service_type": {
            "resume_screening": by_service_type.get("resume_screening", 0),
            "assessment": by_service_type.get("assessment", 0),
        },
        "top_10_orgs_by_spend_this_month": top_orgs_ranked,
        "avg_deposit_amount_ngn": round(avg_deposit, 2),
        "orgs_on_free_credits": orgs_on_free_credits,
        "orgs_on_paid_wallet": len(companies_with_topup),
        "margin": {
            "available": has_cost_data,
            "resume_screening_margin_pct": None,
            "assessment_margin_pct": None,
        } if not has_cost_data else _compute_margin(),
        "current_prices_ngn": {"resume_screening": 40.0, "assessment": 100.0},
    }
    cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
    return result


def _compute_margin():
    from analytics.models import AIUsageLog
    from django.conf import settings as dj_settings
    prices = dj_settings.PAYG_PRICES
    margins = {}
    for service_key, log_type in [("resume_screening", "resume_analysis"), ("assessment", "mcq_generation")]:
        avg_cost = AIUsageLog.objects.filter(
            service_type=log_type, estimated_cost_usd__isnull=False
        ).aggregate(avg=Sum("estimated_cost_usd") / Count("id"))["avg"]
        price_ngn = float(prices.get(service_key, {}).get("ngn", 0))
        margins[f"{service_key}_margin_pct"] = (
            round(((price_ngn - float(avg_cost or 0)) / price_ngn) * 100, 1) if price_ngn else None
        )
    return {"available": True, **margins}


def get_wallet_topup_events(page=1, page_size=50):
    qs = WalletTransaction.objects.filter(
        service_type=WalletTransaction.ServiceType.WALLET_TOPUP
    ).select_related("wallet__company")
    total = qs.count()

    cumulative = 0
    cumulative_map = {}
    for txn_id, amount in qs.order_by("created_at").values_list("id", "amount"):
        cumulative += float(amount)
        cumulative_map[txn_id] = cumulative

    start = (page - 1) * page_size
    page_qs = qs.order_by("-created_at")[start:start + page_size]
    rows = [
        {
            "company_name": txn.wallet.company.company_name,
            "amount_ngn": float(txn.amount),
            "date": txn.created_at.isoformat(),
            "running_total_ngn": cumulative_map.get(txn.id, 0),
        }
        for txn in page_qs
    ]
    return rows, total


# ---------------------------------------------------------------------------
# Board 4 -- Pipeline and Talent Pool
# ---------------------------------------------------------------------------

def get_pipeline_summary():
    cache_key = "analytics_pipeline_summary"
    cached = cache.get(cache_key)
    if cached:
        return cached

    from sourcing.models import PipelineCandidate, OutreachEmail

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ninety_days_ago = now - timedelta(days=90)

    total_candidates = PipelineCandidate.objects.count()
    outreach_this_month = OutreachEmail.objects.filter(created_at__gte=month_start).count()

    via_invite_link = PipelineCandidate.objects.filter(invite_link__isnull=False).count()
    added_by_team = PipelineCandidate.objects.filter(invite_link__isnull=True).count()

    active_company_ids = set(
        Job.objects.filter(job_status=Job.JobStatus.ACTIVE).values_list("company_id", flat=True)
    )
    active_org_count = len(active_company_ids) or 1
    pipeline_per_active_org = PipelineCandidate.objects.filter(
        company_id__in=active_company_ids
    ).count() / active_org_count

    orgs_with_zero_pipeline = list(
        Company.objects.filter(created_at__lt=now).exclude(
            id__in=PipelineCandidate.objects.values_list("company_id", flat=True)
        ).annotate(active_jobs=Count("jobs", filter=Q(jobs__job_status=Job.JobStatus.ACTIVE)))
        .values("id", "company_name", "created_at", "active_jobs")
    )

    growth = []
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(89, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = PipelineCandidate.objects.filter(created_at__gte=day_start, created_at__lt=day_end).count()
        growth.append({"date": day_start.date().isoformat(), "count": count})

    result = {
        "total_pipeline_candidates": total_candidates,
        "outreach_messages_this_month": outreach_this_month,
        "source_split": {
            "added_via_invite_link": via_invite_link,
            "added_directly_by_team": added_by_team,
        },
        "avg_pipeline_size_per_active_org": round(pipeline_per_active_org, 1),
        "orgs_with_zero_pipeline_entries": [
            {
                "id": o["id"],
                "company_name": o["company_name"],
                "date_joined": o["created_at"].isoformat(),
                "active_jobs": o["active_jobs"],
            }
            for o in orgs_with_zero_pipeline
        ],
        "pipeline_growth_90d": growth,
    }
    cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
    return result


# ---------------------------------------------------------------------------
# Board 3 -- Product Funnel
# ---------------------------------------------------------------------------

_INTERVIEW_OR_BEYOND = [
    JobApplication.JobApplicationStatus.INTERVIEW_SCHEDULED,
    JobApplication.JobApplicationStatus.PENDING_DECISION,
    JobApplication.JobApplicationStatus.OFFER_EXTENDED,
    JobApplication.JobApplicationStatus.OFFER_ACCEPTED,
    JobApplication.JobApplicationStatus.OFFER_DECLINED,
]
_OFFER_OR_BEYOND = [
    JobApplication.JobApplicationStatus.OFFER_EXTENDED,
    JobApplication.JobApplicationStatus.OFFER_ACCEPTED,
    JobApplication.JobApplicationStatus.OFFER_DECLINED,
]


def get_funnel_summary():
    cache_key = "analytics_funnel_summary"
    cached = cache.get(cache_key)
    if cached:
        return cached

    applications_received = JobApplication.objects.count()
    resumes_screened = JobApplication.objects.filter(
        id__in=ResumeAnalysis.objects.values_list("job_application_id", flat=True)
    ).count()
    assessment_invited = JobApplication.objects.filter(
        id__in=GeneralSkillAssessment.objects.filter(job_application__isnull=False).values_list("job_application_id", flat=True)
    ).count()
    assessment_completed = JobApplication.objects.filter(
        id__in=GeneralSkillAssessment.objects.filter(
            job_application__isnull=False,
            id__in=CandidateAssessmentSubmission.objects.filter(is_completed=True).values_list("skill_assessment_id", flat=True),
        ).values_list("job_application_id", flat=True)
    ).count()
    interview_stage = JobApplication.objects.filter(status__in=_INTERVIEW_OR_BEYOND).count()
    offer_or_placement = JobApplication.objects.filter(status__in=_OFFER_OR_BEYOND).count()

    def _rate(numerator, denominator):
        return round((numerator / denominator) * 100, 1) if denominator else 0

    funnel = [
        {"stage": "Applications received", "count": applications_received, "conversion_from_previous_pct": 100 if applications_received else 0},
        {"stage": "Resumes screened", "count": resumes_screened, "conversion_from_previous_pct": _rate(resumes_screened, applications_received)},
        {"stage": "Assessment invited", "count": assessment_invited, "conversion_from_previous_pct": _rate(assessment_invited, resumes_screened)},
        {"stage": "Assessment completed", "count": assessment_completed, "conversion_from_previous_pct": _rate(assessment_completed, assessment_invited)},
        {"stage": "Interview stage", "count": interview_stage, "conversion_from_previous_pct": _rate(interview_stage, assessment_completed)},
        {"stage": "Offer/Placement", "count": offer_or_placement, "conversion_from_previous_pct": _rate(offer_or_placement, interview_stage)},
    ]

    avg_screening_pass_mark = Job.objects.filter(screening_threshold__isnull=False).aggregate(
        avg=Sum("screening_threshold") / Count("id")
    )["avg"]
    avg_assessment_pass_mark = Job.objects.filter(passing_grade__isnull=False).aggregate(
        avg=Sum("passing_grade") / Count("id")
    )["avg"]

    dropout_rate = _rate(assessment_invited - assessment_completed, assessment_invited)
    ghost_rate = _rate(applications_received - resumes_screened, applications_received)

    completed_with_started = CandidateAssessmentSubmission.objects.filter(
        is_completed=True, started_at__isnull=False, completed_at__isnull=False
    )
    avg_completion_minutes = None
    if completed_with_started.exists():
        deltas = [
            (s.completed_at - s.started_at).total_seconds() / 60
            for s in completed_with_started.only("started_at", "completed_at")
        ]
        avg_completion_minutes = round(sum(deltas) / len(deltas), 1)

    assessment_type_breakdown = {
        row["assessment_type"]: row["c"]
        for row in GeneralSkillAssessment.objects.filter(job_application__isnull=False)
        .values("assessment_type").annotate(c=Count("id"))
    }

    scores = list(
        CandidateAssessmentSubmission.objects.filter(is_completed=True, total_score__isnull=False)
        .values_list("total_score", flat=True)
    )
    scores = [s for s in scores if s is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None
    buckets = {"below_30": 0, "30_to_50": 0, "50_to_70": 0, "70_to_90": 0, "above_90": 0}
    for s in scores:
        if s < 30:
            buckets["below_30"] += 1
        elif s < 50:
            buckets["30_to_50"] += 1
        elif s < 70:
            buckets["50_to_70"] += 1
        elif s < 90:
            buckets["70_to_90"] += 1
        else:
            buckets["above_90"] += 1

    result = {
        "funnel": funnel,
        "avg_screening_pass_mark": round(avg_screening_pass_mark, 1) if avg_screening_pass_mark else None,
        "avg_assessment_pass_mark": round(avg_assessment_pass_mark, 1) if avg_assessment_pass_mark else None,
        "assessment_dropout_rate_pct": dropout_rate,
        "candidate_ghost_rate_pct": ghost_rate,
        "avg_time_to_complete_after_invite": {
            "minutes": avg_completion_minutes,
            "available": avg_completion_minutes is not None,
        },
        "assessment_type_breakdown": assessment_type_breakdown,
        "avg_score": avg_score,
        "score_distribution": buckets,
    }
    cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
    return result


# ---------------------------------------------------------------------------
# Board 6 -- Assessment Intelligence
# ---------------------------------------------------------------------------

def get_assessment_intelligence_summary():
    cache_key = "analytics_assessment_intelligence_summary"
    cached = cache.get(cache_key)
    if cached:
        return cached

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    created_this_month = GeneralSkillAssessment.objects.filter(
        job_application__isnull=False, created_at__gte=month_start
    ).count()
    completed_this_month = CandidateAssessmentSubmission.objects.filter(
        is_completed=True, completed_at__gte=month_start
    ).count()

    scores = list(
        CandidateAssessmentSubmission.objects.filter(is_completed=True, total_score__isnull=False)
        .values_list("total_score", flat=True)
    )
    platform_avg_score = round(sum(scores) / len(scores), 1) if scores else None

    # Retakes: group completed submissions by the underlying job_application
    # (each re-invite creates a fresh GeneralSkillAssessment+submission row).
    submissions = list(
        CandidateAssessmentSubmission.objects.filter(
            is_completed=True, total_score__isnull=False, skill_assessment__job_application__isnull=False
        ).select_related("skill_assessment").order_by(
            "skill_assessment__job_application_id", "created_at"
        ).values("skill_assessment__job_application_id", "total_score", "created_at")
    )
    by_application = {}
    for s in submissions:
        by_application.setdefault(s["skill_assessment__job_application_id"], []).append(s)
    retakes = []
    for app_id, subs in by_application.items():
        if len(subs) > 1:
            retakes.append({
                "job_application_id": app_id,
                "original_score": subs[0]["total_score"],
                "retake_score": subs[-1]["total_score"],
                "attempts": len(subs),
            })

    completion_time_distribution = {"under_15min": 0, "15_to_30min": 0, "30_to_60min": 0, "over_60min": 0}
    has_timing_data = False
    for s in CandidateAssessmentSubmission.objects.filter(
        is_completed=True, started_at__isnull=False, completed_at__isnull=False
    ).only("started_at", "completed_at"):
        has_timing_data = True
        minutes = (s.completed_at - s.started_at).total_seconds() / 60
        if minutes < 15:
            completion_time_distribution["under_15min"] += 1
        elif minutes < 30:
            completion_time_distribution["15_to_30min"] += 1
        elif minutes < 60:
            completion_time_distribution["30_to_60min"] += 1
        else:
            completion_time_distribution["over_60min"] += 1

    # Top jobs by failure rate / avg score
    job_stats = {}
    subs_with_job = CandidateAssessmentSubmission.objects.filter(
        is_completed=True, skill_assessment__job_application__isnull=False
    ).select_related("skill_assessment__job_application__job__role").values(
        "skill_assessment__job_application__job_id",
        "skill_assessment__job_application__job__role__title",
        "is_passed", "total_score",
    )
    for row in subs_with_job:
        job_id = row["skill_assessment__job_application__job_id"]
        entry = job_stats.setdefault(
            job_id,
            {"title": row["skill_assessment__job_application__job__role__title"] or "Unknown Role", "total": 0, "failed": 0, "scores": []},
        )
        entry["total"] += 1
        if not row["is_passed"]:
            entry["failed"] += 1
        if row["total_score"] is not None:
            entry["scores"].append(row["total_score"])

    job_rows = [
        {
            "job_id": job_id,
            "job_title": e["title"],
            "failure_rate_pct": round((e["failed"] / e["total"]) * 100, 1) if e["total"] else 0,
            "avg_score": round(sum(e["scores"]) / len(e["scores"]), 1) if e["scores"] else None,
            "total_submissions": e["total"],
        }
        for job_id, e in job_stats.items()
    ]
    top_10_by_failure_rate = sorted(job_rows, key=lambda r: r["failure_rate_pct"], reverse=True)[:10]
    top_10_by_avg_score = sorted([r for r in job_rows if r["avg_score"] is not None], key=lambda r: r["avg_score"], reverse=True)[:10]

    result = {
        "assessments_created_this_month": created_this_month,
        "assessments_completed_this_month": completed_this_month,
        "platform_avg_score": platform_avg_score,
        "flag_events": {"available": False, "reason": "No automated flagging/proctoring system exists yet -- webcam snapshots are stored for manual review only."},
        "flag_rate_pct": {"available": False},
        "retake_comparisons": retakes,
        "completion_time_distribution": {
            "available": has_timing_data,
            "buckets": completion_time_distribution,
        },
        "top_10_jobs_by_failure_rate": top_10_by_failure_rate,
        "top_10_jobs_by_avg_score": top_10_by_avg_score,
    }
    cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
    return result


# ---------------------------------------------------------------------------
# Board 5 -- Acquisition and Growth
# ---------------------------------------------------------------------------

def get_growth_summary():
    cache_key = "analytics_growth_summary"
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Signup source breakdown
    utm_breakdown = {
        row["utm_source"]: row["c"]
        for row in Company.objects.filter(utm_source__isnull=False).exclude(utm_source="")
        .values("utm_source").annotate(c=Count("id"))
    }
    heard_from_breakdown = {
        row["heard_from"]: row["c"]
        for row in Company.objects.filter(heard_from__isnull=False).exclude(heard_from="")
        .values("heard_from").annotate(c=Count("id"))
    }

    # Referrals
    referral_rows = list(
        Company.objects.filter(referred_by__isnull=False).select_related("referred_by")
        .values("referred_by__company_name", "company_name", "created_at")
        .order_by("-created_at")[:100]
    )
    referral_table = [
        {
            "referring_org": r["referred_by__company_name"],
            "referred_org": r["company_name"],
            "date": r["created_at"].isoformat(),
            "conversion_status": "signed_up",
        }
        for r in referral_rows
    ]
    top_referrers = list(
        Company.objects.filter(referrals__isnull=False).annotate(referral_count=Count("referrals"))
        .filter(referral_count__gt=0).order_by("-referral_count")
        .values("id", "company_name", "referral_count")[:5]
    )

    # Activation funnel: signup -> first job -> first resume screened -> wallet funded
    first_job = dict(
        Job.objects.values("company_id").annotate(first=Min("date_created")).values_list("company_id", "first")
    )
    first_resume = dict(
        ResumeAnalysis.objects.filter(job_application__job__company__isnull=False)
        .values("job_application__job__company_id").annotate(first=Min("created_at"))
        .values_list("job_application__job__company_id", "first")
    )
    first_topup = dict(
        WalletTransaction.objects.filter(service_type=WalletTransaction.ServiceType.WALLET_TOPUP)
        .values("wallet__company_id").annotate(first=Min("created_at"))
        .values_list("wallet__company_id", "first")
    )

    step1_deltas, step2_deltas, step3_deltas = [], [], []
    total_companies = 0
    step1_completed = step2_completed = step3_completed = 0
    for company in Company.objects.only("id", "created_at"):
        total_companies += 1
        job_date = first_job.get(company.id)
        resume_date = first_resume.get(company.id)
        topup_date = first_topup.get(company.id)
        if job_date:
            step1_completed += 1
            step1_deltas.append((job_date - company.created_at).total_seconds())
        if job_date and resume_date:
            step2_completed += 1
            step2_deltas.append((resume_date - job_date).total_seconds())
        if resume_date and topup_date:
            step3_completed += 1
            step3_deltas.append((topup_date - resume_date).total_seconds())

    def _median(values):
        if not values:
            return None
        s = sorted(values)
        n = len(s)
        mid = n // 2
        return (s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2) / 3600  # hours

    activation_funnel = [
        {
            "step": "Signup -> First job created",
            "median_hours": _median(step1_deltas),
            "pct_completed": round((step1_completed / total_companies) * 100, 1) if total_companies else 0,
            "pct_dropped_off": round(((total_companies - step1_completed) / total_companies) * 100, 1) if total_companies else 0,
        },
        {
            "step": "First job created -> First resume screened",
            "median_hours": _median(step2_deltas),
            "pct_completed": round((step2_completed / step1_completed) * 100, 1) if step1_completed else 0,
            "pct_dropped_off": round(((step1_completed - step2_completed) / step1_completed) * 100, 1) if step1_completed else 0,
        },
        {
            "step": "First resume screened -> Wallet funded",
            "median_hours": _median(step3_deltas),
            "pct_completed": round((step3_completed / step2_completed) * 100, 1) if step2_completed else 0,
            "pct_dropped_off": round(((step2_completed - step3_completed) / step2_completed) * 100, 1) if step2_completed else 0,
        },
    ]

    cohort_table = _build_cohort_retention_table()

    result = {
        "signup_source": {"utm": utm_breakdown, "heard_from": heard_from_breakdown},
        "referral_table": referral_table,
        "top_5_referring_organisations": [
            {"id": r["id"], "company_name": r["company_name"], "referral_count": r["referral_count"]}
            for r in top_referrers
        ],
        "activation_funnel": activation_funnel,
        "cohort_retention_table": cohort_table,
    }
    cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
    return result


def _build_cohort_retention_table():
    """Rows = signup month, columns = month-offset (0..N), cell = % of that
    cohort with >=1 billable action (resume screen or assessment) during
    that calendar month. Works even with sparse data -- cells with zero
    cohort size are simply omitted rather than fabricated."""
    companies = list(Company.objects.only("id", "created_at"))
    if not companies:
        return []

    active_months_by_company = {}
    for company_id, dt in ResumeAnalysis.objects.filter(
        job_application__job__company__isnull=False
    ).values_list("job_application__job__company_id", "created_at"):
        active_months_by_company.setdefault(company_id, set()).add((dt.year, dt.month))
    for company_id, dt in GeneralSkillAssessment.objects.filter(
        job_application__isnull=False, company__isnull=False
    ).values_list("company_id", "created_at"):
        active_months_by_company.setdefault(company_id, set()).add((dt.year, dt.month))

    cohorts = {}
    for company in companies:
        cohort_key = (company.created_at.year, company.created_at.month)
        cohorts.setdefault(cohort_key, []).append(company)

    now = timezone.now()
    max_offset = 11
    rows = []
    for (year, month), members in sorted(cohorts.items()):
        cohort_size = len(members)
        row = {"cohort": f"{year}-{month:02d}", "cohort_size": cohort_size, "months": []}
        for offset in range(max_offset + 1):
            target_month = month + offset
            target_year = year + (target_month - 1) // 12
            target_month = ((target_month - 1) % 12) + 1
            if (target_year, target_month) > (now.year, now.month):
                break
            active_count = sum(
                1 for c in members
                if (target_year, target_month) in active_months_by_company.get(c.id, set())
            )
            pct = round((active_count / cohort_size) * 100, 1) if cohort_size else 0
            row["months"].append({"offset": offset, "pct_active": pct})
        rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# Board 7 -- System Health
# ---------------------------------------------------------------------------

def get_system_health_summary():
    cache_key = "analytics_system_health_summary"
    cached = cache.get(cache_key)
    if cached:
        return cached

    from analytics.models import AIUsageLog
    from management.models import EmailTrack

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    last_24h = now - timedelta(hours=24)

    calls_today = AIUsageLog.objects.filter(created_at__gte=today_start).count()
    calls_week = AIUsageLog.objects.filter(created_at__gte=week_start).count()
    calls_month = AIUsageLog.objects.filter(created_at__gte=month_start).count()

    total_calls_month = AIUsageLog.objects.filter(created_at__gte=month_start).count()
    failed_calls_month = AIUsageLog.objects.filter(created_at__gte=month_start, succeeded=False).count()
    error_rate_pct = round((failed_calls_month / total_calls_month) * 100, 1) if total_calls_month else None

    failed_resume_jobs = list(
        AIUsageLog.objects.filter(
            service_type=AIUsageLog.ServiceType.RESUME_ANALYSIS, succeeded=False, created_at__gte=last_24h
        ).select_related("company").values("company__company_name", "job_application_id", "error_message", "created_at")[:50]
    )
    failed_assessment_jobs = list(
        AIUsageLog.objects.filter(
            service_type__in=[AIUsageLog.ServiceType.MCQ_GENERATION, AIUsageLog.ServiceType.CODING_ASSESSMENT],
            succeeded=False, created_at__gte=last_24h,
        ).select_related("company").values("company__company_name", "job_application_id", "error_message", "created_at")[:50]
    )

    email_total = EmailTrack.objects.filter(created_at__gte=last_24h).count()
    email_delivered = EmailTrack.objects.filter(
        created_at__gte=last_24h,
        delivery_status__in=[EmailTrack.DeliveryStatus.DELIVERED, EmailTrack.DeliveryStatus.SENT],
    ).count()
    email_delivery_rate = round((email_delivered / email_total) * 100, 1) if email_total else None

    result = {
        "openai_call_volume": {"today": calls_today, "week": calls_week, "month": calls_month},
        "api_error_rate_pct": error_rate_pct,
        "failed_screening_jobs_24h": [
            {
                "company_name": r["company__company_name"],
                "job_application_id": r["job_application_id"],
                "error": r["error_message"],
                "date": r["created_at"].isoformat(),
            }
            for r in failed_resume_jobs
        ],
        "failed_assessment_jobs_24h": [
            {
                "company_name": r["company__company_name"],
                "job_application_id": r["job_application_id"],
                "error": r["error_message"],
                "date": r["created_at"].isoformat(),
            }
            for r in failed_assessment_jobs
        ],
        "email_delivery_rate_pct": {"available": email_total > 0, "value": email_delivery_rate},
        # Permanent placeholders -- no code-only path to build these without an
        # external monitoring/billing integration or FastAPI-side latency instrumentation.
        "avg_response_time_ms": {"resume_screening": None, "assessment_generation": None, "available": False},
        "infra_cost": {"ngn": None, "usd": None, "available": False},
        "gross_margin_this_month": {"available": False},
        "platform_uptime_30d_pct": {"available": False},
    }
    cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
    return result
