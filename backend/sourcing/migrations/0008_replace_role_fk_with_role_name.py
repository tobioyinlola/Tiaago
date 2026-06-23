from django.db import connection, migrations, models


def copy_role_title_to_role_name(apps, schema_editor):
    """Copy existing Role FK title values into the new role_name CharField."""
    PipelineCategory = apps.get_model("sourcing", "PipelineCategory")
    columns = [c.name for c in connection.introspection.get_table_description(connection.cursor(), "sourcing_pipelinecategory")]
    if "role_id" not in columns:
        return
    for cat in PipelineCategory._default_manager.select_related("role").filter(role__isnull=False):
        cat.role_name = cat.role.title
        cat.save(update_fields=["role_name"])


def add_role_name_if_missing(apps, schema_editor):
    """Only add role_name column if it doesn't already exist (idempotent)."""
    columns = [c.name for c in connection.introspection.get_table_description(connection.cursor(), "sourcing_pipelinecategory")]
    if "role_name" not in columns:
        schema_editor.execute(
            "ALTER TABLE sourcing_pipelinecategory ADD COLUMN role_name varchar(255) NOT NULL DEFAULT ''"
        )


def remove_role_fk_if_exists(apps, schema_editor):
    """Only remove role FK if it still exists (idempotent)."""
    columns = [c.name for c in connection.introspection.get_table_description(connection.cursor(), "sourcing_pipelinecategory")]
    if "role_id" in columns:
        schema_editor.execute(
            "ALTER TABLE sourcing_pipelinecategory DROP COLUMN role_id"
        )


class Migration(migrations.Migration):

    dependencies = [
        ("sourcing", "0007_pipelinecategory_role"),
    ]

    operations = [
        migrations.RunPython(add_role_name_if_missing, migrations.RunPython.noop),
        migrations.RunPython(copy_role_title_to_role_name, migrations.RunPython.noop),
        migrations.RunPython(remove_role_fk_if_exists, migrations.RunPython.noop),
    ]
