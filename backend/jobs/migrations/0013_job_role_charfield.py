from django.db import migrations, models


def backfill_role_text(apps, schema_editor):
    """Copy each Job's related Role.title into the new role_text column
    before the old role_id FK column is dropped."""
    Job = apps.get_model("jobs", "Job")
    for job in Job.objects.select_related("role").iterator():
        job.role_text = job.role.title if job.role_id else ""
        job.save(update_fields=["role_text"])


def noop_reverse(apps, schema_editor):
    # Data is not restored on reverse -- the old role_id FK column is gone
    # by the time this would run. Treat this migration as forward-only.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0012_job_public_id"),
    ]

    operations = [
        # Drop the old FK's composite index first -- it's tied to the role_id
        # column we're about to remove.
        migrations.RemoveIndex(
            model_name="job",
            name="jobs_job_role_id_816559_idx",
        ),
        # Add a temporary text column, backfill it from the FK, THEN remove
        # the FK and rename into place -- preserves existing role data instead
        # of a naive drop-and-recreate of the `role` field.
        migrations.AddField(
            model_name="job",
            name="role_text",
            field=models.CharField(max_length=255, blank=True, default=""),
        ),
        migrations.RunPython(backfill_role_text, noop_reverse),
        migrations.RemoveField(
            model_name="job",
            name="role",
        ),
        migrations.RenameField(
            model_name="job",
            old_name="role_text",
            new_name="role",
        ),
        migrations.AlterField(
            model_name="job",
            name="role",
            field=models.CharField(max_length=255),
        ),
        migrations.AddIndex(
            model_name="job",
            index=models.Index(fields=["role", "company"], name="jobs_job_role_company_idx"),
        ),
    ]
