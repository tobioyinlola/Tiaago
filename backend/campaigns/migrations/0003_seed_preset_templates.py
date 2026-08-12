from django.db import migrations

from campaigns.block_renderer import ensure_footer, render_blocks

FOOTER = {"type": "FOOTER", "company_name": "Tiaago", "address": "Lagos, Nigeria",
          "privacy_url": "https://www.tiaago.com/privacy-policy", "social_links": []}

PRESET_TEMPLATES = [
    {
        "name": "Welcome and activate",
        "category": "ONBOARDING",
        "subject_line": "Welcome to Tiaago, {{first_name}}!",
        "preview_text": "Here's how to get your first candidates screened in minutes.",
        "blocks": [
            {"type": "HEADER", "background_colour": "#1A3C5E", "subtitle": "Welcome to Tiaago"},
            {"type": "TEXT", "font_size": "large", "align": "left",
             "html": "<p>Hi {{first_name}},</p><p>Welcome to Tiaago! {{org_name}} is all set up -- post a job and let our AI screen resumes for you in minutes.</p>"},
            {"type": "BUTTON", "label": "Post your first job", "url": "https://www.tiaago.com/recruiter/dashboard/jobs/create", "colour": "#1D9E75", "align": "center"},
            {"type": "SPACER", "height": "medium"},
            FOOTER,
        ],
        "merge_tags": ["first_name", "org_name"],
    },
    {
        "name": "Free credits running out",
        "category": "UPSELL",
        "subject_line": "Your free credits are running low",
        "preview_text": "Top up your wallet to keep screening without interruption.",
        "blocks": [
            {"type": "HEADER", "background_colour": "#1A3C5E"},
            {"type": "TEXT", "font_size": "large", "align": "left",
             "html": "<p>Hi {{first_name}},</p><p>Your free credits for {{org_name}} are almost gone -- your wallet balance is currently <strong>₦{{wallet_balance}}</strong>. Top up now to keep screening resumes without interruption.</p>"},
            {"type": "BUTTON", "label": "Top up wallet", "url": "https://www.tiaago.com/recruiter/dashboard/billing", "colour": "#1D9E75", "align": "center"},
            FOOTER,
        ],
        "merge_tags": ["first_name", "org_name", "wallet_balance"],
    },
    {
        "name": "Assessment upsell for active screeners",
        "category": "UPSELL",
        "subject_line": "You've screened {{resumes_screened_total}} resumes -- try assessments next",
        "preview_text": "Add skill assessments to go beyond the resume.",
        "blocks": [
            {"type": "HEADER", "background_colour": "#1A3C5E"},
            {"type": "TEXT", "font_size": "large", "align": "left",
             "html": "<p>Hi {{first_name}},</p><p>{{org_name}} has screened {{resumes_screened_total}} resumes on Tiaago -- nice work. Ready to go further? Skill assessments let you validate candidates before you interview them.</p>"},
            {"type": "STAT", "label": "Resumes screened all time", "merge_tag": "resumes_screened_total"},
            {"type": "BUTTON", "label": "Create an assessment", "url": "https://www.tiaago.com/recruiter/dashboard/assessments/create", "colour": "#1D9E75", "align": "center"},
            FOOTER,
        ],
        "merge_tags": ["first_name", "org_name", "resumes_screened_total"],
    },
    {
        "name": "Win back dormant users",
        "category": "WINBACK",
        "subject_line": "We miss you, {{first_name}}",
        "preview_text": "See what's new since you've been away.",
        "blocks": [
            {"type": "HEADER", "background_colour": "#1A3C5E"},
            {"type": "TEXT", "font_size": "large", "align": "left",
             "html": "<p>Hi {{first_name}},</p><p>It's been a while since {{org_name}} last screened a resume on Tiaago. We've shipped a lot of improvements since then -- come see what's new.</p>"},
            {"type": "BUTTON", "label": "Come back to Tiaago", "url": "https://www.tiaago.com/recruiter/dashboard", "colour": "#1D9E75", "align": "center"},
            FOOTER,
        ],
        "merge_tags": ["first_name", "org_name"],
    },
    {
        "name": "Low wallet balance alert",
        "category": "TRANSACTIONAL",
        "subject_line": "Low wallet balance on your Tiaago account",
        "preview_text": "Your wallet balance is below ₦500.",
        "blocks": [
            {"type": "HEADER", "background_colour": "#1A3C5E"},
            {"type": "TEXT", "font_size": "large", "align": "left",
             "html": "<p>Hi {{first_name}},</p><p>{{org_name}}'s wallet balance is now <strong>₦{{wallet_balance}}</strong> -- top up soon to avoid any interruption to resume screening or assessments.</p>"},
            {"type": "BUTTON", "label": "Top up now", "url": "https://www.tiaago.com/recruiter/dashboard/billing", "colour": "#1D9E75", "align": "center"},
            FOOTER,
        ],
        "merge_tags": ["first_name", "org_name", "wallet_balance"],
    },
    {
        "name": "Feature announcement",
        "category": "ANNOUNCEMENT",
        "subject_line": "New on Tiaago: [feature name]",
        "preview_text": "[One-line summary of the new feature]",
        "blocks": [
            {"type": "HEADER", "background_colour": "#1A3C5E", "subtitle": "What's new"},
            {"type": "TEXT", "font_size": "large", "align": "left",
             "html": "<p>Hi {{first_name}},</p><p>[Describe the new feature and why {{org_name}} should care.]</p>"},
            {"type": "IMAGE", "url": "", "alt": "Feature screenshot"},
            {"type": "BUTTON", "label": "Try it now", "url": "https://www.tiaago.com/recruiter/dashboard", "colour": "#1D9E75", "align": "center"},
            FOOTER,
        ],
        "merge_tags": ["first_name", "org_name"],
    },
    {
        "name": "Monthly usage summary",
        "category": "EDUCATIONAL",
        "subject_line": "{{org_name}}'s Tiaago usage this month",
        "preview_text": "A quick look at your activity this month.",
        "blocks": [
            {"type": "HEADER", "background_colour": "#1A3C5E", "subtitle": "Your monthly summary"},
            {"type": "TEXT", "font_size": "body", "align": "left", "html": "<p>Hi {{first_name}}, here's what {{org_name}} did on Tiaago this month:</p>"},
            {"type": "STAT", "label": "Resumes screened this month", "merge_tag": "resumes_screened_month"},
            {"type": "STAT", "label": "Assessments this month", "merge_tag": "assessments_total"},
            {"type": "STAT", "label": "Active jobs", "merge_tag": "active_jobs"},
            {"type": "BUTTON", "label": "View full dashboard", "url": "https://www.tiaago.com/recruiter/dashboard", "colour": "#1D9E75", "align": "center"},
            FOOTER,
        ],
        "merge_tags": ["first_name", "org_name", "resumes_screened_month", "assessments_total", "active_jobs"],
    },
]


def seed_preset_templates(apps, schema_editor):
    EmailTemplate = apps.get_model("campaigns", "EmailTemplate")
    for preset in PRESET_TEMPLATES:
        if EmailTemplate.objects.filter(name=preset["name"], is_preset=True).exists():
            continue
        blocks = ensure_footer(preset["blocks"])
        html_body, plain_text_body = render_blocks(blocks)
        EmailTemplate.objects.create(
            name=preset["name"],
            category=preset["category"],
            subject_line=preset["subject_line"],
            preview_text=preset["preview_text"],
            blocks=blocks,
            html_body=html_body,
            plain_text_body=plain_text_body,
            merge_tags=preset["merge_tags"],
            is_preset=True,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("campaigns", "0002_initial"),
    ]

    operations = [
        migrations.RunPython(seed_preset_templates, reverse_code=migrations.RunPython.noop),
    ]
