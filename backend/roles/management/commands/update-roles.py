from django.core.management.base import BaseCommand
from roles.models import Role

new_talent_roles = [
    "Full Stack Engineer",
    "Mobile App Engineer",
    "Technical Product Manager",
    "Product Manager",
    "Product Designer",
    "Frontend Engineer",
    "Backend Engineer",
    "AI/ML Engineer",
    "Social Media Manager",
    "Community Manager",
    "Customer Support",
    "Copywriter/Content Writer",
    "Virtual Assistant",
    "Brand Designer",
]

new_startup_roles = [
    "HR",
    "Talent acquisition expert",
    "Startup founders",
    "Other",
]


class Command(BaseCommand):
    def handle(self, *args, **options):
        Role.objects.all().update(active=False)
        # talent roles
        for role in new_talent_roles:
            corr_role = Role.objects.filter(title__iexact=role).first()
            if corr_role:
                corr_role.is_technical = True
                corr_role.active = True
                corr_role.is_startup_role = False
                corr_role.save()
            else:
                Role.objects.create(
                    title=role, active=True, is_technical=True, is_startup_role=False
                )
        # startup roles
        for role in new_startup_roles:
            corr_role = Role.objects.filter(title__iexact=role).first()
            if corr_role:
                corr_role.is_technical = False
                corr_role.active = True
                corr_role.is_startup_role = True
                corr_role.save()
            else:
                Role.objects.create(
                    title=role, active=True, is_technical=False, is_startup_role=True
                )
        self.stdout.write(self.style.SUCCESS("Roles sorted ✅"))
