from django.db import migrations


def backfill_application_eligibility_checks(apps, schema_editor):
    """Give existing applications explicit review records for job snapshots.

    Applications created before eligibility checks existed have no candidate
    declaration to infer.  Required items are therefore held for review;
    optional items are not applicable until a later product release asks for
    supporting evidence.
    """
    JobApplication = apps.get_model("jobs", "JobApplication")
    ApplicationEligibilityCheck = apps.get_model("jobs", "ApplicationEligibilityCheck")

    pending = []
    for application in JobApplication.objects.select_related("job").iterator():
        requirements = application.job.eligibility_requirements
        if not isinstance(requirements, list):
            continue
        existing_codes = set(
            ApplicationEligibilityCheck.all_objects.filter(application_id=application.id).values_list(
                "requirement_code", flat=True
            )
        )
        for requirement in requirements:
            if not isinstance(requirement, dict):
                continue
            code = requirement.get("code")
            if not code or code in existing_codes:
                continue
            required = requirement.get("required") is True
            pending.append(
                ApplicationEligibilityCheck(
                    application_id=application.id,
                    requirement_code=code,
                    requirement_label=requirement.get("label") or code.replace("-", " ").title(),
                    requirement_description=requirement.get("description") or "",
                    is_required=required,
                    declaration=None,
                    status="NEEDS_REVIEW" if required else "NOT_APPLICABLE",
                )
            )
            existing_codes.add(code)
        if len(pending) >= 500:
            ApplicationEligibilityCheck.all_objects.bulk_create(pending, batch_size=500)
            pending.clear()
    if pending:
        ApplicationEligibilityCheck.all_objects.bulk_create(pending, batch_size=500)


class Migration(migrations.Migration):
    dependencies = [
        ("jobs", "0028_eligibility_checks"),
    ]

    operations = [
        migrations.RunPython(backfill_application_eligibility_checks, migrations.RunPython.noop),
    ]
