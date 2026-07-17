"""System tag rule engine.

run_full_evaluation() (hourly cron, tags.tasks.run_tag_rule_engine) evaluates
every system tag rule against a single precomputed pass of bulk signal maps
(tags.signals.build_signal_maps) and bulk-applies the diff against current
OrganisationTag holders -- O(1) queries per rule, never a per-organisation
loop.

evaluate_companies([company_id, ...]) is the same logic scoped to a handful
of companies, used for immediate re-evaluation triggers (first resume screen,
wallet funding, first assessment, login) so an org doesn't have to wait for
the next hourly tick to pick up a tag it just newly qualifies for.

Assumed spend tiers (NOT specified precisely in the source spec -- resume
screening is priced at ~NGN40 and assessments at ~NGN100 per
analytics.utils.get_revenue_summary's PAYG_PRICES fallback, so these tiers
are chosen to roughly correspond to "a handful of screens", "dozens", and
"heavy usage" of total spend): light-spender < 5,000 NGN, medium-spender
5,000-49,999 NGN, high-spender >= 50,000 NGN (all three require > 0 spend).
"""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from create_user.models import Company
from tags.models import OrganisationTag, Tag, TagAuditLog
from tags.signals import build_signal_maps, most_recent_gap_days

LIFECYCLE_SLUGS = ["re-engaged", "just-activated", "new-signup", "active", "dormant", "churned"]

LIGHT_SPEND_MAX = 5_000
MEDIUM_SPEND_MAX = 50_000


def _lifecycle_tag_for_company(company_id, created_at, signals):
    now = signals["now"]
    cutoff_7d = now - timedelta(days=7)
    cutoff_30d = now - timedelta(days=30)

    last_resume = signals["last_resume"].get(company_id)
    last_assessment = signals["last_assessment"].get(company_id)
    last_activity = max([d for d in [last_resume, last_assessment] if d], default=None)

    first_resume = signals["first_resume"].get(company_id)
    first_assessment = signals["first_assessment"].get(company_id)
    first_activity = min([d for d in [first_resume, first_assessment] if d], default=None)

    gap = most_recent_gap_days(signals["activity_dates"].get(company_id, []))

    if last_activity and last_activity >= cutoff_7d and gap is not None and gap >= 30:
        return "re-engaged"
    if first_activity and first_activity >= cutoff_7d:
        return "just-activated"
    if not last_activity and created_at >= cutoff_7d:
        return "new-signup"
    if last_activity and last_activity >= cutoff_30d:
        return "active"
    if last_activity:
        return "dormant"
    if created_at >= cutoff_30d:
        # Signed up 8-29 days ago, never active -- matches analytics'
        # "free_credits" bucket, which has no lifecycle-tag equivalent here.
        return None
    return "churned"


def _wallet_funded(signals, scope_ids):
    return {c for c in scope_ids if c in signals["wallet_ever_topped_up"]}


def _low_wallet_balance(signals, scope_ids):
    balances = signals["wallet_balances"]
    return {c for c in scope_ids if float(balances.get(c) or 0) < 500}


def _spend_tier(signals, scope_ids, low, high):
    spend = signals["total_spend"]
    result = set()
    for c in scope_ids:
        amount = float(spend.get(c) or 0)
        if low <= amount < high:
            result.add(c)
    return result


def _light_spender(signals, scope_ids):
    return _spend_tier(signals, scope_ids, 0.01, LIGHT_SPEND_MAX)


def _medium_spender(signals, scope_ids):
    return _spend_tier(signals, scope_ids, LIGHT_SPEND_MAX, MEDIUM_SPEND_MAX)


def _high_spender(signals, scope_ids):
    return _spend_tier(signals, scope_ids, MEDIUM_SPEND_MAX, float("inf"))


def _count_bucket(count_map, scope_ids, low, high):
    result = set()
    for c in scope_ids:
        n = count_map.get(c, 0)
        if low <= n < high:
            result.add(c)
    return result


def _no_screening_yet(signals, scope_ids):
    return _count_bucket(signals["total_resumes"], scope_ids, 0, 1)


def _first_screen_done(signals, scope_ids):
    return _count_bucket(signals["total_resumes"], scope_ids, 1, 10)


def _growing_screener(signals, scope_ids):
    return _count_bucket(signals["total_resumes"], scope_ids, 10, 100)


def _power_screener(signals, scope_ids):
    return _count_bucket(signals["total_resumes"], scope_ids, 100, 500)


def _heavy_screener(signals, scope_ids):
    return _count_bucket(signals["total_resumes"], scope_ids, 500, float("inf"))


def _assessment_never_used(signals, scope_ids):
    return _count_bucket(signals["total_assessments"], scope_ids, 0, 1)


def _first_assessment_done(signals, scope_ids):
    return _count_bucket(signals["total_assessments"], scope_ids, 1, 10)


def _growing_assessor(signals, scope_ids):
    return _count_bucket(signals["total_assessments"], scope_ids, 10, 50)


def _power_assessor(signals, scope_ids):
    return _count_bucket(signals["total_assessments"], scope_ids, 50, 200)


def _assessment_master(signals, scope_ids):
    return _count_bucket(signals["total_assessments"], scope_ids, 200, float("inf"))


def _pipeline_never_used(signals, scope_ids):
    return _count_bucket(signals["pipeline_counts"], scope_ids, 0, 1)


