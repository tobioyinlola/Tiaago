import requests
from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone
from loguru import logger

from jobs.models import JobApplication
from jobs.tasks import carry_out_resume_analysis

from . import nango_client
from .models import AtsCandidate, AtsConnection
from .providers import PROVIDER_REGISTRY
from .services import upsert_candidate, upsert_job


@shared_task(name="run_ats_sync")
def run_ats_sync(connection_id: int):
    """The whole connect -> pull -> disconnect cycle for one AtsConnection.

    On any failure during the pull, the Nango connection is deliberately
    left intact (nango_connection_id is not cleared) so the recruiter can
    retry without re-authorizing -- see AtsConnection.Status docstring.
    Only a fully successful pull reaches the delete_connection call.
    """
    connection = AtsConnection.objects.filter(id=connection_id).select_related("company").first()
    if not connection or not connection.nango_connection_id:
        logger.error(f"run_ats_sync: connection {connection_id} missing or has no nango_connection_id")
        return

    provider_module = PROVIDER_REGISTRY.get(connection.provider)
    if not provider_module:
        connection.status = AtsConnection.Status.FAILED
        connection.error_message = f"Unknown ATS provider '{connection.provider}'"
        connection.save(update_fields=["status", "error_message", "updated_at"])
        return

    connection.status = AtsConnection.Status.SYNCING
    connection.save(update_fields=["status", "updated_at"])

    try:
        candidates_synced = 0
        for raw in provider_module.fetch_candidates(connection.nango_connection_id):
            normalized = provider_module.normalize_candidate(raw)
            upsert_candidate(connection.company, connection.provider, normalized)
            candidates_synced += 1

        jobs_synced = 0
        for raw in provider_module.fetch_jobs(connection.nango_connection_id):
            normalized = provider_module.normalize_job(raw)
            upsert_job(connection.company, connection.provider, normalized)
            jobs_synced += 1
    except Exception as e:
        logger.exception(f"ATS sync FAILED for connection {connection_id} ({connection.provider}, company {connection.company_id}): {e}")
        connection.status = AtsConnection.Status.FAILED
        connection.error_message = str(e)[:2000]
        connection.save(update_fields=["status", "error_message", "updated_at"])
        return  # never delete the Nango connection on failure -- leave it for a retry

    connection.candidates_synced = candidates_synced
    connection.jobs_synced = jobs_synced
    connection.status = AtsConnection.Status.SYNCED
    connection.synced_at = timezone.now()
    connection.error_message = ""
    connection.save(update_fields=["candidates_synced", "jobs_synced", "status", "synced_at", "error_message", "updated_at"])
    logger.info(f"ATS sync SUCCEEDED for connection {connection_id}: {candidates_synced} candidates, {jobs_synced} jobs")

    try:
        nango_client.delete_connection(connection_id=connection.nango_connection_id, provider_config_key=connection.provider)
    except Exception as e:
        # Data already landed safely -- this only means the Nango connection
        # slot wasn't freed. Log loudly so it can be cleaned up manually
        # from the Nango dashboard; don't mark the sync itself as failed.
        logger.error(
            f"ATS sync for connection {connection_id} succeeded but Nango delete_connection failed "
            f"(nango_connection_id={connection.nango_connection_id}): {e}"
        )
        return

    connection.nango_connection_id = ""
    connection.disconnected_at = timezone.now()
    connection.save(update_fields=["nango_connection_id", "disconnected_at", "updated_at"])


@shared_task(name="attach_ats_candidate_resume")
def attach_ats_candidate_resume(job_application_id: int):
    """Fetches a converted ATS candidate's resume_url and attaches it to
    their TalentProfile.resume, so AI resume screening has something to
    analyze. Runs async, after the JobApplication already exists, and is
    best-effort: a slow/broken/expired third-party resume URL must never
    block the recruiter's convert action or fail the conversion itself."""
    application = JobApplication.objects.select_related("applicant__user", "job").filter(id=job_application_id).first()
    if not application or application.applicant.resume:
        return  # gone, or already has a resume -- never clobber a real upload

    candidate = AtsCandidate.objects.filter(
        company=application.job.company, email__iexact=application.applicant.user.email,
    ).exclude(resume_url="").first()
    if not candidate:
        return

    try:
        resp = requests.get(candidate.resume_url, timeout=15)
        resp.raise_for_status()
        filename = candidate.resume_url.rstrip("/").split("/")[-1].split("?")[0] or f"resume-{candidate.id}"
        application.applicant.resume.save(filename, ContentFile(resp.content), save=True)
    except Exception as e:
        logger.warning(f"attach_ats_candidate_resume: failed to fetch resume for application {job_application_id}: {e}")
        return

    if application.job.hires_with_ai:
        try:
            carry_out_resume_analysis.delay(application.id)
        except Exception:
            logger.exception(f"Failed to dispatch resume analysis for application {application.id}")
