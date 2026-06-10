import django.contrib.postgres.fields
from django.db import migrations, models


def _normalize(apps, schema_editor):
    Quiz = apps.get_model("quiz", "Quiz")
    max_items = 10
    max_len = 70
    for q in Quiz.objects.all().iterator():
        raw = q.questions_on
        if not isinstance(raw, list):
            cleaned = []
        else:
            cleaned = [str(x)[:max_len] for x in raw[:max_items]]
        if cleaned != raw:
            q.questions_on = cleaned
            q.save(update_fields=["questions_on"])


class Migration(migrations.Migration):
    dependencies = [
        ("quiz", "0002_alter_quiz_questions_on"),
    ]

    operations = [
        migrations.RunPython(
            code=_normalize,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="quiz",
            name="questions_on",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=70), size=10
            ),
        ),
    ]
