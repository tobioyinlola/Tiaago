from django.db import migrations

# 0002_seed_roles seeded every TALENT_ROLES entry with is_technical=True
# regardless of whether the role actually involves writing code -- so
# Product Designer, Product Manager, Social Media Manager, etc. were all
# wrongly flagged technical, which pulls a "Coding" MCQ category into their
# auto-generated assessments (see jobs.constants.TECHNICAL_ASSESSMENT_CATEGORIES
# and jobs.tasks.generate_job_assessment_questions_task). Only genuine
# engineering roles should get coding-related questions. Matches the values
# in roles/management/commands/update-roles.py's new_talent_roles, which was
# apparently never run against every environment.
CORRECTED_IS_TECHNICAL = {
    "Full Stack Engineer": True,
    "Mobile App Engineer": True,
    "Technical Product Manager": False,
    "Product Manager": False,
    "Product Designer": False,
    "Frontend Engineer": True,
    "Backend Engineer": True,
    "AI/ML Engineer": True,
    "Social Media Manager": False,
    "Community Manager": False,
    "Customer Support": False,
    "Copywriter/Content Writer": False,
    "Virtual Assistant": False,
    "Brand Designer": False,
}


def fix_is_technical(apps, schema_editor):
    Role = apps.get_model("roles", "Role")
    for title, is_technical in CORRECTED_IS_TECHNICAL.items():
        Role.objects.filter(title__iexact=title).update(is_technical=is_technical)


def reverse_fix_is_technical(apps, schema_editor):
    Role = apps.get_model("roles", "Role")
    # 0002_seed_roles originally set every one of these to True.
    for title in CORRECTED_IS_TECHNICAL:
        Role.objects.filter(title__iexact=title).update(is_technical=True)


class Migration(migrations.Migration):

    dependencies = [
        ("roles", "0003_rename_is_startup_role_is_recruiter_role"),
    ]

    operations = [
        migrations.RunPython(fix_is_technical, reverse_fix_is_technical),
    ]
