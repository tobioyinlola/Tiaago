import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from base.models import TimeStampedModel
from create_user.models import Company, TalentProfile
from jobs.models import Job


class AIInterview(TimeStampedModel):
    """One AI-conducted voice interview (LiveKit room + OpenAI conversation)
    for a candidate who passed a job's assessment on a job with
    ai_interview_enabled=True. Mirrors scheduler.Scheduler's shape for the
    equivalent human-interview flow (room/token/transcript/billing fields)
    but is a fully separate flow -- LiveKit instead of Daily.co, fully
    automated instead of recruiter-led.
    """

    class Status(models.TextChoices):
        INVITED = "INVITED", _("Invited")
        SCHEDULED = "SCHEDULED", _("Scheduled")
        WAITING = "WAITING", _("Waiting")
        IN_PROGRESS = "IN_PROGRESS", _("In progress")
        COMPLETED = "COMPLETED", _("Completed")
        NO_SHOW = "NO_SHOW", _("No show")
        ABANDONED = "ABANDONED", _("Abandoned")
        FAILED = "FAILED", _("Failed")

    class Recommendation(models.TextChoices):
        PROCEED = "PROCEED", _("Proceed")
        DO_NOT_PROCEED = "DO_NOT_PROCEED", _("Do not proceed")
        NEEDS_REVIEW = "NEEDS_REVIEW", _("Needs review")

    class RecommendationConfidence(models.TextChoices):
        HIGH = "HIGH", _("High")
        MEDIUM = "MEDIUM", _("Medium")
        LOW = "LOW", _("Low")

    class SummaryStatus(models.TextChoices):
        PENDING = "PENDING", _("Pending")
        GENERATING = "GENERATING", _("Generating")
        READY = "READY", _("Ready")
        FAILED = "FAILED", _("Failed")

    class RecruiterDecision(models.TextChoices):
        ACCEPTED = "ACCEPTED", _("Accepted")
        OVERRIDDEN_PROCEED = "OVERRIDDEN_PROCEED", _("Overridden -- proceed")
        OVERRIDDEN_DECLINE = "OVERRIDDEN_DECLINE", _("Overridden -- decline")
        PENDING = "PENDING", _("Pending")

    class RecordingStatus(models.TextChoices):
        NONE = "NONE", _("None")
        UPLOADING = "UPLOADING", _("Uploading")
        READY = "READY", _("Ready")
        FAILED = "FAILED", _("Failed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="ai_interviews")
    # Null for is_preview=True rows (a recruiter previewing the
    # candidate-facing experience, with no real candidate attached -- see
    # services.provision_preview_ai_interview) AND for a guest applicant's
    # real interview (no TalentProfile at all -- see
    # jobs.JobApplication.applicant). Distinguish the two via job_application
    # (set for a guest's real interview, null for a true preview) rather
    # than candidate alone.
    candidate = models.ForeignKey(
        TalentProfile, on_delete=models.CASCADE, related_name="ai_interviews", null=True, blank=True
    )
    # Set for every non-preview interview (real or guest candidate) --
    # provision_ai_interview always receives the JobApplication it was
    # provisioned for. Lets guest-candidate code paths recover name/email/
    # resume from the application when `candidate` is null.
    job_application = models.ForeignKey(
        "jobs.JobApplication", on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_interviews"
    )
    organisation = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="ai_interviews")

    # True for a recruiter's own "see what the candidate would see" test
    # run -- never billed, never emailed, excluded from the real AI
    # Interviews recruiter dashboard list.
    is_preview = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_interview_previews_created"
    )

    livekit_room_name = models.CharField(max_length=100, unique=True)
    candidate_identity = models.CharField(max_length=100)

    status = models.CharField(max_length=15, choices=Status.choices, default=Status.INVITED, db_index=True)

    questions_total = models.PositiveSmallIntegerField(default=6)

    # scheduled_at/scheduled_end_at: this candidate's reserved slot with the
    # agent fleet, assigned once at provisioning time by
    # services.allocate_ai_interview_slot so no two interviews needing a
    # live agent overlap past AI_INTERVIEW_MAX_CONCURRENT_SESSIONS at once.
    # The candidate can only actually start once scheduled_at has arrived --
    # see AIInterviewStartSessionView.
    scheduled_at = models.DateTimeField(null=True, blank=True)
    scheduled_end_at = models.DateTimeField(null=True, blank=True)
    window_end_at = models.DateTimeField()
    joined_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)

    transcript_raw = models.TextField(blank=True, default="")
    transcript_structured = models.JSONField(null=True, blank=True)

    overall_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    communication_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    confidence_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    relevance_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    clarity_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    strengths = models.JSONField(default=list, blank=True, help_text="Array of strings")
    concerns = models.JSONField(default=list, blank=True, help_text="Array of {text, severity, evidence} objects")

    recommendation = models.CharField(
        max_length=15, choices=Recommendation.choices, null=True, blank=True
    )
    recommendation_confidence = models.CharField(
        max_length=10, choices=RecommendationConfidence.choices, null=True, blank=True
    )
    recommendation_reasons = models.JSONField(default=list, blank=True, help_text="Array of strings")

    flags = models.JSONField(default=list, blank=True, help_text="Array of {type, description, impact} objects")

    executive_summary = models.TextField(blank=True, default="")
    candidate_feedback = models.TextField(blank=True, default="")
    recruiter_notes = models.TextField(blank=True, default="")

    summary_status = models.CharField(
        max_length=12, choices=SummaryStatus.choices, default=SummaryStatus.PENDING
    )
    summary_error = models.TextField(blank=True, default="")

    recruiter_decision = models.CharField(
        max_length=20, choices=RecruiterDecision.choices, default=RecruiterDecision.PENDING, null=True, blank=True
    )
    recruiter_decision_at = models.DateTimeField(null=True, blank=True)
    recruiter_decision_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_interview_decisions"
    )
    recruiter_override_reason = models.TextField(blank=True, default="")

    # Billing -- charged from the same wallet.free_credits_remaining pool as
    # resume screening/assessment (free_allowance_used just records whether
    # this particular interview was covered by a free credit or charged
    # against the wallet balance) -- see billing_service.charge_ai_interview.
    billing_charged = models.BooleanField(default=False)
    billing_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    billing_charged_at = models.DateTimeField(null=True, blank=True)
    free_allowance_used = models.BooleanField(default=False)

    audio_recording_url = models.URLField(blank=True, null=True)
    audio_recording_status = models.CharField(
        max_length=12, choices=RecordingStatus.choices, default=RecordingStatus.NONE
    )

    candidate_join_token = models.CharField(max_length=64, unique=True, default=uuid.uuid4, editable=False)

    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    no_show_followup_sent_at = models.DateTimeField(null=True, blank=True)
    feedback_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["organisation", "-created_at"]),
            models.Index(fields=["job", "status"]),
        ]

    def __str__(self):
        return f"AI interview for {self.candidate} / {self.job} ({self.status})"

    def get_join_url(self):
        base = str(settings.FRONTEND_URL).rstrip("/")
        return f"{base}/ai-interview/{self.candidate_join_token}"


