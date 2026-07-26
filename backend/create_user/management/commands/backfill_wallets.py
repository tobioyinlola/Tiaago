from django.core.management.base import BaseCommand

from create_user.models import Company
from subscriptions.billing_service import get_or_create_wallet


class Command(BaseCommand):
    help = (
        "Create a Wallet (with the standard free-credit allowance) for every "
        "Company that doesn't have one yet. Companies that already have a "
        "Wallet are left untouched, even if free_credits_remaining is 0 -- "
        "that could mean the credits were legitimately used, so it's not "
        "safe to reset it here."
    )

    def handle(self, *args, **options):
        companies = Company.objects.filter(wallet__isnull=True)
        created = 0
        for company in companies.iterator():
            get_or_create_wallet(company)
            created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Created {created} Wallet(s).")
        )
