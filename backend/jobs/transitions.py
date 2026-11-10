"""Recovery of automated progressions that a guard held back."""
import logging

from django.db import IntegrityError, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

TERMINAL = ("REJECTED", "WITHDRAWN", "OFFER_DECLINED")


# Statuses nothing may leave. WITHDRAWN and OFFER_DECLINED are the candidate's
# decisions; REJECTED is the hiring team's (the board already locks it);
# OFFER_ACCEPTED hands over to the readiness record rather than the pipeline.
CLOSED_STATUSES = ("REJECTED", "WITHDRAWN", "OFFER_DECLINED", "OFFER_ACCEPTED")
# Moves that always remain available (they end or answer the process) and so
# bypass the progression guards; their own preconditions are checked below.
NON_PROGRESSING_TARGETS = ("APPLIED", "REJECTED", "WITHDRAWN", "OFFER_DECLINED", "OFFER_ACCEPTED")
INTERVIEW_FAMILY = (
    "PENDING_DECISION", "AI_INTERVIEW", "INTERVIEW_SCHEDULED", "HUMAN_INTERVIEW",
    "INTERVIEW_COMPLETED", "SECOND_INTERVIEW",
)
# Where an offer may be extended from. A job whose published workflow has no
# interview stage may also extend from the screen/assessment stage.
OFFER_SOURCES = INTERVIEW_FAMILY


def guard_block(application, target_status):
    """The combined workflow + eligibility guard for an automated move."""
    from .services import eligibility_progression_block_detail, workflow_transition_block_detail

    return (
        workflow_transition_block_detail(application, target_status)
        or eligibility_progression_block_detail(application)
    )


def transition_block(application, target_status, *, actor="recruiter"):
    """Why ``application`` may not move to ``target_status`` ("" if it may).

    One definition of an allowed move, shared by the board API, the automated
    scoring/decision tasks and the recruiter review endpoints, so no route can
    skip the published workflow, an eligibility/evidence gate, or a stage.
    ``actor`` is "recruiter", "automation" or "candidate".
    """
    current = application.status
    if target_status == current:
        return ""
    if current in CLOSED_STATUSES:
        label = current.replace("_", " ").lower()
        return f"This application is {label} and can no longer be moved."
    if target_status in ("REJECTED",):
        return ""
    if target_status in ("OFFER_ACCEPTED", "OFFER_DECLINED"):
        if actor != "candidate":
            return "Only the candidate can accept or decline an offer."
        return "" if current == "OFFER_EXTENDED" else "Only an extended offer can be accepted or declined."
    if target_status == "WITHDRAWN":
        return ""
    if target_status == "APPLIED":
        return "An application cannot be moved back to applied."
    if (
        actor == "automation"
        and PIPELINE_ORDER.get(target_status, 0) < PIPELINE_ORDER.get(current, 0)
    ):
        # A late scoring task must never drag back a candidate a person has
        # already moved further along. (Recruiters may move back deliberately.)
        return "Automation does not move a candidate backwards."

    if target_status == "OFFER_EXTENDED":
        sources = set(OFFER_SOURCES)
        if "interview" not in application.job.get_workflow_configuration()["stages"]:
            sources |= {"REVIEWED"}
        if current not in sources:
            return "An offer can only be extended after the interview stage."

    return guard_block(application, target_status)


# Funnel position for forward-only automation. Statuses sharing a number are
# alternative entries to the same step.
PIPELINE_ORDER = {
    "APPLIED": 0, "REVIEWED": 1, "PENDING_DECISION": 2, "AI_INTERVIEW": 2,
    "INTERVIEW_SCHEDULED": 3, "HUMAN_INTERVIEW": 4, "INTERVIEW_COMPLETED": 5,
    "SECOND_INTERVIEW": 6, "OFFER_EXTENDED": 7,
}


class TransitionResult:
    def __init__(self, ok, detail="", application=None, stale=False):
        self.ok, self.detail, self.application, self.stale = ok, detail, application, stale

    def __bool__(self):
        return self.ok


def apply_transition(application_id, target_status, *, actor="automation", expected_status=None,
                     held_source=None, extra_updates=None):
    """Atomically move one application, honouring every rule.

    Locks the row, rejects a stale caller (``expected_status`` no longer
    current), evaluates ``transition_block`` against the locked state and only
    then writes. A guard hold is recorded as a HeldTransition when
    ``held_source`` is given. Returns a TransitionResult; never raises for a
    refusal.
    """
    from .models import JobApplication

    with transaction.atomic():
        application = JobApplication.objects.select_for_update().select_related("job").get(id=application_id)
        if expected_status is not None and application.status != expected_status:
            return TransitionResult(
                False, "This application changed since it was loaded; refresh and try again.",
                application, stale=True,
            )
        block = transition_block(application, target_status, actor=actor)
        if block:
            if held_source and application.status not in CLOSED_STATUSES:
                record_held_transition(
                    application, source=held_source, target_status=target_status, reason=block
                )
            return TransitionResult(False, block, application)
        if application.status != target_status:
            application.status = target_status
            for field, value in (extra_updates or {}).items():
                setattr(application, field, value)
            application.save(update_fields=["status", "last_updated", *(extra_updates or {})])
    return TransitionResult(True, "", application)


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

        block = transition_block(application, hold.target_status, actor="automation")
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
