"""Cross-cutting JobApplication-lifecycle helpers that need to reach into
sibling apps (ai_interviews, scheduler) -- kept out of jobs/models.py and
jobs/tasks.py to avoid circular imports at module load time (those apps
already import from jobs.models), so every call here uses a local import
instead."""
import logging

logger = logging.getLogger(__name__)


def cancel_pending_tasks_for_rejected_application(job_application_id):
    """Called from every place a JobApplication transitions to REJECTED
    (manual recruiter action, an AI-interview decision override, or a human
    interview review) so a candidate who's already been turned down doesn't
    still have an interview go ahead just because it was scheduled before
    the rejection landed.

    Cancels anything not yet finished -- AIInterview rows still holding an
    agent slot (see ai_interviews.services.allocate_ai_interview_slot's
    slot_holding_statuses) and Scheduler rows for a human interview that
    hasn't happened yet. Completed/terminal rows are left untouched."""
    from ai_interviews.models import AIInterview
    from scheduler.models import Scheduler

    cancelled_ai = AIInterview.objects.filter(
        job_application_id=job_application_id,
        status__in=[AIInterview.Status.INVITED, AIInterview.Status.SCHEDULED, AIInterview.Status.WAITING],
    ).update(status=AIInterview.Status.CANCELLED)

    cancelled_human = Scheduler.objects.filter(
        job_application_id=job_application_id,
        status__in=[Scheduler.Status.SCHEDULED, Scheduler.Status.ROOM_CREATED],
    ).update(status=Scheduler.Status.CANCELLED)

    if cancelled_ai or cancelled_human:
        logger.info(
            "Cancelled pending interviews for rejected job_application %s: %s AI, %s human",
            job_application_id, cancelled_ai, cancelled_human,
        )
