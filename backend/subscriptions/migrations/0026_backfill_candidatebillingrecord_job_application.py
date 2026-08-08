from django.db import migrations


def backfill_job_application(apps, schema_editor):
    """CandidateBillingRecord's idempotency guard just moved from
    (organisation, job, candidate) to (organisation, job_application) --
    without this backfill, every pre-existing record would have
    job_application=NULL, so the next resume-screening/assessment charge
    for a candidate who was already billed before this migration would
    fail to find their old record (matched on the new key) and create a
    fresh one instead, re-charging (or re-granting a free credit for) work
    that was already paid for."""
    CandidateBillingRecord = apps.get_model("subscriptions", "CandidateBillingRecord")
    JobApplication = apps.get_model("jobs", "JobApplication")

    for record in CandidateBillingRecord.objects.filter(job_application__isnull=True, candidate__isnull=False):
        job_application = JobApplication.objects.filter(job_id=record.job_id, applicant_id=record.candidate_id).first()
        if job_application:
            record.job_application = job_application
            record.save(update_fields=["job_application"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0025_remove_candidatebillingrecord_unique_candidate_billing_record_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_job_application, noop_reverse),
    ]
