from django.core.management.base import BaseCommand
from roles.models import Role

new_talent_roles = [
    {"title": "Full Stack Engineer", "is_technical": True},
    {"title": "Mobile App Engineer", "is_technical": True},
    {"title": "Technical Product Manager", "is_technical": False},
    {"title": "Product Manager", "is_technical": False},
    {"title": "Product Designer", "is_technical": False},
    {"title": "Frontend Engineer", "is_technical": True},
    {"title": "Backend Engineer", "is_technical": True},
    {"title": "AI/ML Engineer", "is_technical": True},
    {"title": "Social Media Manager", "is_technical": False},
    {"title": "Community Manager", "is_technical": False},
    {"title": "Customer Support", "is_technical": False},
    {"title": "Copywriter/Content Writer", "is_technical": False},
    {"title": "Virtual Assistant", "is_technical": False},
    {"title": "Brand Designer", "is_technical": False},
]

new_recruiter_roles = [
    {"title": "HR", "is_technical": False},
    {"title": "Talent acquisition expert", "is_technical": False},
    {"title": "Recruiter", "is_technical": False},
    {"title": "Other", "is_technical": False},
]


class Command(BaseCommand):
    def handle(self, *args, **options):
        Role.objects.all().update(active=False)
        # talent roles
        for role in new_talent_roles:
            corr_role = Role.objects.filter(title__iexact=role["title"]).first()
            if corr_role:
                corr_role.is_technical = role["is_technical"]
                corr_role.active = True
                corr_role.is_recruiter_role = False
                corr_role.save()
            else:
                Role.objects.create(
                    title=role["title"], active=True, is_technical=role["is_technical"], is_recruiter_role=False
                )
        # recruiter roles
        for role in new_recruiter_roles:
            corr_role = Role.objects.filter(title__iexact=role["title"]).first()
            if corr_role:
                corr_role.is_technical = role["is_technical"]
                corr_role.active = True
                corr_role.is_recruiter_role = True
                corr_role.save()
            else:
                Role.objects.create(
                    title=role["title"], active=True, is_technical=role["is_technical"], is_recruiter_role=True
                )
        self.stdout.write(self.style.SUCCESS("Roles sorted ✅"))
