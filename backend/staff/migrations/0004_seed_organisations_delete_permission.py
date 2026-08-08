from django.db import migrations

PERMISSIONS = [
    (
        "organisations.delete", "Delete organisations", "Organisations",
        "Permanently delete an organisation's account (company_rep user, company, and everything under it)",
    ),
]

# Deliberately Super Admin only -- unlike the rest of 0002/0003's grants,
# this is an irreversible, no-confirmation-email action, so it isn't handed
# to Operations Manager or any other role by default. A Super Admin can
# still grant it to another role later via the staff roles UI if wanted.
ROLE_SLUGS_TO_GRANT = {
    "super_admin": ["organisations.delete"],
}


def seed_organisations_delete_permission(apps, schema_editor):
    StaffPermission = apps.get_model("staff", "StaffPermission")
    StaffRole = apps.get_model("staff", "StaffRole")
    StaffRolePermission = apps.get_model("staff", "StaffRolePermission")

    permission_by_slug = {}
    for slug, name, group, description in PERMISSIONS:
        perm, _ = StaffPermission.objects.get_or_create(
            slug=slug, defaults={"name": name, "group": group, "description": description}
        )
        permission_by_slug[slug] = perm

    for role_slug, perm_slugs in ROLE_SLUGS_TO_GRANT.items():
        role = StaffRole.objects.filter(slug=role_slug).first()
        if not role:
            continue
        for perm_slug in perm_slugs:
            StaffRolePermission.objects.get_or_create(role=role, permission=permission_by_slug[perm_slug])


def unseed_organisations_delete_permission(apps, schema_editor):
    StaffPermission = apps.get_model("staff", "StaffPermission")
    StaffPermission.objects.filter(slug__in=[slug for slug, *_ in PERMISSIONS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("staff", "0003_seed_talent_network_permissions"),
    ]

    operations = [
        migrations.RunPython(seed_organisations_delete_permission, reverse_code=unseed_organisations_delete_permission),
    ]
