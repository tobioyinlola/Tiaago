from django.db import migrations
from django.utils.text import slugify

# Keep in sync with roles/management/commands/update-roles.py, which can be
# used to re-sync these lists on an existing database.
TALENT_ROLES = [
    ("Full Stack Engineer", True),
    ("Mobile App Engineer", True),
    ("Technical Product Manager", True),
    ("Product Manager", True),
    ("Product Designer", True),
    ("Frontend Engineer", True),
    ("Backend Engineer", True),
    ("AI/ML Engineer", True),
    ("Social Media Manager", True),
    ("Community Manager", True),
    ("Customer Support", True),
    ("Copywriter/Content Writer", True),
    ("Virtual Assistant", True),
    ("Brand Designer", True),
]

STARTUP_ROLES = [
    "HR",
    "Talent acquisition expert",
    "Startup founders",
    "Other",
]


def seed_roles(apps, schema_editor):
    Role = apps.get_model("roles", "Role")
    for title, is_technical in TALENT_ROLES:
        if not Role.objects.filter(title__iexact=title).exists():
            Role.objects.create(
                title=title,
                slug=slugify(title),
                active=True,
                is_technical=is_technical,
                is_startup_role=False,
            )
    for title in STARTUP_ROLES:
        if not Role.objects.filter(title__iexact=title).exists():
            Role.objects.create(
                title=title,
                slug=slugify(title),
                active=True,
                is_technical=False,
                is_startup_role=True,
            )


class Migration(migrations.Migration):
    dependencies = [
        ("roles", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_roles, reverse_code=migrations.RunPython.noop),
    ]
