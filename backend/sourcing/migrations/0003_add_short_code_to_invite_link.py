import string

from django.db import migrations, models
from django.utils.crypto import get_random_string

SHORT_CODE_CHARS = string.ascii_letters + string.digits


def populate_short_codes(apps, schema_editor):
    PipelineInviteLink = apps.get_model("sourcing", "PipelineInviteLink")
    for link in PipelineInviteLink.objects.filter(short_code=""):
        link.short_code = get_random_string(7, SHORT_CODE_CHARS)
        link.save(update_fields=["short_code"])


class Migration(migrations.Migration):

    dependencies = [
        ("sourcing", "0002_pipelinecandidate_current_pay_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="pipelineinvitelink",
            name="short_code",
            field=models.CharField(default="", max_length=10, editable=False),
            preserve_default=False,
        ),
        migrations.RunPython(populate_short_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="pipelineinvitelink",
            name="short_code",
            field=models.CharField(
                default=None, max_length=10, unique=True, editable=False,
            ),
            preserve_default=False,
        ),
    ]
