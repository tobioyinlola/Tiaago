import uuid
from django.db import models

from create_user.models import (
    TalentProfile,
    Company
)


class Scheduler(models.Model):
    class InterviewType(models.TextChoices):
        IN_HOUSE = "IN_HOUSE", "In-house"
        GOOGLE_MEET = "GOOGLE_MEET", "Google Meet"

    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        ROOM_CREATED = "ROOM_CREATED", "Room created"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        NO_SHOW = "NO_SHOW", "No show"

    class RecordingStatus(models.TextChoices):
        NONE = "NONE", "None"
        UPLOADING = "UPLOADING", "Uploading"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    class TranscriptionStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    title = models.CharField(max_length=255)
    meeting_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    room_id = models.UUIDField(default=uuid.uuid4, editable=True, null=True, blank=True)
    room_name = models.CharField(max_length=45, blank=True, default='')
    room_url = models.URLField(blank=True, null=True)
    no_of_participants = models.PositiveIntegerField(
        default=5
    )
    accepted = models.BooleanField(default=None, null=True, blank=True)
    # The owner-scoped Daily.co meeting token from provision_daily_room --
    # kept for backward compatibility with the pre-copilot manual-scheduler
    # flow (ScheduleMeetingModal). New interview-copilot code should not
    # rely on this for the recruiter/candidate join experience -- it mints
    # fresh, participant-scoped tokens on demand instead (see
    # scheduler.services.create_meeting_token), since a token embedded in a
    # long-lived shareable link would need to outlive Daily.co's nbf/exp
    # window, which token can't safely do.
    token = models.TextField(blank=True, default="")
    description = models.TextField(max_length=500)
    additional_emails = models.TextField(max_length=500, default="", blank=True)
    reminder_task_id = models.CharField(max_length=255, blank=True, null=True, help_text="Celery task ID for reminder email")
    others_task_id = models.CharField(max_length=255, blank=True, null=True, help_text="Celery task ID for others email")
    talent = models.ForeignKey(
        TalentProfile,
        related_name="schedules",
        on_delete=models.CASCADE,
    )
    company = models.ForeignKey(
        Company,
        related_name="schedules",
        on_delete=models.CASCADE
    )
    created_on = models.DateTimeField(auto_now_add=True)

    # -- Interview Copilot fields -------------------------------------------
    # Persistent, unique, URL-safe lookup keys used in shareable join links
    # (e.g. /interview/join/<candidate_join_token>) -- distinct from the
    # Daily.co meeting token above (`token`), which is short-lived and
    # participant-scoped. Generated once at room-creation time.
    recruiter_join_token = models.CharField(max_length=64, unique=True, null=True, blank=True, db_index=True)
    candidate_join_token = models.CharField(max_length=64, unique=True, null=True, blank=True, db_index=True)
    interview_type = models.CharField(max_length=15, choices=InterviewType.choices, default=InterviewType.IN_HOUSE)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    recording_enabled = models.BooleanField(default=False)
    recording_id = models.CharField(max_length=255, blank=True, null=True, help_text="Daily.co recording id, used to poll for completion")
    recording_url = models.URLField(blank=True, null=True)
    recording_status = models.CharField(max_length=15, choices=RecordingStatus.choices, default=RecordingStatus.NONE)
    transcript_raw = models.TextField(blank=True, null=True)
    transcript_structured = models.JSONField(null=True, blank=True)
    transcription_status = models.CharField(
        max_length=15, choices=TranscriptionStatus.choices, default=TranscriptionStatus.PENDING
    )
    copilot_enabled = models.BooleanField(default=True)
    duration_minutes = models.PositiveIntegerField(default=45)
    actual_duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    # Set the first time a candidate successfully joins the Daily.co room --
    # distinct from `accepted`/`started_at`, and used to (a) drive the
    # recruiter's "candidate is waiting" alert exactly once and (b) let the
    # interviews list distinguish LIVE (candidate present) from SCHEDULED.
    candidate_joined_at = models.DateTimeField(null=True, blank=True)
    # Set when the candidate ticks the recording-consent checkbox on the
    # join page and successfully joins -- null means no consent was ever
    # captured (either recording wasn't enabled, or they haven't joined yet).
    candidate_consent_given_at = models.DateTimeField(null=True, blank=True)

    interview_package_charged = models.BooleanField(default=False)
    interview_package_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    recording_addon_charged = models.BooleanField(default=False)
    recording_addon_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # True when this interview was covered by the organisation's first-3-
    # interviews free allowance instead of being charged -- see
    # subscriptions.billing_service.BillingService.charge_interview_package.
    free_allowance_used = models.BooleanField(default=False)

    # Celery task ids for cancellable scheduled jobs tied to this interview,
    # mirroring reminder_task_id/others_task_id above.
    retry_room_creation_task_id = models.CharField(max_length=255, blank=True, null=True)
    recruiter_reminder_task_id = models.CharField(max_length=255, blank=True, null=True)
    candidate_reminder_task_id = models.CharField(max_length=255, blank=True, null=True)
    room_deletion_task_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.title + ' ' + \
            self.start_time.strftime('%H:%M') + ' ' + self.end_time.strftime('%H:%M') + ' on ' + self.meeting_date.strftime('%Y-%m-%d %H:%M')

    def get_job_application(self):
        """Best-effort resolution of the JobApplication this interview is
        for, via InterviewScreening -> TalentScreening -> JobApplication.
        Returns None for the older job-application-less manual-scheduler
        flow (ScheduleMeetingModal), which has no such chain."""
        screening = getattr(self, "interviewscreening", None)
        if not screening:
            return None
        return screening.talent_screening.job_application

    @property
    def job_title(self):
        application = self.get_job_application()
        return application.job.title if application else None


