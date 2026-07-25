from django.db import migrations

PERMISSIONS = [
    ("talent_network.view", "View Talent Network", "Talent Network", "View Talent Network members, overview, and analytics"),
    ("talent_network.manage", "Manage Talent Network", "Talent Network", "Deactivate/reactivate/delete members and export data"),
]

# Existing system roles (from 0002_seed_permissions_and_roles) that should
# also see the new Talent Network admin section.
ROLE_SLUGS_TO_GRANT = {
    "super_admin": ["talent_network.view", "talent_network.manage"],
    "operations_manager": ["talent_network.view", "talent_network.manage"],
    "marketing_manager": ["talent_network.view"],
    "read_only": ["talent_network.view"],
}


def seed_talent_network_permissions(apps, schema_editor):
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


def unseed_talent_network_permissions(apps, schema_editor):
    StaffPermission = apps.get_model("staff", "StaffPermission")
    StaffPermission.objects.filter(slug__in=[slug for slug, *_ in PERMISSIONS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("staff", "0002_seed_permissions_and_roles"),
    ]

    operations = [
        migrations.RunPython(seed_talent_network_permissions, reverse_code=unseed_talent_network_permissions),
    ]
