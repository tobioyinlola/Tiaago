from django.db import migrations

# (slug, name, group, description)
PERMISSIONS = [
    ("organisations.view", "View organisations", "Organisations", "View organisation list and details"),
    ("organisations.edit", "Edit organisations", "Organisations", "Edit organisation details"),
    ("organisations.tags.manage", "Manage organisation tags", "Organisations", "Apply and remove tags on organisations"),
    ("organisations.impersonate", "Impersonate organisations", "Organisations", "Log in as an organisation"),
    ("revenue.view", "View revenue", "Revenue", "View revenue dashboard and billing data"),
    ("revenue.export", "Export revenue", "Revenue", "Export revenue data"),
    ("revenue.manage", "Manage revenue", "Revenue", "Create/edit pricing, coupons, communities, and manually charge or approve payouts"),
    ("support.view", "View support", "Support", "View support tickets"),
    ("support.reply", "Reply to support tickets", "Support", "Reply to support tickets"),
    ("support.manage", "Manage support tickets", "Support", "Change ticket status, priority, and assignment"),
    ("support.internal_notes", "Add internal notes", "Support", "Add internal notes to support tickets"),
    ("campaigns.view", "View campaigns", "Campaigns", "View campaigns and analytics"),
    ("campaigns.create", "Create campaigns", "Campaigns", "Create and edit campaigns"),
    ("campaigns.send", "Send campaigns", "Campaigns", "Send or schedule campaigns"),
    ("campaigns.delete", "Delete campaigns", "Campaigns", "Delete campaigns"),
    ("tags.view", "View tags and segments", "Tags and Segments", "View tags and segments"),
    ("tags.manage", "Manage tags and segments", "Tags and Segments", "Create, edit, and delete tags and segments"),
    ("notifications.view", "View notifications", "Notifications", "View sent notifications"),
    ("notifications.send", "Send notifications", "Notifications", "Send in-app notifications"),
    ("proctoring.view", "View proctoring reports", "Proctoring", "View proctoring reports and sessions"),
    ("proctoring.admin", "View proctoring overview", "Proctoring", "View admin proctoring overview"),
    ("system.view", "View system health", "System", "View system health dashboard"),
    ("system.manage", "Manage system settings", "System", "Manage system settings"),
    ("staff.view", "View staff", "Staff", "View staff members and roles"),
    ("staff.invite", "Invite staff", "Staff", "Invite new staff members"),
    ("staff.manage", "Manage staff", "Staff", "Edit staff roles and permissions"),
    ("staff.roles.manage", "Manage roles", "Staff", "Create and edit roles"),
]

ALL_SLUGS = [slug for slug, *_ in PERMISSIONS]

# (name, slug, description, permission_slugs)
ROLES = [
    (
        "Super Admin",
        "super_admin",
        "Full access to everything. Bypasses all permission checks.",
        ALL_SLUGS,
    ),
    (
        "Operations Manager",
        "operations_manager",
        "Runs day-to-day operations across organisations, revenue, support, and campaigns.",
        [
            "organisations.view", "organisations.edit", "organisations.tags.manage",
            "revenue.view", "revenue.export",
            "support.view", "support.reply", "support.manage", "support.internal_notes",
            "campaigns.view", "campaigns.create", "campaigns.send",
            "tags.view", "tags.manage",
            "notifications.view", "notifications.send",
            "proctoring.view",
            "staff.view",
        ],
    ),
    (
        "Support Agent",
        "support_agent",
        "Handles support tickets.",
        [
            "organisations.view",
            "support.view", "support.reply", "support.manage", "support.internal_notes",
            "notifications.view",
        ],
    ),
    (
        "Marketing Manager",
        "marketing_manager",
        "Manages campaigns, tags, and notifications.",
        [
            "organisations.view", "organisations.tags.manage",
            "campaigns.view", "campaigns.create", "campaigns.send", "campaigns.delete",
            "tags.view", "tags.manage",
            "notifications.view", "notifications.send",
            "revenue.view",
        ],
    ),
    (
        "Finance",
        "finance",
        "Views and exports revenue data.",
        [
            "revenue.view", "revenue.export",
            "organisations.view",
        ],
    ),
    (
        "Read Only",
        "read_only",
        "View-only access across every admin section.",
        [
            "organisations.view", "revenue.view", "support.view", "campaigns.view",
            "tags.view", "notifications.view", "proctoring.view", "system.view", "staff.view",
        ],
    ),
]


def seed_permissions_and_roles(apps, schema_editor):
    StaffPermission = apps.get_model("staff", "StaffPermission")
    StaffRole = apps.get_model("staff", "StaffRole")
    StaffRolePermission = apps.get_model("staff", "StaffRolePermission")

    permission_by_slug = {}
    for slug, name, group, description in PERMISSIONS:
        perm, _ = StaffPermission.objects.get_or_create(
            slug=slug, defaults={"name": name, "group": group, "description": description}
        )
        permission_by_slug[slug] = perm

    for name, slug, description, permission_slugs in ROLES:
        role, _ = StaffRole.objects.get_or_create(
            slug=slug, defaults={"name": name, "description": description, "is_system_role": True}
        )
        for perm_slug in permission_slugs:
            StaffRolePermission.objects.get_or_create(role=role, permission=permission_by_slug[perm_slug])


def unseed_permissions_and_roles(apps, schema_editor):
    StaffRole = apps.get_model("staff", "StaffRole")
    StaffPermission = apps.get_model("staff", "StaffPermission")
    StaffRole.objects.filter(slug__in=[slug for _, slug, *_ in ROLES]).delete()
    StaffPermission.objects.filter(slug__in=ALL_SLUGS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("staff", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_permissions_and_roles, reverse_code=unseed_permissions_and_roles),
    ]
