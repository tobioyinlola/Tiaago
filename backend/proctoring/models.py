import uuid

from django.db import models

from create_user.models import TalentProfile
from jobs.models import Job
from skill_assessment.models import CandidateAssessmentSubmission


class ProctoringSession(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        TERMINATED = "TERMINATED", "Terminated"

    class RiskLevel(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment_attempt = models.OneToOneField(
        CandidateAssessmentSubmission, related_name="proctoring_session", on_delete=models.CASCADE
    )
    # Both null for a standalone (non-job) assessment invite -- see
    # GeneralSkillAssessment.invited_email/invited_name, the account-less
    # identity for that path (no TalentProfile is ever created for it).
    candidate = models.ForeignKey(
        TalentProfile, related_name="proctoring_sessions", on_delete=models.CASCADE, null=True, blank=True
    )
    job = models.ForeignKey(
        Job, related_name="proctoring_sessions", on_delete=models.CASCADE, null=True, blank=True
    )

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)

    integrity_score = models.PositiveSmallIntegerField(null=True, blank=True)
    risk_level = models.CharField(max_length=10, choices=RiskLevel.choices, null=True, blank=True)
    terminated_reason = models.CharField(max_length=255, null=True, blank=True)

    # Proctoring settings as configured on the job at the moment this session
    # was created -- captured here (not looked up live from Job) so a
    # recruiter's report stays accurate even if job settings change later.
    settings_snapshot = models.JSONField(default=dict)

    # IP + best-effort geolocation, captured once at session creation
    # (see proctoring.views.CreateProctoringSessionView). Geo lookup is a
    # separate best-effort step -- ip_address can be set with location
    # still empty if the lookup failed or was skipped.
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ProctoringSession({self.id}) - {self.status}"


class ProctoringEvent(models.Model):
    class EventType(models.TextChoices):
        TAB_HIDDEN = "TAB_HIDDEN", "Tab hidden"
        TAB_RESTORED = "TAB_RESTORED", "Tab restored"
        WINDOW_BLURRED = "WINDOW_BLURRED", "Window blurred"
        WINDOW_FOCUSED = "WINDOW_FOCUSED", "Window focused"
        FULLSCREEN_EXITED = "FULLSCREEN_EXITED", "Fullscreen exited"
        FULLSCREEN_ENTERED = "FULLSCREEN_ENTERED", "Fullscreen entered"
        COPY_DETECTED = "COPY_DETECTED", "Copy detected"
        PASTE_DETECTED = "PASTE_DETECTED", "Paste detected"
        RIGHT_CLICK_BLOCKED = "RIGHT_CLICK_BLOCKED", "Right click blocked"
        DEVTOOLS_DETECTED = "DEVTOOLS_DETECTED", "Developer tools detected"
        # Webcam/face-detection event types -- defined now so the Phase 2
        # (webcam) build doesn't need its own schema migration just to add
        # enum members. Never emitted by Phase 1 client code.
        MULTIPLE_FACES_DETECTED = "MULTIPLE_FACES_DETECTED", "Multiple faces detected"
        NO_FACE_DETECTED = "NO_FACE_DETECTED", "No face detected"
        FACE_NOT_CENTRED = "FACE_NOT_CENTRED", "Face not centred"
        WEBCAM_DENIED = "WEBCAM_DENIED", "Webcam permission denied"
        WEBCAM_DISCONNECTED = "WEBCAM_DISCONNECTED", "Webcam disconnected"
        SCREENSHOT_ATTEMPT = "SCREENSHOT_ATTEMPT", "Screenshot attempt"
        KEYBOARD_SHORTCUT_BLOCKED = "KEYBOARD_SHORTCUT_BLOCKED", "Keyboard shortcut blocked"
        IDLE_DETECTED = "IDLE_DETECTED", "Idle detected"
        RAPID_ANSWERING = "RAPID_ANSWERING", "Rapid answering"
        FORCED_SUBMISSION = "FORCED_SUBMISSION", "Forced submission"

    class Severity(models.TextChoices):
        INFO = "INFO", "Info"
        WARNING = "WARNING", "Warning"
        VIOLATION = "VIOLATION", "Violation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ProctoringSession, related_name="events", on_delete=models.CASCADE)
    event_type = models.CharField(max_length=30, choices=EventType.choices, db_index=True)
    occurred_at = models.DateTimeField()
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.INFO, db_index=True)

    class Meta:
        ordering = ("occurred_at",)

    def __str__(self):
        return f"{self.event_type} @ {self.occurred_at}"
