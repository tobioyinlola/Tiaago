from django.db import migrations

# AI interview / human interview package / recording add-on prices were only
# ever hardcoded fallback defaults passed to get_pricing_decimal() in
# billing_service.py -- never actual PricingConfig rows, so there was no way
# to change them from the admin pricing panel like every other price. Seeding
# them here makes them admin-editable through the exact same mechanism (no
# billing_service.py changes needed -- it already reads these keys, it just
# never found rows for them before).
NEW_PRICING_SEED = [
    ("ai_interview_price_ngn", "800.00", "AI interview price in NGN, charged per candidate (first 3 per organisation free)."),
    ("interview_package_price_ngn", "1500.00", "Human interview package price in NGN, charged per candidate (first 3 per organisation free)."),
    ("interview_recording_addon_price_ngn", "1000.00", "Human interview recording add-on price in NGN, charged on top of the interview package when recording is enabled."),
]

# Resume screening USD price correction: $0.03 -> $0.50.
RESUME_SCREENING_USD_KEY = "resume_screening_usd"
OLD_RESUME_SCREENING_USD = "0.03"
NEW_RESUME_SCREENING_USD = "0.50"


def seed_and_update(apps, schema_editor):
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")
    import uuid

    for key, value, description in NEW_PRICING_SEED:
        PricingConfig.objects.get_or_create(
            key=key, defaults={"id": uuid.uuid4(), "value": value, "description": description}
        )

    row = PricingConfig.objects.filter(key=RESUME_SCREENING_USD_KEY).first()
    if row and row.value == OLD_RESUME_SCREENING_USD:
        row.value = NEW_RESUME_SCREENING_USD
        row.save(update_fields=["value"])


def reverse(apps, schema_editor):
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")
    PricingConfig.objects.filter(key__in=[k for k, _, _ in NEW_PRICING_SEED]).delete()
    row = PricingConfig.objects.filter(key=RESUME_SCREENING_USD_KEY).first()
    if row and row.value == NEW_RESUME_SCREENING_USD:
        row.value = OLD_RESUME_SCREENING_USD
        row.save(update_fields=["value"])


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0030_bachs_webhook_log"),
    ]

    operations = [
        migrations.RunPython(seed_and_update, reverse),
    ]
