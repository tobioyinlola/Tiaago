import secrets

from django.db import migrations


def backfill_referral_codes(apps, schema_editor):
    Company = apps.get_model("create_user", "Company")
    existing_codes = set(
        Company.objects.exclude(referral_code__isnull=True).values_list("referral_code", flat=True)
    )
    for company in Company.objects.filter(referral_code__isnull=True).iterator():
        code = secrets.token_hex(4)
        while code in existing_codes:
            code = secrets.token_hex(4)
        existing_codes.add(code)
        company.referral_code = code
        company.save(update_fields=["referral_code"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("create_user", "0011_company_referral_and_utm_fields"),
    ]

    operations = [
        migrations.RunPython(backfill_referral_codes, noop_reverse),
    ]
