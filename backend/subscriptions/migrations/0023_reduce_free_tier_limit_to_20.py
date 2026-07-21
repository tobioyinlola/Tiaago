from django.db import migrations


def reduce_free_tier_limit(apps, schema_editor):
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")
    Wallet = apps.get_model("subscriptions", "Wallet")

    row, _created = PricingConfig.objects.get_or_create(
        key="free_tier_limit",
        defaults={
            "value": "20",
            "description": "Number of free candidate processings a new organisation gets before wallet charges begin.",
        },
    )
    if row.value != "20":
        row.value = "20"
        row.save(update_fields=["value"])

    # Cap existing wallets down to the new limit -- don't touch wallets
    # that have already used some of their free credits (< 20 remaining),
    # only ones still sitting on the old, higher allotment.
    Wallet.objects.filter(free_credits_remaining__gt=20).update(free_credits_remaining=20)


def restore_free_tier_limit(apps, schema_editor):
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")
    PricingConfig.objects.filter(key="free_tier_limit").update(value="100")


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0022_seed_pricing_config_and_backfill_wallets"),
    ]

    operations = [
        migrations.RunPython(reduce_free_tier_limit, restore_free_tier_limit),
    ]
