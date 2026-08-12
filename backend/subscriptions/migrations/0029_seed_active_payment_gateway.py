import uuid

from django.db import migrations


def seed_active_gateway(apps, schema_editor):
    PlatformSetting = apps.get_model("subscriptions", "PlatformSetting")
    PlatformSetting.objects.get_or_create(
        key="active_payment_gateway",
        defaults={
            "id": uuid.uuid4(),
            "value": "bachs",
            "description": "Active payment gateway for wallet top-ups. Options: bachs, paystack, stripe",
        },
    )


def unseed_active_gateway(apps, schema_editor):
    PlatformSetting = apps.get_model("subscriptions", "PlatformSetting")
    PlatformSetting.objects.filter(key="active_payment_gateway").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0028_bachs_gateway_support"),
    ]

    operations = [
        migrations.RunPython(seed_active_gateway, unseed_active_gateway),
    ]
