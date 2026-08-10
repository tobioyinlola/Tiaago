import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="generate_report_task")
def generate_report_task(report_id):
    """Computes report_data for a Report and flips its status -- same
    fetch/do-work/update-status shape as jobs.tasks.send_assessment_link /
    carry_out_resume_analysis. No AI calls anywhere in this path; see
    reports.services.compute_report_data."""
    from .models import Report
    from .services import compute_report_data

    report = Report.objects.filter(id=report_id).first()
    if not report:
        logger.error("generate_report_task: report %s not found", report_id)
        return

    try:
        report.report_data = compute_report_data(report)
        report.status = Report.Status.READY
        report.generated_at = timezone.now()
        report.error_message = ""
        report.save(update_fields=["report_data", "status", "generated_at", "error_message"])
    except Exception as e:
        logger.exception("generate_report_task failed for report %s", report_id)
        report.status = Report.Status.FAILED
        report.error_message = str(e)
        report.save(update_fields=["status", "error_message"])
