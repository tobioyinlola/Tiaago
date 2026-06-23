from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("roles", "0001_initial"),
        ("sourcing", "0006_outreachemail_job"),
    ]

    operations = [
        migrations.AddField(
            model_name="pipelinecategory",
            name="role",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="pipeline_categories",
                to="roles.role",
            ),
        ),
    ]
