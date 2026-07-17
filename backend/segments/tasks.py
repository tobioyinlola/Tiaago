import logging

from celery import shared_task
from django.utils import timezone

from segments.evaluation import evaluate_segment
from segments.models import AudienceSegment

logger = logging.getLogger(__name__)


@shared_task(name="segments.tasks.refresh_all_segment_sizes")
def refresh_all_segment_sizes():
    """Hourly cron entry point (runs 5 minutes after the tag rule engine, so
    segment sizes reflect that run's tag changes) -- keeps estimated_size
    fresh even for segments nobody has opened in the admin UI."""
    updated = 0
    for segment in AudienceSegment.objects.all():
        qs = evaluate_segment(segment.conditions, segment.match_type)
        segment.estimated_size = qs.count()
        segment.last_evaluated_at = timezone.now()
        segment.save(update_fields=["estimated_size", "last_evaluated_at"])
        updated += 1
    logger.info(f"[segments] Refreshed estimated size for {updated} segments.")
    return {"updated": updated}
