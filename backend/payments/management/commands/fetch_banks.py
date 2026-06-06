from django.core.management.base import BaseCommand
from payments.models import Bank
import requests
from django.conf import settings


class Command(BaseCommand):
    help = "Fetch and save banks from Paystack"

    def handle(self, *args, **kwargs):
        url = "https://api.paystack.co/bank?currency=NGN"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_PRIVATE_KEY}",
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            banks = response.json().get("data", [])
            for bank in banks:
                Bank.objects.update_or_create(
                    code=bank["code"], defaults={"name": bank["name"]}
                )
            self.stdout.write(self.style.SUCCESS("Successfully updated bank list."))
        else:
            self.stdout.write(self.style.ERROR("Failed to fetch banks."))
