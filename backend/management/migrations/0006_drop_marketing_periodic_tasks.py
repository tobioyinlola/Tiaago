from django.db import migrations

# The ConvertKit `marketing` app was deleted, but DatabaseScheduler only ever
# creates or updates PeriodicTask rows from celery.py's beat_schedule -- it never
# prunes entries that disappeared from the code. Both rows below are still
# enabled in prod, so without this beat would keep dispatching them and the
# worker would answer NotRegistered twice a day, forever.
DEAD_TASKS = [
    "marketing.tasks.batch_check_incomplete_assessments",
    "marketing.tasks.batch_check_incomplete_profiles",
]


def drop_dead_periodic_tasks(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    # Their CrontabSchedule rows are deliberately left alone -- schedules are
    # shared between tasks, so deleting one can orphan an unrelated entry.
    PeriodicTask.objects.filter(task__in=DEAD_TASKS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("management", "0005_alter_emailtrack_deleted_at"),
        ("django_celery_beat", "__first__"),
    ]

    operations = [
        migrations.RunPython(
            drop_dead_periodic_tasks,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