class AIInterviewQuestion(TimeStampedModel):
    class QuestionType(models.TextChoices):
        OPENER = "OPENER", _("Opener")
        MOTIVATION = "MOTIVATION", _("Motivation")
        EXPERIENCE = "EXPERIENCE", _("Experience")
        SITUATIONAL = "SITUATIONAL", _("Situational")
        CHALLENGE = "CHALLENGE", _("Challenge")
        CULTURAL_FIT = "CULTURAL_FIT", _("Cultural fit")
        CLOSING = "CLOSING", _("Closing")

    class SignalStrength(models.TextChoices):
        STRONG = "STRONG", _("Strong")
        MODERATE = "MODERATE", _("Moderate")
        WEAK = "WEAK", _("Weak")
        NO_RESPONSE = "NO_RESPONSE", _("No response")

    interview = models.ForeignKey(AIInterview, on_delete=models.CASCADE, related_name="questions")
    question_number = models.PositiveSmallIntegerField()
    question_text = models.TextField()
    question_type = models.CharField(max_length=15, choices=QuestionType.choices)
    expected_duration_seconds = models.PositiveIntegerField(default=90)
    followup_if_vague = models.TextField(blank=True, default="")
    good_signals = models.JSONField(default=list, blank=True)
    concern_signals = models.JSONField(default=list, blank=True)
    transition_phrase = models.TextField(blank=True, default="")

    was_asked = models.BooleanField(default=False)
    asked_at_ms = models.IntegerField(null=True, blank=True)
    candidate_response = models.TextField(blank=True, default="")
    followup_asked = models.BooleanField(default=False)
    silence_detected = models.BooleanField(default=False)

    score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    signal_strength = models.CharField(max_length=12, choices=SignalStrength.choices, null=True, blank=True)
    ai_notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ("question_number",)

    def __str__(self):
        return f"Q{self.question_number} ({self.question_type}) for {self.interview_id}"


class AIInterviewTranscriptSegment(models.Model):
    class Speaker(models.TextChoices):
        ALEX = "ALEX", _("Alex")
        CANDIDATE = "CANDIDATE", _("Candidate")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interview = models.ForeignKey(AIInterview, on_delete=models.CASCADE, related_name="transcript_segments")
    speaker = models.CharField(max_length=10, choices=Speaker.choices)
    text = models.TextField()
    timestamp_ms = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("timestamp_ms",)

    def __str__(self):
        return f"{self.speaker} segment for {self.interview_id}"


class AIInterviewSlotLock(models.Model):
    """Singleton row (always pk=1, created by migration) locked via
    SELECT ... FOR UPDATE for the entire duration of slot allocation +
    AIInterview creation in services.provision_ai_interview/
    provision_preview_ai_interview. Without this, two concurrent candidates
    can both count the same not-yet-committed slot as free (the check in
    services.allocate_ai_interview_slot and the eventual .create() aren't
    otherwise atomic against each other) and both get handed the same
    over-booked slot. A dedicated lock row (rather than locking a Job row)
    is used because slot capacity is global across every job, not per-job."""

    def __str__(self):
        return "AI interview slot allocation lock"
