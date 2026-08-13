"""Converts an EmailTemplate's `blocks` JSON array into standalone,
inline-CSS-only, table-based HTML (MSO-safe, 600px container) plus a plain
text fallback. Called on every template save (campaigns/views.py) -- NOT at
send time. Merge tags are left as literal {{tag}} placeholders here;
campaigns.send_renderer does the per-recipient substitution afterward.

The FOOTER block (unsubscribe link, required by law) is enforced here: if a
saved template is missing one, a default is injected so the legal
requirement can't be bypassed by a malformed frontend payload.
"""

import html as html_lib
import re

from django.conf import settings

CONTAINER_WIDTH = 600
# Matches the transactional "deep navy masthead" design (templates/emails/base.html)
# -- navy header/footer, indigo->cyan gradient signature bar, blue CTA buttons,
# near-black body copy. Campaign emails render through this module instead of
# base.html (no Django template context here), so the same look is reproduced
# directly rather than shared via {% extends %}.
DEFAULT_HEADER_COLOUR = "#1C3477"
DEFAULT_BUTTON_COLOUR = "#5465FF"
DEFAULT_TEXT_COLOUR = "#000000"
GRADIENT_START = "#5465FF"
GRADIENT_END = "#3E92CC"
SPACER_HEIGHTS = {"small": 8, "medium": 16, "large": 32}

DEFAULT_FOOTER = {
    "type": "FOOTER",
    "company_name": "Tiaago",
    "address": "",
    "privacy_url": "https://www.tiaago.com/privacy-policy",
    "social_links": [],
}


def _asset_url(filename):
    frontend = getattr(settings, "FRONTEND_URL", "https://www.tiaago.com/").rstrip("/")
    return f"{frontend}/emails/assets/{filename}"


def _gradient_bar():
    """The thin indigo->cyan bar that bookends the masthead/footer in
    base.html -- solid GRADIENT_START bgcolor fallback for clients that
    don't render the CSS gradient (e.g. Outlook)."""
    return _wrap_row(
        f'<div style="background-color:{GRADIENT_START};background-image:linear-gradient(90deg,{GRADIENT_START},{GRADIENT_END});'
        f'font-size:0;line-height:0;height:6px;">&nbsp;</div>'
    )


def _esc(value):
    return html_lib.escape(str(value or ""))


def _wrap_row(inner_html):
    return (
        f'<tr><td style="padding:0;">{inner_html}</td></tr>'
    )


