from celery import shared_task
from loguru import logger

from base.utils import lookup_geo
from .models import ProctoringSession


@shared_task(name="resolve_proctoring_session_geo")
def resolve_proctoring_session_geo(session_id):
    """Best-effort IP geolocation for a proctoring session, run out-of-band
    so the "Begin assessment" request the candidate is waiting on never
    blocks on an external API call."""
    session = ProctoringSession.objects.filter(id=session_id).first()
    if not session or not session.ip_address:
        return
    location = lookup_geo(session.ip_address)
    if location:
        session.location = location
        session.save(update_fields=["location", "updated_at"])
    else:
        logger.info("No geo data resolved for proctoring session %s", session_id)