class InterviewPreparation(models.Model):
    """AI-generated interview brief for a recruiter: candidate snapshot,
    career timeline, strengths/watch-areas pulled from resume+assessment
    data, and a suggested question set. Generation itself (the AI pipeline
    that fills this in) is out of scope here -- this is the schema the
    brief lands in, starting at generation_status=PENDING."""

    class GenerationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        GENERATING = "GENERATING", "Generating"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    interview = models.OneToOneField(Scheduler, on_delete=models.CASCADE, related_name="preparation")
    candidate_snapshot = models.JSONField(default=list, blank=True, help_text="Array of up to 3 short strings")
    career_timeline = models.JSONField(default=list, blank=True, help_text="Array of {title, company, period, ...} objects")
    strengths = models.JSONField(default=list, blank=True, help_text="Array of {text, source} objects")
    watch_areas = models.JSONField(default=list, blank=True, help_text="Array of {text, source, suggested_probe} objects")
    suggested_focus = models.JSONField(default=list, blank=True, help_text="Array of strings")
    assessment_highlights = models.JSONField(default=dict, blank=True)
    # No "job competencies" model exists in this codebase (see
    # InterviewCompetencyScore's docstring below) -- generation infers a
    # small, role-appropriate competency set itself. Array of
    # {id, name, required: bool, weight: float}; questions[].competency_id
    # references these by id. Used to seed InterviewCompetencyScore rows
    # for the workspace scorecard.
    competencies = models.JSONField(default=list, blank=True)
    questions = models.JSONField(
        default=list, blank=True,
        help_text=(
            "Array of {id, number, text, type, competency_id, intent, "
            "good_answer_indicators: [], followup_prompts: [], "
            "was_asked: bool, timestamp: str|null}"
        ),
    )
    generated_at = models.DateTimeField(null=True, blank=True)
    model_used = models.CharField(max_length=100, blank=True, default="")
    recruiter_edited_at = models.DateTimeField(null=True, blank=True)
    generation_status = models.CharField(
        max_length=15, choices=GenerationStatus.choices, default=GenerationStatus.PENDING
    )

    def __str__(self):
        return f"Preparation for {self.interview_id}"


