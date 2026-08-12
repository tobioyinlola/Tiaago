from django.db import migrations

# "Win back dormant users" and "Monthly usage summary" (seeded by
# 0003_seed_preset_templates) used the navy header colour for their CTA
# button instead of the brand green reserved for CTAs -- block_renderer.py
# has since been fixed so any *newly* seeded template renders correctly;
# this catches up the two rows already written by 0003 in any environment
# where it already ran.
FIXED_PRESET_NAMES = ["Win back dormant users", "Monthly usage summary"]
OLD_COLOUR = "#1A3C5E"
NEW_COLOUR = "#1D9E75"


def fix_button_colour(apps, schema_editor):
    from campaigns.block_renderer import render_blocks

    EmailTemplate = apps.get_model("campaigns", "EmailTemplate")
    for template in EmailTemplate.objects.filter(name__in=FIXED_PRESET_NAMES, is_preset=True):
        changed = False
        blocks = template.blocks or []
        for block in blocks:
            if block.get("type") == "BUTTON" and block.get("colour") == OLD_COLOUR:
                block["colour"] = NEW_COLOUR
                changed = True
        if not changed:
            continue
        html_body, plain_text_body = render_blocks(blocks)
        template.blocks = blocks
        template.html_body = html_body
        template.plain_text_body = plain_text_body
        template.save(update_fields=["blocks", "html_body", "plain_text_body"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("campaigns", "0007_remove_emailcampaign_single_email_fields"),
    ]

    operations = [
        migrations.RunPython(fix_button_colour, noop_reverse),
    ]
