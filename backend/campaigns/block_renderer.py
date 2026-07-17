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

CONTAINER_WIDTH = 600
DEFAULT_HEADER_COLOUR = "#1A3C5E"
DEFAULT_BUTTON_COLOUR = "#1D9E75"
SPACER_HEIGHTS = {"small": 8, "medium": 16, "large": 32}

DEFAULT_FOOTER = {
    "type": "FOOTER",
    "company_name": "Tiaago",
    "address": "",
    "privacy_url": "https://www.tiaago.com/privacy-policy",
    "social_links": [],
}


def _esc(value):
    return html_lib.escape(str(value or ""))


def _wrap_row(inner_html):
    return (
        f'<tr><td style="padding:0;">{inner_html}</td></tr>'
    )


def _render_header(block):
    logo_url = _esc(block.get("logo_url"))
    bg = _esc(block.get("background_colour") or DEFAULT_HEADER_COLOUR)
    subtitle = _esc(block.get("subtitle"))
    logo_html = (
        f'<img src="{logo_url}" alt="Logo" width="140" height="40" style="display:block;border:0;outline:none;" />'
        if logo_url else ""
    )
    subtitle_html = (
        f'<p style="margin:8px 0 0;color:#ffffff;font-size:13px;opacity:0.85;">{subtitle}</p>' if subtitle else ""
    )
    return _wrap_row(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{bg};">'
        f'<tr><td style="padding:24px 32px;text-align:center;">{logo_html}{subtitle_html}</td></tr>'
        f"</table>"
    )


def _render_text(block):
    font_size = "20px" if block.get("font_size") == "large" else "15px"
    align = block.get("align") if block.get("align") in ("left", "center") else "left"
    body = block.get("html") or ""  # trusted staff-authored rich text HTML, not user input
    return _wrap_row(
        f'<div style="padding:16px 32px;font-size:{font_size};line-height:1.6;color:#1F2937;text-align:{align};font-family:Arial,Helvetica,sans-serif;">{body}</div>'
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
    colour = _esc(block.get("colour") or "#E5E7EB")
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
        f'<div style="font-size:13px;color:#6B7280;margin-top:4px;">{label}</div>'
        f"</div>"
    )


def _render_footer(block):
    company_name = _esc(block.get("company_name") or DEFAULT_FOOTER["company_name"])
    address = _esc(block.get("address"))
    privacy_url = _esc(block.get("privacy_url") or DEFAULT_FOOTER["privacy_url"])
    social_links = block.get("social_links") or []
    social_html = " &middot; ".join(
        f'<a href="{_esc(s.get("url"))}" style="color:#6B7280;">{_esc(s.get("platform"))}</a>' for s in social_links
    )
    address_html = f" &middot; {address}" if address else ""
    social_row_html = f'<div style="margin-top:8px;">{social_html}</div>' if social_html else ""
    return _wrap_row(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;">'
        f'<tr><td style="padding:24px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;">'
        f"<div>{company_name}{address_html}</div>"
        f"{social_row_html}"
        f'<div style="margin-top:12px;">'
        f'<a href="{{{{unsubscribe_url}}}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>'
        f' &middot; <a href="{privacy_url}" style="color:#6B7280;text-decoration:underline;">Privacy Policy</a>'
        f"</div></td></tr></table>"
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

    html_body = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background-color:#F3F4F6;padding:24px 0;">'
        "<tr><td align=\"center\">"
        f'<table role="presentation" width="{CONTAINER_WIDTH}" cellpadding="0" cellspacing="0" '
        f'style="width:{CONTAINER_WIDTH}px;max-width:100%;background-color:#ffffff;">'
        + "".join(rows)
        + "</table></td></tr></table>"
    )
    plain_text = "\n".join(line for line in text_lines if line is not None).strip()
    return html_body, plain_text
