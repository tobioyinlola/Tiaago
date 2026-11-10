"""Booking policy and state changes for observed practical assessments.

The policy is published with the job (``practical_assessment_configuration
["policy"]``) so recruiters and candidates are held to the same attempt,
retest-wait, no-show and late-cancellation rules whoever makes the booking.
A recruiter may exceed the attempt/retest policy only by recording an
override reason, which is stored on the appointment.
"""
from datetime import timedelta

from django.core import signing
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

POLICY_DEFAULTS = {
    "self_booking": False,
    "max_attempts": 2,
    "retest_wait_days": 0,
    "no_show_counts_as_attempt": True,
    "cancellation_cutoff_hours": 24,
}
POLICY_BOUNDS = {
    "max_attempts": (1, 5),
    "retest_wait_days": (0, 90),
    "cancellation_cutoff_hours": (0, 168),
}
BOOKING_TOKEN_SALT = "jobs.practical-booking"
BOOKING_TOKEN_MAX_AGE = 60 * 60 * 24 * 30
TERMINAL_APPLICATION_STATUSES = ("REJECTED", "WITHDRAWN", "OFFER_DECLINED")


def normalise_policy(value):
    """Validate a recruiter-supplied policy object; fill defaults."""
    if value is None:
        value = {}
    if not isinstance(value, dict):
        raise serializers.ValidationError({"policy": "Practical assessment policy must be an object."})
    unknown = set(value) - set(POLICY_DEFAULTS)
    if unknown:
        raise serializers.ValidationError(
            {"policy": f"Unsupported policy settings: {', '.join(sorted(unknown))}."}
        )
    policy = dict(POLICY_DEFAULTS)
    policy.update(value)
    for key in ("self_booking", "no_show_counts_as_attempt"):
        if not isinstance(policy[key], bool):
            raise serializers.ValidationError({"policy": f"{key} must be true or false."})
    for key, (low, high) in POLICY_BOUNDS.items():
        number = policy[key]
        if isinstance(number, bool) or not isinstance(number, int) or not low <= number <= high:
            raise serializers.ValidationError({"policy": f"{key} must be a whole number from {low} to {high}."})
    return policy


def job_policy(job):
    raw = (job.get_practical_assessment_configuration().get("policy") or {})
    policy = dict(POLICY_DEFAULTS)
    policy.update({key: raw[key] for key in POLICY_DEFAULTS if key in raw})
    return policy


# ------------------------------------------------------------------ tokens

def make_booking_token(application):
    return signing.dumps({"app": application.id}, salt=BOOKING_TOKEN_SALT)


