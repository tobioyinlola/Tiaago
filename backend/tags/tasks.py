import logging

from celery import shared_task
from django.core.cache import cache
from django.utils import timezone

from tags.models import TagAuditLog
from tags.rule_engine import evaluate_companies, run_full_evaluation

logger = logging.getLogger(__name__)

LAST_RULE_RUN_CACHE_KEY = "tags_last_rule_engine_run"


@shared_task(name="tags.tasks.run_tag_rule_engine")
def run_tag_rule_engine():
    """Hourly cron entry point -- evaluates every system tag rule against
    every organisation. See talentsync_backend/celery.py's beat_schedule."""
    results = run_full_evaluation(triggered_by=TagAuditLog.TriggeredBy.SYSTEM_CRON)
    total_applied = sum(added for added, _removed in results.values())
    total_removed = sum(removed for _added, removed in results.values())
    logger.info(f"[tags] Hourly rule engine run: +{total_applied} / -{total_removed} across {len(results)} rules.")
    # No timeout -- this is a "when did the engine last run" marker, not a
    # short-lived computed-value cache like analytics/utils.py's boards.
    cache.set(LAST_RULE_RUN_CACHE_KEY, timezone.now(), timeout=None)
    return {"applied": total_applied, "removed": total_removed, "rules_evaluated": len(results)}


def get_last_rule_run():
    return cache.get(LAST_RULE_RUN_CACHE_KEY)


@shared_task(bind=True, max_retries=3, default_retry_delay=30, name="tags.tasks.evaluate_company_tags")
def evaluate_company_tags(self, company_id):
    """Immediate re-evaluation for a single company, triggered right after an
    action that could change tag eligibility (first resume screen, wallet
    funding, first assessment completion, login) instead of waiting for the
    next hourly tick."""
    try:
        evaluate_companies([company_id], triggered_by=TagAuditLog.TriggeredBy.SYSTEM_CRON)
    except Exception as exc:
        logger.error(f"[tags] Immediate evaluation failed for company {company_id}: {exc}")
        raise self.retry(exc=exc)
