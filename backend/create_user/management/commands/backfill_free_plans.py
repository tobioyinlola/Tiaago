from django.core.management.base import BaseCommand

from create_user.models import Company
from subscriptions.models import FreePlan


class Command(BaseCommand):
    help = "Create a FreePlan for every Company that doesn't have one yet."

    def handle(self, *args, **options):
        companies = Company.objects.filter(free_usage__isnull=True)
        created = 0
        for company in companies.iterator():
            _, was_created = FreePlan.objects.get_or_create(
                company=company,
                defaults={"company_email": company.company_email},
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Created {created} FreePlan(s).")
        )