def application_from_token(token):
    from .models import JobApplication

    try:
        payload = signing.loads(token, salt=BOOKING_TOKEN_SALT, max_age=BOOKING_TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None
    return JobApplication.objects.select_related("job__company", "applicant__user").filter(
        id=payload.get("app")
    ).first()


# ------------------------------------------------------------------ policy

def _attempts(application):
    from .models import ApplicationPracticalAssessment as A

    return list(A.objects.filter(application=application).select_related("slot").order_by("attempt_number"))


def booking_block(application, *, candidate_facing):
    """Return ``(message, overridable)`` if a new booking is not allowed.

    ``overridable`` means a recruiter may proceed by recording a reason; it is
    never true for conditions that are not about attempt/retest policy.
    """
    from .models import ApplicationPracticalAssessment as A
    from .services import required_eligibility_blockers

    policy = job_policy(application.job)
    if application.status in TERMINAL_APPLICATION_STATUSES:
        return "This application is closed, so a practical assessment cannot be booked.", False
    if not application.job.get_practical_assessment_configuration()["enabled"]:
        return "This job does not have a practical assessment enabled.", False

    attempts = _attempts(application)
    if any(a.status == A.Status.SCHEDULED for a in attempts):
        return "A practical assessment is already scheduled for this application.", False
    if any(
        a.status == A.Status.COMPLETED and a.outcome == A.Outcome.PASS and not a.critical_failure
        for a in attempts
    ):
        return "This candidate has already passed the practical assessment.", False
    if required_eligibility_blockers(application):
        return "Required eligibility reviews must be completed before a practical assessment.", False

    counted = [
        a for a in attempts
        if a.status == A.Status.COMPLETED
        or (a.status == A.Status.NO_SHOW and policy["no_show_counts_as_attempt"])
    ]
    if any(a.critical_failure for a in attempts):
        return (
            "A critical safety failure was recorded, so a retest needs the hiring team's approval.",
            True,
        )
    if len(counted) >= policy["max_attempts"]:
        return (
            f"The maximum of {policy['max_attempts']} practical assessment attempt(s) has been used.",
            True,
        )
    if counted and policy["retest_wait_days"]:
        last = counted[-1]
        anchor = last.completed_at or last.slot.ends_at
        earliest = anchor + timedelta(days=policy["retest_wait_days"])
        if earliest > timezone.now():
            return (
                f"A retest is not available until {earliest:%d %b %Y} "
                f"({policy['retest_wait_days']}-day wait after the previous attempt).",
                True,
            )
    return "", False


def available_slots(job, *, candidate_facing):
    from django.db.models import Count, F, Q
    from .models import ApplicationPracticalAssessment as A, JobPracticalAssessmentSlot

    earliest = timezone.now()
    if candidate_facing:
        earliest += timedelta(hours=job_policy(job)["cancellation_cutoff_hours"])
    return JobPracticalAssessmentSlot.objects.filter(
        job=job, is_active=True, starts_at__gt=earliest
    ).annotate(
        booked=Count("appointments", filter=Q(appointments__status=A.Status.SCHEDULED))
    ).filter(booked__lt=F("capacity"))


# ------------------------------------------------------------------ actions

def _notify(kind, appointment, note=""):
    """Queue the candidate message for an appointment event (durable outbox)."""
    from .notifications import queue_notification

    application = appointment.application
    slot = appointment.slot
    queue_notification(
        application,
        kind,
        dedupe_key=f"{kind}:{appointment.id}",
        payload={
            "title": application.job.get_practical_assessment_configuration()["title"],
            "starts_at": timezone.localtime(slot.starts_at).strftime("%A %d %B %Y, %H:%M"),
            "location": slot.location,
            "instructions": slot.instructions,
            "note": note,
        },
    )

def book_slot(application_id, slot_id, *, booked_by, override_reason=""):
    """Atomically book ``slot_id``; raises a DRF ValidationError on any rule."""
    from .models import (
        ApplicationPracticalAssessment as A,
        JobApplication,
        JobPracticalAssessmentSlot,
    )

    candidate = booked_by == A.BookedBy.CANDIDATE
    override_reason = (override_reason or "").strip()
    with transaction.atomic():
        application = JobApplication.objects.select_for_update().select_related("job").get(id=application_id)
        slot = JobPracticalAssessmentSlot.objects.select_for_update().filter(id=slot_id).first()
        error = {"slot_id": "This practical-assessment slot is no longer available."}
        if not slot or slot.job_id != application.job_id or not slot.is_active or slot.starts_at <= timezone.now():
            raise serializers.ValidationError(error)
        if candidate:
            cutoff = timedelta(hours=job_policy(application.job)["cancellation_cutoff_hours"])
            if not job_policy(application.job)["self_booking"]:
                raise serializers.ValidationError({"detail": "Self-booking is not enabled for this job."})
            if slot.starts_at <= timezone.now() + cutoff:
                raise serializers.ValidationError(
                    {"slot_id": "Choose a slot further ahead; this one is too close to book yourself."}
                )

        message, overridable = booking_block(application, candidate_facing=candidate)
        applied_override = ""
        if message:
            if candidate or not overridable or not override_reason:
                raise serializers.ValidationError({"slot_id": message})
            applied_override = override_reason[:500]

        if A.objects.filter(slot=slot, status=A.Status.SCHEDULED).count() >= slot.capacity:
            raise serializers.ValidationError({"slot_id": "This practical-assessment slot is full."})
        latest = A.objects.filter(application=application).order_by("-attempt_number").values_list(
            "attempt_number", flat=True
        ).first() or 0
        appointment = A.objects.create(
            application=application,
            slot=slot,
            attempt_number=latest + 1,
            rubric_snapshot=application.job.get_practical_assessment_configuration()["rubric"],
            booked_by=booked_by,
            policy_override_reason=applied_override,
        )
        _notify("practical_booked", appointment)
        return appointment


def cancel_appointment(appointment, *, by, reason=""):
    """Cancel a scheduled appointment. Candidates cannot cancel inside the cutoff."""
    from .models import ApplicationPracticalAssessment as A

    with transaction.atomic():
        appointment = A.objects.select_for_update().select_related("slot", "application__job").get(id=appointment.id)
        if appointment.status != A.Status.SCHEDULED:
            raise serializers.ValidationError({"detail": "Only a scheduled appointment can be cancelled."})
        if by == A.BookedBy.CANDIDATE:
            cutoff = timedelta(hours=job_policy(appointment.application.job)["cancellation_cutoff_hours"])
            if appointment.slot.starts_at - cutoff <= timezone.now():
                raise serializers.ValidationError({
                    "detail": (
                        "It is too late to cancel online. Contact the hiring team; "
                        "missing the appointment is recorded as a no-show."
                    )
                })
        appointment.status = A.Status.CANCELLED
        appointment.status_changed_by = by
        appointment.status_changed_at = timezone.now()
        appointment.status_reason = (reason or "").strip()[:500]
        appointment.save(update_fields=(
            "status", "status_changed_by", "status_changed_at", "status_reason", "updated_at",
        ))
        _notify("practical_cancelled", appointment, note=appointment.status_reason and f"Reason: {appointment.status_reason}")
    return appointment


def mark_no_show(appointment, *, reason=""):
    """Recruiter records that the candidate did not attend a started slot."""
    from .models import ApplicationPracticalAssessment as A

    with transaction.atomic():
        appointment = A.objects.select_for_update().select_related("slot").get(id=appointment.id)
        if appointment.status != A.Status.SCHEDULED:
            raise serializers.ValidationError({"detail": "Only a scheduled appointment can be marked as a no-show."})
        if appointment.slot.starts_at > timezone.now():
            raise serializers.ValidationError({"detail": "A no-show can only be recorded once the appointment has started."})
        appointment.status = A.Status.NO_SHOW
        appointment.status_changed_by = A.BookedBy.RECRUITER
        appointment.status_changed_at = timezone.now()
        appointment.status_reason = (reason or "").strip()[:500]
        appointment.save(update_fields=(
            "status", "status_changed_by", "status_changed_at", "status_reason", "updated_at",
        ))
        _notify("practical_no_show", appointment)
    return appointment