def _render_header(block):
    # Logo + "Hiring, reimagined" kicker are the fixed brand masthead (same as
    # every transactional email) -- not per-block configurable, so a staff
    # member building a campaign can't accidentally ship one without a logo.
    logo_url = _esc(block.get("logo_url") or _asset_url("Tiaago_logo_white.png"))
    bg = _esc(block.get("background_colour") or DEFAULT_HEADER_COLOUR)
    subtitle = _esc(block.get("subtitle"))
    pattern_url = _asset_url("pattern-tiles-white.png")
    subtitle_html = (
        f'<tr><td colspan="2" style="padding-top:10px;">'
        f'<p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:14px;">{subtitle}</p>'
        f"</td></tr>"
        if subtitle else ""
    )
    return _wrap_row(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background-color:{bg};background-image:url(\'{pattern_url}\'),url(\'{pattern_url}\');'
        f'background-repeat:no-repeat,no-repeat;background-position:top -30px right -10px,bottom -160px left -70px;'
        f'background-size:360px auto,240px auto;">'
        f'<tr><td style="padding:24px 32px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
        f'<td align="left" valign="middle"><img src="{logo_url}" alt="Tiaago" width="110" style="display:block;width:110px;height:auto;border:0;outline:none;" /></td>'
        f'<td align="right" valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#AEB8E8;">Hiring,&nbsp;reimagined</td>'
        f"</tr>{subtitle_html}</table>"
        f"</td></tr></table>"
    )


def _render_text(block):
    font_size = "20px" if block.get("font_size") == "large" else "15px"
    align = block.get("align") if block.get("align") in ("left", "center") else "left"
    body = block.get("html") or ""  # trusted staff-authored rich text HTML, not user input
    return _wrap_row(
        f'<div style="padding:16px 32px;font-size:{font_size};line-height:1.6;color:{DEFAULT_TEXT_COLOUR};text-align:{align};font-family:Arial,Helvetica,sans-serif;">{body}</div>'
    )


def _render_button(block):
    label = _esc(block.get("label") or "Click here")
    url = _esc(block.get("url") or "#")
    colour = _esc(block.get("colour") or DEFAULT_BUTTON_COLOUR)
    align = block.get("align") if block.get("align") in ("left", "center", "right") else "center"
    return _wrap_row(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 32px;text-align:{align};">'
        f'<a href="{url}" style="background-color:{colour};color:#ffffff;padding:12px 28px;border-radius:6px;'
        f'text-decoration:none;font-weight:bold;font-size:15px;font-family:Arial,Helvetica,sans-serif;display:inline-block;">{label}</a>'
        f"</td></tr></table>"
    )


def _render_image(block):
    url = _esc(block.get("url"))
    alt = _esc(block.get("alt"))
    link_url = block.get("link_url")
    width = int(block.get("width") or CONTAINER_WIDTH - 64)
    height = int(block.get("height") or 0) or "auto"
    img = f'<img src="{url}" alt="{alt}" width="{width}" {"" if height == "auto" else f"height={height}"} style="display:block;width:100%;max-width:{width}px;height:auto;border:0;outline:none;" />'
    if link_url:
        img = f'<a href="{_esc(link_url)}">{img}</a>'
    return _wrap_row(f'<div style="padding:16px 32px;text-align:center;">{img}</div>')


def _render_divider(block):
    colour = _esc(block.get("colour") or "#E0E0E0")
    return _wrap_row(
        f'<div style="padding:0 32px;"><hr style="border:none;border-top:1px solid {colour};margin:8px 0;" /></div>'
    )


def _render_spacer(block):
    height = SPACER_HEIGHTS.get(block.get("height"), SPACER_HEIGHTS["medium"])
    return _wrap_row(f'<div style="height:{height}px;line-height:{height}px;font-size:1px;">&nbsp;</div>')


def _render_stat(block):
    label = _esc(block.get("label"))
    merge_tag = _esc(block.get("merge_tag"))
    return _wrap_row(
        f'<div style="padding:16px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;">'
        f'<div style="font-size:36px;font-weight:bold;color:{DEFAULT_HEADER_COLOUR};">{{{{{merge_tag}}}}}</div>'
        f'<div style="font-size:13px;color:#9E9E9E;margin-top:4px;">{label}</div>'
        f"</div>"
    )


def _render_footer(block):
    """Navy brand-moment footer bookending the masthead (matches base.html's
    FOOTER section) -- gradient bar, tagline, social links, divider, then
    company/address/unsubscribe/privacy in muted blue-grey."""
    company_name = _esc(block.get("company_name") or DEFAULT_FOOTER["company_name"])
    address = _esc(block.get("address"))
    privacy_url = _esc(block.get("privacy_url") or DEFAULT_FOOTER["privacy_url"])
    pattern_url = _asset_url("pattern-tiles-white.png")
    social_links = block.get("social_links") or []
    social_html = "&nbsp;&middot;&nbsp;".join(
        f'<a href="{_esc(s.get("url"))}" target="_blank" style="color:#AEB8E8;text-decoration:none;font-weight:bold;">{_esc(s.get("platform"))}</a>'
        for s in social_links
    )
    social_row_html = (
        f'<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#AEB8E8;">{social_html}</p>'
        if social_html else ""
    )
    address_html = f"{address}<br />" if address else ""
    return _gradient_bar() + _wrap_row(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background-color:{DEFAULT_HEADER_COLOUR};background-image:url(\'{pattern_url}\');'
        f'background-repeat:no-repeat;background-position:bottom -120px right -40px;background-size:300px auto;">'
        f'<tr><td style="padding:32px;">'
        f'<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;font-weight:bold;color:#ffffff;">AI-powered end-to-end hiring<br />platform for modern teams.</p>'
        f"{social_row_html}"
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #2E4585;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>'
        f'<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#9AA6D4;">'
        f"{company_name}<br />{address_html}"
        f'<a href="{{{{unsubscribe_url}}}}" style="color:#9AA6D4;text-decoration:underline;">Unsubscribe</a>'
        f' &middot; <a href="{privacy_url}" style="color:#9AA6D4;text-decoration:underline;">Privacy Policy</a>'
        f"</p></td></tr></table>"
    )


_RENDERERS = {
    "HEADER": _render_header,
    "TEXT": _render_text,
    "BUTTON": _render_button,
    "IMAGE": _render_image,
    "DIVIDER": _render_divider,
    "SPACER": _render_spacer,
    "STAT": _render_stat,
    "FOOTER": _render_footer,
}

_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html_to_text(html_str):
    text = _TAG_RE.sub("", html_str or "")
    return html_lib.unescape(text).strip()


def ensure_footer(blocks):
    """Guarantees exactly one FOOTER block, always last -- enforced
    server-side so the unsubscribe link can't be dropped by a bad payload."""
    non_footer = [b for b in blocks if b.get("type") != "FOOTER"]
    footer = next((b for b in blocks if b.get("type") == "FOOTER"), None) or DEFAULT_FOOTER
    return [*non_footer, footer]


def render_blocks(blocks):
    """Returns (html_body, plain_text_body). blocks must already have gone
    through ensure_footer()."""
    rows = []
    text_lines = []

    for block in blocks:
        renderer = _RENDERERS.get(block.get("type"))
        if not renderer:
            continue
        rows.append(renderer(block))

        btype = block.get("type")
        if btype == "HEADER":
            # Signature gradient bar directly under the masthead, matching
            # base.html -- _render_footer adds its own bookend bar above itself.
            rows.append(_gradient_bar())
        if btype == "TEXT":
            text_lines.append(_strip_html_to_text(block.get("html")))
        elif btype == "BUTTON":
            text_lines.append(f"{block.get('label')}: {block.get('url')}")
        elif btype == "STAT":
            text_lines.append(f"{block.get('label')}: {{{{{block.get('merge_tag')}}}}}")
        elif btype == "FOOTER":
            text_lines.append(
                f"Unsubscribe: {{{{unsubscribe_url}}}}\n{block.get('company_name', '')} {block.get('address', '')}".strip()
            )
        text_lines.append("")

    page_pattern_url = _asset_url("pattern-page-indigo.png")
    html_body = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background-color:#EEF1FB;background-image:url(\'{page_pattern_url}\');background-repeat:repeat;padding:24px 0;">'
        "<tr><td align=\"center\">"
        f'<table role="presentation" width="{CONTAINER_WIDTH}" cellpadding="0" cellspacing="0" '
        f'style="width:{CONTAINER_WIDTH}px;max-width:100%;background-color:#ffffff;overflow:hidden;">'
        + "".join(rows)
        + "</table></td></tr></table>"
    )
    plain_text = "\n".join(line for line in text_lines if line is not None).strip()
    return html_body, plain_text
