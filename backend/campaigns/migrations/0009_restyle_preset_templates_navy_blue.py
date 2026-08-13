from django.db import migrations

# block_renderer.py has moved from a green-CTA/grey-footer design to the same
# "deep navy masthead" look as every transactional email (base.html): navy
# header/footer with the tile pattern, indigo->cyan gradient signature bar,
# blue (#5465FF) CTA buttons, black body text. Re-rendering every preset
# picks up all of that automatically (render_blocks() regenerates the whole
# html_body from the stored blocks) -- this migration only needs to touch the
# block *data* that hardcoded the old defaults, so a preset that already
# customized its own colour isn't silently overwritten.
OLD_HEADER_COLOUR = "#1A3C5E"
NEW_HEADER_COLOUR = "#1C3477"
OLD_BUTTON_COLOURS = {"#1D9E75", "#1A3C5E"}
NEW_BUTTON_COLOUR = "#5465FF"


def restyle_presets(apps, schema_editor):
    from campaigns.block_renderer import render_blocks

    EmailTemplate = apps.get_model("campaigns", "EmailTemplate")
    for template in EmailTemplate.objects.filter(is_preset=True):
        blocks = template.blocks or []
        for block in blocks:
            btype = block.get("type")
            if btype == "HEADER" and block.get("background_colour") in (None, OLD_HEADER_COLOUR):
                block["background_colour"] = NEW_HEADER_COLOUR
            elif btype == "BUTTON" and block.get("colour") in OLD_BUTTON_COLOURS:
                block["colour"] = NEW_BUTTON_COLOUR

        html_body, plain_text_body = render_blocks(blocks)
        template.blocks = blocks
        template.html_body = html_body
        template.plain_text_body = plain_text_body
        template.save(update_fields=["blocks", "html_body", "plain_text_body"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("campaigns", "0008_fix_preset_cta_button_colour"),
    ]

    operations = [
        migrations.RunPython(restyle_presets, noop_reverse),
    ]