class InterviewNote(models.Model):
    """Recruiter's freeform live notes for an interview, autosaved as they type."""

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    interview = models.OneToOneField(Scheduler, on_delete=models.CASCADE, related_name="notes")
    content_rich = models.TextField(blank=True, default="")
    content_plain = models.TextField(blank=True, default="")
    auto_saved_at = models.DateTimeField(null=True, blank=True)
    last_edited_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Notes for {self.interview_id}"


class InterviewCompetencyScore(models.Model):
    """A recruiter's (optionally AI-assisted) score for one competency on
    one interview. No `competency` model exists in this codebase yet, so
    `competency_id` is a loose reference (whatever id the job's competency
    framework uses elsewhere) rather than a real FK -- `competency_name`
    is denormalised alongside it precisely so this row stays meaningful
    even without a resolvable competency record."""

    class ScoreType(models.TextChoices):
        NUMERIC = "NUMERIC", "Numeric"
        STAR = "STAR", "Star"
        PASS_FAIL = "PASS_FAIL", "Pass/Fail"
        PERCENT = "PERCENT", "Percent"

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    interview = models.ForeignKey(Scheduler, on_delete=models.CASCADE, related_name="competency_scores")
    competency_id = models.CharField(max_length=100, blank=True, default="")
    competency_name = models.CharField(max_length=255)
    score_raw = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    score_normalised = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    score_type = models.CharField(max_length=15, choices=ScoreType.choices, default=ScoreType.NUMERIC)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    # Drives the scorecard's Required/Optional badge and the "must be
    # scored before submitting" validation -- seeded from
    # InterviewPreparation.competencies, itself AI-inferred since no job
    # competency model exists (see that field's docstring).
    required = models.BooleanField(default=True)
    ai_suggested_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    ai_evidence = models.JSONField(default=list, blank=True, help_text="Array of {quote, timestamp, ...} objects")
    recruiter_notes = models.TextField(blank=True, null=True)
    scored_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["interview", "competency_id"], name="unique_interview_competency"),
        ]

    def __str__(self):
        return f"{self.competency_name} score for {self.interview_id}"


