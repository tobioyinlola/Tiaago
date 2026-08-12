from django.db import migrations
from django.utils.text import slugify

# Keep in sync with tags/rule_engine.py's THRESHOLD_RULES -- "free-tier-user"/
# "paid-user" back the campaign builder's "Free Tier Users"/"Paid Users"
# audience quick-picks (campaigns.audience's TAG type resolves any system
# tag, so these need no new resolver, just a matching Tag row).
NEW_SYSTEM_TAGS = [
    ("Free Tier User", "WALLET", "#38BDF8", "Never topped up the wallet and still has free credits remaining."),
    ("Paid User", "WALLET", "#0369A1", "Has topped up the wallet at least once."),
]


def seed_tags(apps, schema_editor):
    Tag = apps.get_model("tags", "Tag")
    for name, category, colour, description in NEW_SYSTEM_TAGS:
        if not Tag.objects.filter(name=name).exists():
            Tag.objects.create(
                name=name,
                slug=slugify(name),
                category=category,
                colour=colour,
                description=description,
                tag_type="SYSTEM",
                is_active=True,
            )


class Migration(migrations.Migration):
    dependencies = [
        ("tags", "0002_seed_tags"),
    ]

    operations = [
        migrations.RunPython(seed_tags, reverse_code=migrations.RunPython.noop),
    ]
