from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("roles", "0002_seed_roles"),
    ]

    operations = [
        migrations.RenameField(
            model_name="role",
            old_name="is_startup_role",
            new_name="is_recruiter_role",
        ),
    ]
