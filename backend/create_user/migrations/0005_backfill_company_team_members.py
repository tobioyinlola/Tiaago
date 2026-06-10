from django.db import migrations


def add_company_reps_as_admin(apps, schema_editor):
    Company = apps.get_model("create_user", "Company")
    CompanyTeamMember = apps.get_model("create_user", "CompanyTeamMember")

    for company in Company.objects.select_related("company_rep").all():
        user = company.company_rep
        if not user:
            continue
        CompanyTeamMember.objects.get_or_create(
            company=company,
            user=user,
            defaults={"role": "admin", "invited_by": user},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("create_user", "0004_companyteammember_companyteaminvite"),
    ]

    operations = [
        migrations.RunPython(add_company_reps_as_admin, migrations.RunPython.noop),
    ]
