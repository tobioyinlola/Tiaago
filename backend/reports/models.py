from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from base.models import TimeStampedModel
from create_user.models import Company


class Report(TimeStampedModel):
    """A recruiter-generated hiring performance report -- pure data computed
    from existing pipeline/billing/timestamp records (no AI involved
    anywhere). report_data holds the fully computed result so the view page
    never re-queries once a report is READY; pdf_file is the cached export
    (see reports.tasks/views for the generate + export flow)."""

    class ReportType(models.TextChoices):
        SINGLE_ROLE = "SINGLE_ROLE", _("Single role")
        MULTI_ROLE = "MULTI_ROLE", _("Multiple roles")
        FULL_ACCOUNT = "FULL_ACCOUNT", _("Full account")

    class Status(models.TextChoices):
        GENERATING = "GENERATING", _("Generating")
        READY = "READY", _("Ready")
        FAILED = "FAILED", _("Failed")

    organisation = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="reports")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports_created"
    )
    name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=15, choices=ReportType.choices)
    # Job.id values (int PKs -- Job doesn't use uuid, unlike AIInterview/CandidateBillingRecord).
    job_ids = models.JSONField(default=list)
    date_from = models.DateField()
    date_to = models.DateField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.GENERATING, db_index=True)
    report_data = models.JSONField(null=True, blank=True)
    pdf_file = models.FileField(upload_to="report-pdfs/%Y/%m/", null=True, blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.name} ({self.organisation.company_name})"
