from django.db import models

from base.models import TimeStampedModel


class AIUsageLog(TimeStampedModel):
    """Records every call to the AI service (resume analysis / assessment
    question generation) for admin analytics (call volume, error rate, and
    eventually per-call cost once the AI service starts returning token
    usage). prompt_tokens/completion_tokens/estimated_cost_usd stay null
    until that cross-service change ships -- call volume and success/failure
    rate are real from day one."""

    class ServiceType(models.TextChoices):
        RESUME_ANALYSIS = "resume_analysis", "Resume Analysis"
        MCQ_GENERATION = "mcq_generation", "MCQ Generation"
        CODING_ASSESSMENT = "coding_assessment", "Coding Assessment Generation"
        INTERVIEW_PREP = "interview_prep", "Interview Preparation Brief"
        AI_COPILOT_SUGGESTION = "ai_copilot_suggestion", "AI Copilot Suggestion"
        INTERVIEW_SUMMARY = "interview_summary", "Interview Summary"
        CANDIDATE_FEEDBACK = "candidate_feedback", "Candidate Feedback Draft"

    service_type = models.CharField(max_length=30, choices=ServiceType.choices, db_index=True)
    job_application = models.ForeignKey(
        "jobs.JobApplication", null=True, blank=True, on_delete=models.SET_NULL
    )
    company = models.ForeignKey(
        "create_user.Company", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_usage_logs"
    )
    succeeded = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    prompt_tokens = models.PositiveIntegerField(null=True, blank=True)
    completion_tokens = models.PositiveIntegerField(null=True, blank=True)
    estimated_cost_usd = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["service_type", "-created_at"]),
        ]

    def __str__(self):
        status = "OK" if self.succeeded else "FAILED"
        return f"{self.service_type} [{status}] {self.created_at}"
