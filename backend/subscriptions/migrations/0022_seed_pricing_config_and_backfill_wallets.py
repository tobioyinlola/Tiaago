import uuid

from django.db import migrations


PRICING_SEED = [
    ("resume_screening_usd", "0.03", "Resume screening price in USD, charged per candidate."),
    ("assessment_usd", "0.07", "Assessment price in USD, charged per candidate."),
    ("resume_screening_ngn", "40.00", "Resume screening price in NGN, charged per candidate."),
    ("assessment_ngn", "100.00", "Assessment price in NGN, charged per candidate."),
    ("free_tier_limit", "100", "Number of free candidate processings a new organisation gets before wallet charges begin."),
    ("minimum_topup_usd", "10.00", "Minimum wallet top-up amount in USD."),
    ("minimum_topup_ngn", "5000.00", "Minimum wallet top-up amount in NGN."),
]


def seed_pricing_config(apps, schema_editor):
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")
    for key, value, description in PRICING_SEED:
        PricingConfig.objects.get_or_create(
            key=key, defaults={"id": uuid.uuid4(), "value": value, "description": description}
        )


def unseed_pricing_config(apps, schema_editor):
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")
    PricingConfig.objects.filter(key__in=[k for k, _, _ in PRICING_SEED]).delete()


def backfill_free_credits(apps, schema_editor):
    Wallet = apps.get_model("subscriptions", "Wallet")
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")
    limit_row = PricingConfig.objects.filter(key="free_tier_limit").first()
    limit = int(limit_row.value) if limit_row else 100
    # Existing wallets predate free-credit tracking -- give them the full
    # allotment rather than 0, so an org that hasn't screened anyone yet
    # doesn't lose their free tier just because this feature shipped later.
    Wallet.objects.filter(free_credits_remaining=0).update(free_credits_remaining=limit)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0021_candidatebillingrecord_pricingconfig_wallettopup_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_pricing_config, unseed_pricing_config),
        migrations.RunPython(backfill_free_credits, noop_reverse),
    ]
