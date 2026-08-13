from django.db import migrations

# 0031 misread "#50" (Naira shorthand -- Nigerians commonly type "N" prices
# as "#" since the Naira symbol isn't on a standard keyboard) as "$0.50" and
# set resume_screening_usd to that. The actual correction is the NGN price:
# resume_screening_ngn 40 -> 50. USD reverts to its original 0.03, which is
# already roughly consistent with NGN 50 at the site's ~1500 NGN/USD rate
# (see frontend currencyRates.NGN in pricing/constants.tsx).
RESUME_SCREENING_NGN_KEY = "resume_screening_ngn"
OLD_RESUME_SCREENING_NGN = "40.00"
NEW_RESUME_SCREENING_NGN = "50.00"

RESUME_SCREENING_USD_KEY = "resume_screening_usd"
WRONG_RESUME_SCREENING_USD = "0.50"
CORRECT_RESUME_SCREENING_USD = "0.03"


def correct_prices(apps, schema_editor):
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")

    ngn_row = PricingConfig.objects.filter(key=RESUME_SCREENING_NGN_KEY).first()
    if ngn_row:
        ngn_row.value = NEW_RESUME_SCREENING_NGN
        ngn_row.save(update_fields=["value"])

    usd_row = PricingConfig.objects.filter(key=RESUME_SCREENING_USD_KEY).first()
    if usd_row and usd_row.value == WRONG_RESUME_SCREENING_USD:
        usd_row.value = CORRECT_RESUME_SCREENING_USD
        usd_row.save(update_fields=["value"])


def reverse(apps, schema_editor):
    PricingConfig = apps.get_model("subscriptions", "PricingConfig")

    ngn_row = PricingConfig.objects.filter(key=RESUME_SCREENING_NGN_KEY).first()
    if ngn_row and ngn_row.value == NEW_RESUME_SCREENING_NGN:
        ngn_row.value = OLD_RESUME_SCREENING_NGN
        ngn_row.save(update_fields=["value"])

    usd_row = PricingConfig.objects.filter(key=RESUME_SCREENING_USD_KEY).first()
    if usd_row and usd_row.value == CORRECT_RESUME_SCREENING_USD:
        usd_row.value = WRONG_RESUME_SCREENING_USD
        usd_row.save(update_fields=["value"])


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0031_seed_interview_pricing_and_update_resume_price"),
    ]
    operations = [
        migrations.RunPython(correct_prices, reverse),
    ]
