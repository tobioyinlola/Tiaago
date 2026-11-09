"""Cross-cutting JobApplication-lifecycle helpers that need to reach into
sibling apps (ai_interviews, scheduler) -- kept out of jobs/models.py and
jobs/tasks.py to avoid circular imports at module load time (those apps
already import from jobs.models), so every call here uses a local import
instead."""
import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


# This deliberately small, reviewed catalogue is the first eligibility
# release. It covers the requirements repeatedly needed by professional,
# frontline and field roles without pretending an applicant declaration is a
# regulator or issuer verification. New requirement types require a product
# and policy review rather than accepting arbitrary recruiter-entered JSON.
ELIGIBILITY_REQUIREMENT_CATALOG = {
    "right-to-work": {
        "label": "Right to work",
        "description": "I am authorised to work in the role's stated location.",
    },
    "driving-licence": {
        "label": "Valid driving licence",
        "description": "I hold the valid licence required for this driving role.",
    },
    "safety-training": {
        "label": "Required safety training",
        "description": "I hold the required safety training for this role or site.",
    },
    "site-medical-clearance": {
        "label": "Site or medical clearance",
        "description": "I can provide the required site or medical clearance when requested.",
    },
    "professional-designation": {
        "label": "Professional designation",
        "description": "I hold the professional designation required for this role.",
    },
}


def normalise_eligibility_requirements(value):
    """Return immutable requirement snapshots suitable for a Job JSON field.

    The data contract is intentionally constrained to catalogue codes and a
    required flag. That avoids allowing arbitrary text to become a hidden,
    selection-critical application requirement without review.
    """
    if not isinstance(value, list):
        raise ValueError("Eligibility requirements must be a list.")
    if len(value) > len(ELIGIBILITY_REQUIREMENT_CATALOG):
        raise ValueError("Too many eligibility requirements were provided.")

    snapshots = []
    seen_codes = set()
    for item in value:
        if not isinstance(item, dict):
            raise ValueError("Each eligibility requirement must be an object.")
        if set(item) - {"code", "required"}:
            raise ValueError("Eligibility requirement contains an unsupported setting.")
        code = item.get("code")
        required = item.get("required")
        if code not in ELIGIBILITY_REQUIREMENT_CATALOG:
            raise ValueError("An unsupported eligibility requirement was selected.")
        if code in seen_codes:
            raise ValueError("Eligibility requirements must not be duplicated.")
        if not isinstance(required, bool):
            raise ValueError("Eligibility requirement 'required' must be true or false.")
        seen_codes.add(code)
        catalogue_entry = ELIGIBILITY_REQUIREMENT_CATALOG[code]
        snapshots.append({
            "code": code,
            "label": catalogue_entry["label"],
            "description": catalogue_entry["description"],
            "required": required,
        })
    return snapshots


def profile_eligibility_requirements(profile):
    """Return a validated profile default as job-safe snapshots."""
    defaults = profile.eligibility_defaults or {}
    return normalise_eligibility_requirements(defaults.get("requirements", []))


def normalise_eligibility_declarations(requirements, declarations):
    """Validate candidate answers against the requirements published for a job.

    A declaration is not a verification result. It simply records which
    published requirement the candidate says they meet before a reviewer
    records the final outcome.
    """
    if declarations is None:
        return {}
    if not isinstance(declarations, dict) or any(
        not isinstance(declaration, bool) for declaration in declarations.values()
    ):
        raise ValueError(
            "Eligibility declarations must be a map of requirement codes to true or false."
        )

    known_codes = {requirement["code"] for requirement in requirements}
    if set(declarations) - known_codes:
        raise ValueError("An unknown eligibility requirement was submitted.")
    return declarations


def _eligibility_outcome(requirement, declarations):
    """Map a self-declaration to a review state without treating it as proof."""
    declaration = declarations.get(requirement["code"]) if isinstance(declarations, dict) else None
    if declaration is True:
        # A positive declaration still requires a human to review the
        # applicable evidence. It must never be represented as a verified
        # credential simply because the candidate ticked a box.
        return declaration, "PENDING"
    if declaration is False:
        return declaration, "FAIL" if requirement["required"] else "NOT_APPLICABLE"
    return None, "NEEDS_REVIEW" if requirement["required"] else "NOT_APPLICABLE"


def sync_application_eligibility_checks(application, declarations=None):
    """Materialise/update checks for a newly created application.

    Called from the JobApplication creation signal so every existing intake
    route gets checks. Submit serializers call it a second time with actual
    declarations; a reviewer-owned result is never overwritten.
    """
    from .models import ApplicationEligibilityCheck

    requirements = application.job.get_eligibility_requirements()
    for requirement in requirements:
        declaration, status = _eligibility_outcome(requirement, declarations or {})
        check, created = ApplicationEligibilityCheck.all_objects.get_or_create(
            application=application,
            requirement_code=requirement["code"],
            defaults={
                "requirement_label": requirement["label"],
                "requirement_description": requirement["description"],
                "is_required": requirement["required"],
                "declaration": declaration,
                "status": status,
            },
        )
        if not created and check.reviewed_at is None:
            check.requirement_label = requirement["label"]
            check.requirement_description = requirement["description"]
            check.is_required = requirement["required"]
            check.declaration = declaration
            check.status = status
            check.save(
                update_fields=(
                    "requirement_label",
                    "requirement_description",
                    "is_required",
                    "declaration",
                    "status",
                    "updated_at",
                )
            )


def review_application_eligibility_check(check, *, status, reviewer, reason=""):
    """Record an authorised human decision and its audit context."""
    check.status = status
    check.reviewer = reviewer
    check.reviewer_reason = reason.strip()
    check.reviewed_at = timezone.now()
    check.save(update_fields=("status", "reviewer", "reviewer_reason", "reviewed_at", "updated_at"))
    return check


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
