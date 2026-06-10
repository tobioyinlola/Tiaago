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
            cleaned = [
                str(x)[:max_len] for x in raw[:max_items]
                if isinstance(x, (str, int, float))
            ]
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
        migrations.RunSQL(
            sql=(
                'ALTER TABLE quiz_quiz '
                'ALTER COLUMN "questions_on" TYPE varchar(70)[] '
                'USING ARRAY('
                '  SELECT jsonb_array_elements_text("questions_on")'
                ')::varchar(70)[];'
            ),
            reverse_sql=(
                'ALTER TABLE quiz_quiz '
                'ALTER COLUMN "questions_on" TYPE jsonb '
                'USING to_jsonb("questions_on");'
            ),
            state_operations=[
                migrations.AlterField(
                    model_name="quiz",
                    name="questions_on",
                    field=django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(max_length=70),
                        default=list,
                        size=10,
                    ),
                ),
            ],
        ),
    ]
