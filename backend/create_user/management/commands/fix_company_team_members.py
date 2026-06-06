from django.core.management.base import BaseCommand
from create_user.models import Company, CompanyTeamMember

class Command(BaseCommand):
    help = "Retroactively add all existing company reps to CompanyTeamMember as ADMIN"

    def handle(self, *args, **kwargs):
        count_created = 0
        count_existing = 0

        for company in Company.objects.all():
            user = company.company_rep
            if not user:
                self.stdout.write(self.style.WARNING(f"Company {company.id} has no company_rep"))
                continue

            member, created = CompanyTeamMember.objects.get_or_create(
                company=company,
                user=user,
                defaults={"role": CompanyTeamMember.ROLE.ADMIN, "invited_by": user},
            )

            if created:
                count_created += 1
                self.stdout.write(self.style.SUCCESS(f"Added company_rep {user.id} as ADMIN for company {company.id}"))
            else:
                count_existing += 1
                self.stdout.write(f"CompanyTeamMember already exists for {user.id} in company {company.id}")

        self.stdout.write(self.style.SUCCESS(
            f"Done. Created {count_created} new entries, {count_existing} already existed."
        ))
