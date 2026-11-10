"""Recovery of automated progressions that a guard held back."""
import logging

from django.db import IntegrityError, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

TERMINAL = ("REJECTED", "WITHDRAWN", "OFFER_DECLINED")


def guard_block(application, target_status):
    """The combined workflow + eligibility guard for an automated move."""
    from .services import eligibility_progression_block_detail, workflow_transition_block_detail

    return (
        workflow_transition_block_detail(application, target_status)
        or eligibility_progression_block_detail(application)
    )


def record_held_transition(application, *, source, target_status, reason):
    """Remember a blocked automated move so it is retried and visible."""
    from .models import HeldTransition

    try:
        with transaction.atomic():
            hold, created = HeldTransition.objects.get_or_create(
                application=application,
                source=source,
                target_status=target_status,
                status=HeldTransition.Status.OPEN,
                defaults={"from_status": application.status, "reason": reason[:1000]},
            )
    except IntegrityError:
        hold = HeldTransition.objects.filter(
            application=application, source=source, target_status=target_status,
            status=HeldTransition.Status.OPEN,
        ).first()
        created = False
    if hold and not created and hold.reason != reason[:1000]:
        hold.reason = reason[:1000]
        hold.save(update_fields=("reason", "updated_at"))
    return hold


def _follow_up(hold, application):
    """Run the side effect the original automated path would have run."""
    from .models import JobApplication

    status = JobApplication.JobApplicationStatus
    if hold.source == "resume_screening":
        from .models import Job
        from .tasks import ACCEPTANCE_MAIL_DELAY_SECONDS, send_assessment_link

        job = application.job
        if job.hiring_engine != Job.HiringEngine.CONFIGURABLE or "assessment" in job.get_workflow_configuration()["stages"]:
            send_assessment_link.apply_async(args=[application.id], countdown=ACCEPTANCE_MAIL_DELAY_SECONDS)
    elif hold.source == "assessment" and hold.target_status == status.AI_INTERVIEW:
        from ai_interviews.services import provision_ai_interview

        provision_ai_interview(application.job, application)
    elif hold.source in ("assessment", "ai_interview") and hold.target_status == status.INTERVIEW_SCHEDULED:
        from .tasks import send_interview_slot_invite

        send_interview_slot_invite.delay(application.id)


def retry_hold(hold, *, user=None):
    """Re-check one hold; apply the move if the guards now pass.

    Returns ``"resolved"``, ``"superseded"`` or ``"blocked"``.
    """
    from .models import HeldTransition, JobApplication

    with transaction.atomic():
        hold = HeldTransition.objects.select_for_update().select_related("application__job").get(id=hold.id)
        if hold.status != HeldTransition.Status.OPEN:
            return "superseded"
        application = JobApplication.objects.select_for_update().select_related("job").get(id=hold.application_id)
        hold.attempts += 1
        hold.last_checked_at = timezone.now()

        if application.status != hold.from_status or application.status in TERMINAL:
            hold.status = HeldTransition.Status.RESOLVED
            hold.resolved_at = timezone.now()
            hold.resolution_note = "Application moved on before the hold cleared; no change made."
            hold.save()
            return "superseded"

        block = guard_block(application, hold.target_status)
        if block:
            hold.reason = block[:1000]
            hold.save(update_fields=("reason", "attempts", "last_checked_at", "updated_at"))
            return "blocked"

        JobApplication.objects.filter(id=application.id, status=hold.from_status).update(status=hold.target_status)
        hold.status = HeldTransition.Status.RESOLVED
        hold.resolved_at = timezone.now()
        hold.resolved_by = user
        hold.resolution_note = "Guards cleared; automated progression applied."
        hold.save()
        transaction.on_commit(lambda: _run_follow_up(hold.id))
    return "resolved"


def _run_follow_up(hold_id):
    from .models import HeldTransition

    hold = HeldTransition.objects.select_related("application__job").get(id=hold_id)
    try:
        _follow_up(hold, hold.application)
    except Exception:  # noqa: BLE001
        logger.exception("Follow-up after released hold %s failed", hold_id)
        from .models import HeldTransition as H

        H.objects.filter(id=hold_id).update(
            resolution_note="Progression applied, but the candidate message failed; resend manually."
        )
