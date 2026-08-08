from django.db import migrations


def create_singleton_row(apps, schema_editor):
    """services._acquire_slot_lock() always does .get(pk=1) -- that row
    must exist before any AI interview is ever provisioned."""
    AIInterviewSlotLock = apps.get_model("ai_interviews", "AIInterviewSlotLock")
    AIInterviewSlotLock.objects.get_or_create(pk=1)


def delete_singleton_row(apps, schema_editor):
    AIInterviewSlotLock = apps.get_model("ai_interviews", "AIInterviewSlotLock")
    AIInterviewSlotLock.objects.filter(pk=1).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("ai_interviews", "0006_aiinterviewslotlock"),
    ]

    operations = [
        migrations.RunPython(create_singleton_row, delete_singleton_row),
    ]