def _pipeline_active(signals, scope_ids):
    return _count_bucket(signals["pipeline_counts"], scope_ids, 1, 50)


def _pipeline_power_user(signals, scope_ids):
    return _count_bucket(signals["pipeline_counts"], scope_ids, 50, float("inf"))


def _solo_user(signals, scope_ids):
    return _count_bucket(signals["team_counts"], scope_ids, 0, 2)


def _team_account(signals, scope_ids):
    return _count_bucket(signals["team_counts"], scope_ids, 2, float("inf"))


def _logged_in_this_week(signals, scope_ids):
    cutoff = signals["now"] - timedelta(days=7)
    logins = signals["last_login_any"]
    return {c for c in scope_ids if logins.get(c) and logins[c] >= cutoff}


def _inactive_14_days(signals, scope_ids):
    cutoff = signals["now"] - timedelta(days=14)
    logins = signals["last_login_any"]
    return {c for c in scope_ids if not logins.get(c) or logins[c] < cutoff}


def _inactive_30_days(signals, scope_ids):
    cutoff = signals["now"] - timedelta(days=30)
    logins = signals["last_login_any"]
    return {c for c in scope_ids if not logins.get(c) or logins[c] < cutoff}


THRESHOLD_RULES = [
    ("wallet-funded", _wallet_funded),
    ("low-wallet-balance", _low_wallet_balance),
    ("light-spender", _light_spender),
    ("medium-spender", _medium_spender),
    ("high-spender", _high_spender),
    ("no-screening-yet", _no_screening_yet),
    ("first-screen-done", _first_screen_done),
    ("growing-screener", _growing_screener),
    ("power-screener", _power_screener),
    ("heavy-screener", _heavy_screener),
    ("assessment-never-used", _assessment_never_used),
    ("first-assessment-done", _first_assessment_done),
    ("growing-assessor", _growing_assessor),
    ("power-assessor", _power_assessor),
    ("assessment-master", _assessment_master),
    ("pipeline-never-used", _pipeline_never_used),
    ("pipeline-active", _pipeline_active),
    ("pipeline-power-user", _pipeline_power_user),
    ("solo-user", _solo_user),
    ("team-account", _team_account),
    ("logged-in-this-week", _logged_in_this_week),
    ("inactive-14-days", _inactive_14_days),
    ("inactive-30-days", _inactive_30_days),
]


def _diff_and_apply(tag, qualifying_ids, scope_ids, triggered_by, reason):
    current_ids = set(
        OrganisationTag.objects.filter(
            tag=tag, removed_at__isnull=True, organisation_id__in=scope_ids
        ).values_list("organisation_id", flat=True)
    )
    to_add = qualifying_ids - current_ids
    to_remove = current_ids - qualifying_ids
    now = timezone.now()

    if to_add:
        OrganisationTag.objects.bulk_create(
            [OrganisationTag(organisation_id=cid, tag=tag) for cid in to_add]
        )
        TagAuditLog.objects.bulk_create(
            [
                TagAuditLog(
                    organisation_id=cid, tag=tag, action=TagAuditLog.Action.APPLIED,
                    triggered_by=triggered_by, reason=reason,
                )
                for cid in to_add
            ]
        )
    if to_remove:
        OrganisationTag.objects.filter(
            tag=tag, organisation_id__in=to_remove, removed_at__isnull=True
        ).update(removed_at=now)
        TagAuditLog.objects.bulk_create(
            [
                TagAuditLog(
                    organisation_id=cid, tag=tag, action=TagAuditLog.Action.REMOVED,
                    triggered_by=triggered_by, reason=reason,
                )
                for cid in to_remove
            ]
        )
    return len(to_add), len(to_remove)


@transaction.atomic
def evaluate_companies(company_ids, triggered_by=TagAuditLog.TriggeredBy.SYSTEM_CRON):
    """Evaluate every system tag rule, scoped to just these companies. Used
    both by the full hourly run (scope = every company) and by immediate
    single-company re-evaluation triggers."""
    signals = build_signal_maps()
    companies = list(Company.objects.filter(id__in=company_ids).only("id", "created_at"))
    scope_ids = {c.id for c in companies}
    if not scope_ids:
        return {}

    system_tags = {t.slug: t for t in Tag.objects.filter(tag_type=Tag.TagType.SYSTEM, is_active=True)}
    results = {}

    lifecycle_map = {c.id: _lifecycle_tag_for_company(c.id, c.created_at, signals) for c in companies}
    for slug in LIFECYCLE_SLUGS:
        tag = system_tags.get(slug)
        if not tag:
            continue
        qualifying = {cid for cid, s in lifecycle_map.items() if s == slug}
        results[slug] = _diff_and_apply(tag, qualifying, scope_ids, triggered_by, f"lifecycle:{slug}")

    for slug, fn in THRESHOLD_RULES:
        tag = system_tags.get(slug)
        if not tag:
            continue
        qualifying = fn(signals, scope_ids)
        results[slug] = _diff_and_apply(tag, qualifying, scope_ids, triggered_by, f"rule:{slug}")

    return results


def run_full_evaluation(triggered_by=TagAuditLog.TriggeredBy.SYSTEM_CRON):
    all_ids = list(Company.objects.values_list("id", flat=True))
    return evaluate_companies(all_ids, triggered_by=triggered_by)
