"""Bulk per-company signal maps for the tag rule engine.

Extends (not duplicates) analytics.utils._bulk_company_signal_maps -- reuses
its bulk queries (wallet balance, resume/assessment totals, team size, active
jobs, spend, last_login) and adds the additional maps the tag rules need that
analytics doesn't already compute: pipeline counts, first-ever-activity dates
(for the just-activated rule), full per-company activity date lists (for the
re-engaged gap-detection rule), a wallet-ever-topped-up set, and a login-
recency map that also considers team members (not just the company rep).

Every map here is one bulk annotated query, keyed by company_id -- no
per-organisation loops, matching the same idiom as analytics/utils.py.
"""

from datetime import timedelta

from django.db.models import Count, Max, Min
from django.utils import timezone

from analytics.utils import _bulk_company_signal_maps
from create_user.models import CompanyTeamMember, CustomUser
from skill_assessment.models import GeneralSkillAssessment, ResumeAnalysis
from sourcing.models import PipelineCandidate
from subscriptions.models import Wallet, WalletTransaction


def build_signal_maps():
    signals = _bulk_company_signal_maps()

    signals["first_resume"] = dict(
        ResumeAnalysis.objects.filter(job_application__job__company__isnull=False)
        .values("job_application__job__company_id")
        .annotate(first=Min("created_at"))
        .values_list("job_application__job__company_id", "first")
    )
    signals["first_assessment"] = dict(
        GeneralSkillAssessment.objects.filter(job_application__isnull=False, company__isnull=False)
        .values("company_id").annotate(first=Min("created_at"))
        .values_list("company_id", "first")
    )

    signals["pipeline_counts"] = dict(
        PipelineCandidate.objects.values("company_id").annotate(c=Count("id")).values_list("company_id", "c")
    )

    signals["wallet_ever_topped_up"] = set(
        WalletTransaction.objects.filter(service_type=WalletTransaction.ServiceType.WALLET_TOPUP)
        .values_list("wallet__company_id", flat=True)
    )

    signals["free_credits_remaining"] = dict(
        Wallet.objects.values_list("company_id", "free_credits_remaining")
    )

    # Full per-company activity date lists (resume + assessment), for the
    # re-engaged rule's "gap since the previous activity" calculation. Bounded
    # by total activity row count, not company x rule count.
    activity_dates = {}
    for company_id, dt in ResumeAnalysis.objects.filter(
        job_application__job__company__isnull=False
    ).values_list("job_application__job__company_id", "created_at"):
        activity_dates.setdefault(company_id, []).append(dt)
    for company_id, dt in GeneralSkillAssessment.objects.filter(
        job_application__isnull=False, company__isnull=False
    ).values_list("company_id", "created_at"):
        activity_dates.setdefault(company_id, []).append(dt)
    for dates in activity_dates.values():
        dates.sort()
    signals["activity_dates"] = activity_dates

    # Login recency including team members, not just the company rep --
    # analytics' last_login map only covers company_rep.
    rep_logins = dict(
        CustomUser.objects.filter(company__isnull=False).values_list("company__id", "last_login")
    )
    team_logins = dict(
        CompanyTeamMember.objects.values("company_id")
        .annotate(last=Max("user__last_login"))
        .values_list("company_id", "last")
    )
    last_login_any = {}
    for company_id in set(rep_logins) | set(team_logins):
        candidates = [d for d in (rep_logins.get(company_id), team_logins.get(company_id)) if d]
        if candidates:
            last_login_any[company_id] = max(candidates)
    signals["last_login_any"] = last_login_any

    signals["now"] = timezone.now()
    return signals


def most_recent_gap_days(dates):
    """Given a sorted list of activity datetimes, returns the gap in days
    between the most recent activity and the one before it, or None if there
    are fewer than 2 activities."""
    if len(dates) < 2:
        return None
    return (dates[-1] - dates[-2]).total_seconds() / 86400