class InterviewSummary(models.Model):
    """AI-drafted (recruiter-editable) post-interview summary and hiring
    recommendation. Generation is out of scope here -- schema only."""

    class GenerationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        GENERATING = "GENERATING", "Generating"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    class Recommendation(models.TextChoices):
        STRONG_YES = "STRONG_YES", "Strong yes"
        YES = "YES", "Yes"
        MAYBE = "MAYBE", "Maybe"
        NO = "NO", "No"
        STRONG_NO = "STRONG_NO", "Strong no"

    class Confidence(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    interview = models.OneToOneField(Scheduler, on_delete=models.CASCADE, related_name="summary")
    executive_summary = models.TextField(blank=True, default="")
    strengths = models.JSONField(default=list, blank=True, help_text="Array of strings")
    concerns = models.JSONField(default=list, blank=True, help_text="Array of {text, severity} objects")
    recommendation = models.CharField(max_length=15, choices=Recommendation.choices, null=True, blank=True)
    confidence = models.CharField(max_length=10, choices=Confidence.choices, null=True, blank=True)
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    action_items = models.JSONField(default=list, blank=True, help_text="Array of strings")
    ai_generated_at = models.DateTimeField(null=True, blank=True)
    recruiter_edited_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    generation_status = models.CharField(
        max_length=15, choices=GenerationStatus.choices, default=GenerationStatus.PENDING
    )

    def __str__(self):
        return f"Summary for {self.interview_id}"


class InterviewCandidateFeedback(models.Model):
    """Feedback message sent to the candidate after their interview."""

    class DeliveryStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SENT = "SENT", "Sent"
        DELIVERED = "DELIVERED", "Delivered"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    interview = models.OneToOneField(Scheduler, on_delete=models.CASCADE, related_name="candidate_feedback")
    candidate = models.ForeignKey(TalentProfile, on_delete=models.CASCADE, related_name="interview_feedback")
    content = models.TextField(blank=True, default="")
    sent_at = models.DateTimeField(null=True, blank=True)
    delivery_status = models.CharField(max_length=15, choices=DeliveryStatus.choices, default=DeliveryStatus.DRAFT)
    opened_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Feedback for {self.interview_id}"


class AICopilotEvent(models.Model):
    """A single suggestion/alert the AI copilot surfaced to the recruiter
    during a live interview (followup question, missing competency
    coverage, resume contradiction, time warning, evidence captured)."""

    class EventType(models.TextChoices):
        FOLLOWUP_QUESTION = "FOLLOWUP_QUESTION", "Follow-up question"
        MISSING_COMPETENCY = "MISSING_COMPETENCY", "Missing competency"
        RESUME_CONTRADICTION = "RESUME_CONTRADICTION", "Resume contradiction"
        TIME_WARNING = "TIME_WARNING", "Time warning"
        EVIDENCE_CAPTURED = "EVIDENCE_CAPTURED", "Evidence captured"

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    interview = models.ForeignKey(Scheduler, on_delete=models.CASCADE, related_name="copilot_events")
    event_type = models.CharField(max_length=25, choices=EventType.choices)
    content = models.TextField(blank=True, default="")
    confidence = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    trigger_context = models.JSONField(default=dict, blank=True)
    shown_at = models.DateTimeField(null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.event_type} for {self.interview_id}"


class InterviewTranscriptSegment(models.Model):
    """One speaker-attributed segment of the live transcript."""

    class Speaker(models.TextChoices):
        RECRUITER = "RECRUITER", "Recruiter"
        CANDIDATE = "CANDIDATE", "Candidate"
        UNKNOWN = "UNKNOWN", "Unknown"

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    interview = models.ForeignKey(Scheduler, on_delete=models.CASCADE, related_name="transcript_segments")
    speaker = models.CharField(max_length=10, choices=Speaker.choices, default=Speaker.UNKNOWN)
    text = models.TextField(blank=True, default="")
    start_ms = models.PositiveIntegerField()
    end_ms = models.PositiveIntegerField()
    confidence = models.DecimalField(max_digits=3, decimal_places=2, default=0.9)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("start_ms",)

    def __str__(self):
        return f"{self.speaker} segment for {self.interview_id}"


class CompanyInterviewSettings(models.Model):
    """Per-company defaults for the Interview Copilot feature, edited from
    /recruiter/dashboard/settings/interviews. No existing per-company
    settings container exists in this codebase to extend (Company itself
    has only concrete/typed fields) -- this mirrors Wallet's own
    OneToOneField-to-Company pattern rather than adding a generic JSON blob.

    Actively enforced today: ai_copilot_enabled (gates live suggestion
    generation) and default_duration_minutes (fallback when scheduling a
    new interview). The recording/retention/notification fields are real,
    saved preferences but not yet read by any enforcement code path -- see
    each field's own note."""

    class RetentionDays(models.IntegerChoices):
        THIRTY = 30, "30 days"
        SIXTY = 60, "60 days"
        NINETY = 90, "90 days"

    class DefaultDuration(models.IntegerChoices):
        THIRTY = 30, "30 minutes"
        FORTY_FIVE = 45, "45 minutes"
        SIXTY = 60, "60 minutes"

    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="interview_settings")

    recording_enabled_default = models.BooleanField(default=False)
    # Not yet enforced -- no periodic cleanup task reads this today.
    recording_retention_days = models.PositiveIntegerField(
        choices=RetentionDays.choices, default=RetentionDays.NINETY
    )

    ai_copilot_enabled = models.BooleanField(default=True)
    copilot_live_transcription_enabled = models.BooleanField(default=True)
    copilot_suggestions_enabled = models.BooleanField(default=True)
    copilot_evidence_capture_enabled = models.BooleanField(default=True)
    copilot_post_interview_summary_enabled = models.BooleanField(default=True)

    default_duration_minutes = models.PositiveIntegerField(
        choices=DefaultDuration.choices, default=DefaultDuration.FORTY_FIVE
    )

    # Not yet enforced -- notification send sites don't check these yet.
    notify_recruiter_reminder = models.BooleanField(default=True)
    notify_recruiter_summary_ready = models.BooleanField(default=True)
    notify_candidate_feedback_sent = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Interview settings for {self.company.company_name}"