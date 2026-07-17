from django.db import migrations


def backfill_service_type(apps, schema_editor):
    WalletTransaction = apps.get_model("subscriptions", "WalletTransaction")
    WalletTransaction.objects.filter(
        description__startswith="Deduction for resume screening"
    ).update(service_type="resume_screening")
    WalletTransaction.objects.filter(
        description__startswith="Deduction for assessment"
    ).update(service_type="assessment")
    WalletTransaction.objects.filter(
        description__startswith="Wallet funding"
    ).update(service_type="wallet_topup")
    WalletTransaction.objects.filter(service_type__isnull=True, description__isnull=False).exclude(
        description=""
    ).update(service_type="other")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0019_wallettransaction_service_type"),
    ]

    operations = [
        migrations.RunPython(backfill_service_type, noop_reverse),
    ]
