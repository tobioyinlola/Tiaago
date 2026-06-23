from django.db import migrations, models


def copy_role_title_to_role_name(apps, schema_editor):
    """Copy existing Role FK title values into the new role_name CharField."""
    PipelineCategory = apps.get_model("sourcing", "PipelineCategory")
    for cat in PipelineCategory._default_manager.select_related("role").filter(role__isnull=False):
        cat.role_name = cat.role.title
        cat.save(update_fields=["role_name"])


class Migration(migrations.Migration):

    dependencies = [
        ("sourcing", "0007_pipelinecategory_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="pipelinecategory",
            name="role_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.RunPython(copy_role_title_to_role_name, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="pipelinecategory",
            name="role",
        ),
    ]
