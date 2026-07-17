from django.db import migrations
from django.utils.text import slugify

# Keep in sync with tags/rule_engine.py's RULES list -- every SYSTEM_TAGS slug
# here must have a matching rule, and every lifecycle/threshold rule there
# must have a matching row here. Colours are a light, distinguishable palette
# grouped by category; not prescribed by product, chosen for admin UI legibility.
SYSTEM_TAGS = [
    # (name, category, colour, description)
    ("New Signup", "LIFECYCLE", "#3B82F6", "Signed up within the last 7 days."),
    ("Just Activated", "LIFECYCLE", "#22C55E", "First billable action (screen or assessment) within the last 7 days."),
    ("Active", "LIFECYCLE", "#16A34A", "At least one billable action in the last 30 days."),
    ("Dormant", "LIFECYCLE", "#F59E0B", "Had billable activity historically but none in the last 30+ days."),
    ("Churned", "LIFECYCLE", "#EF4444", "Signed up 30+ days ago with zero billable actions ever."),
    ("Re-engaged", "LIFECYCLE", "#8B5CF6", "Active again in the last 7 days after a 30+ day gap in activity."),

    ("Wallet Funded", "WALLET", "#0EA5E9", "Has topped up the wallet at least once."),
    ("Low Wallet Balance", "WALLET", "#F97316", "Wallet balance below ₦500."),
    ("High Spender", "WALLET", "#059669", "Top tier of total spend."),
    ("Medium Spender", "WALLET", "#65A30D", "Mid tier of total spend."),
    ("Light Spender", "WALLET", "#84CC16", "Lowest non-zero tier of total spend."),

    ("First Screen Done", "SCREENING", "#0891B2", "Has screened at least 1 resume."),
    ("Growing Screener", "SCREENING", "#0E7490", "Has screened 10-99 resumes."),
    ("Power Screener", "SCREENING", "#155E75", "Has screened 100-499 resumes."),
    ("Heavy Screener", "SCREENING", "#164E63", "Has screened 500+ resumes."),
    ("No Screening Yet", "SCREENING", "#94A3B8", "Has never screened a resume."),

    ("First Assessment Done", "ASSESSMENT", "#A855F7", "Has created at least 1 assessment."),
    ("Growing Assessor", "ASSESSMENT", "#9333EA", "Has created 10-49 assessments."),
    ("Power Assessor", "ASSESSMENT", "#7E22CE", "Has created 50-199 assessments."),
    ("Assessment Master", "ASSESSMENT", "#6B21A8", "Has created 200+ assessments."),
    ("Assessment Never Used", "ASSESSMENT", "#94A3B8", "Has never created an assessment."),

    ("Pipeline Active", "PIPELINE", "#DB2777", "Has at least 1 pipeline candidate."),
    ("Pipeline Power User", "PIPELINE", "#BE185D", "Has 50+ pipeline candidates."),
    ("Pipeline Never Used", "PIPELINE", "#94A3B8", "Has never added a pipeline candidate."),

    ("Solo User", "TEAM", "#78716C", "Only one team member (just the account owner)."),
    ("Team Account", "TEAM", "#57534E", "Has 2+ team members."),

    ("Logged In This Week", "ENGAGEMENT", "#14B8A6", "Company rep or a team member logged in within the last 7 days."),
    ("Inactive 14 Days", "ENGAGEMENT", "#F97316", "No login recorded in the last 14+ days."),
    ("Inactive 30 Days", "ENGAGEMENT", "#DC2626", "No login recorded in the last 30+ days."),
]

CUSTOM_TAGS = [
    ("Beta Tester", "#3B82F6", "Opted in to try new features early."),
    ("VIP Account", "#EAB308", "High-touch, white-glove account."),
    ("Enterprise Prospect", "#8B5CF6", "Being evaluated for an enterprise deal."),
    ("Needs Follow-up", "#F97316", "Flagged by the team for manual follow-up."),
    ("Partner Agency", "#0EA5E9", "A partner recruitment agency."),
    ("Nigeria Market", "#16A34A", "Primary market is Nigeria."),
    ("UK Market", "#2563EB", "Primary market is the UK."),
    ("At Risk", "#DC2626", "Showing signs of churn risk beyond the automated dormant/churned tags."),
]


def seed_tags(apps, schema_editor):
    Tag = apps.get_model("tags", "Tag")
    for name, category, colour, description in SYSTEM_TAGS:
        if not Tag.objects.filter(name=name).exists():
            Tag.objects.create(
                name=name,
                slug=slugify(name),
                category=category,
                colour=colour,
                description=description,
                tag_type="SYSTEM",
                is_active=True,
            )
    for name, colour, description in CUSTOM_TAGS:
        if not Tag.objects.filter(name=name).exists():
            Tag.objects.create(
                name=name,
                slug=slugify(name),
                category="CUSTOM",
                colour=colour,
                description=description,
                tag_type="CUSTOM",
                is_active=True,
            )


class Migration(migrations.Migration):
    dependencies = [
        ("tags", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_tags, reverse_code=migrations.RunPython.noop),
    ]
