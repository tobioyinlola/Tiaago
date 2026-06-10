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
            sql=[
                (
                    "CREATE OR REPLACE FUNCTION _jsonb_to_text_array(val jsonb) "
                    "RETURNS text[] LANGUAGE sql IMMUTABLE AS "
                    "$$SELECT coalesce(array_agg(x), ARRAY[]::text[]) "
                    "FROM jsonb_array_elements_text(val) x$$"
                ),
                (
                    'ALTER TABLE quiz_quiz '
                    'ALTER COLUMN "questions_on" TYPE varchar(70)[] '
                    'USING _jsonb_to_text_array("questions_on")::varchar(70)[]'
                ),
                "DROP FUNCTION _jsonb_to_text_array(jsonb)",
            ],
            reverse_sql=(
                'ALTER TABLE quiz_quiz '
                'ALTER COLUMN "questions_on" TYPE jsonb '
                'USING to_jsonb("questions_on")'
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
