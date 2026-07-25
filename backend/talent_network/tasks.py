import logging

from celery import shared_task

from .audit import log_audit
from .matching import find_matching_members, score_member_for_job
from .models import JobMatchNotification, TalentNetworkAuditLog

logger = logging.getLogger("talent_network")


@shared_task(name="run_talent_network_matching")
def run_talent_network_matching(job_id: int, notify: bool = True):
    """Runs whenever a job is published (see jobs.views.JobListCreateView).
    Scores every plausible member against the job, creates a
    JobMatchNotification for anyone who crosses the threshold, and -- unless
    the recruiter unchecked "Notify matching candidates" at publish time --
    sends the email for each one."""
    from jobs.models import Job

    try:
        job = Job.objects.select_related("company").get(id=job_id)
    except Job.DoesNotExist:
        logger.warning("run_talent_network_matching: job %s no longer exists", job_id)
        return

    candidates = find_matching_members(job)
    matched_count = 0

    for member in candidates:
        result = score_member_for_job(member, job)
        if not result.is_match:
            continue

        notification, created = JobMatchNotification.objects.get_or_create(
            job=job,
            member=member,
            defaults={"match_score": result.score, "matched_criteria": result.breakdown},
        )
        if not created:
            continue  # already matched (idempotent re-run guard)

        matched_count += 1

        if notify:
            from .mailer import notify_member_of_job

            notify_member_of_job(notification)
            log_audit(
                TalentNetworkAuditLog.Action.JOB_MATCH_SENT,
                target_member=member,
                job_id=job.id,
                match_score=result.score,
            )

    logger.info("Talent Network matching for job %s: %s member(s) matched, notify=%s", job_id, matched_count, notify)
    return matched_count
