"""Second rendering pass, run once per CampaignSend immediately before
sending: substitutes merge tags with that recipient's live data, wraps every
link so clicks route through the click-tracking redirect, and appends the
open-tracking pixel. Kept separate from campaigns.block_renderer (which only
ever produces the generic, still-templated HTML/text stored on
EmailTemplate/EmailCampaign) so "what an admin edits/previews" and "what
actually gets mailed" stay cleanly distinct.
"""

import re
from urllib.parse import quote

from django.conf import settings

_MERGE_TAG_RE = re.compile(r"{{\s*([a-z_]+)\s*}}")
_HREF_RE = re.compile(r'href="([^"]+)"')


def _frontend_base_url():
    base = getattr(settings, "FRONTEND_BASE_URL", None) or "https://www.tiaago.com"
    return base.rstrip("/")


def _backend_base_url():
    # BASE_URL is the Django backend's own public origin -- distinct from
    # FRONTEND_BASE_URL (the Next.js app). Tracking endpoints are backend
    # API routes (/api/email/track/...), so they must use this, not the
    # frontend origin.
    base = getattr(settings, "BASE_URL", None) or "http://localhost:8000"
    return base.rstrip("/")


def substitute_merge_tags(text, context):
    def _sub(match):
        tag = match.group(1)
        return str(context.get(tag, match.group(0)))
    return _MERGE_TAG_RE.sub(_sub, text)


def _wrap_links_for_click_tracking(html_body, campaign_send_id):
    base = _backend_base_url()

    def _wrap(match):
        url = match.group(1)
        if url.startswith("{{") or not url or url.startswith("#"):
            return match.group(0)
        tracked = f"{base}/api/email/track/click/{campaign_send_id}/?url={quote(url, safe='')}"
        return f'href="{tracked}"'

    return _HREF_RE.sub(_wrap, html_body)


def _append_tracking_pixel(html_body, campaign_send_id):
    base = _backend_base_url()
    pixel = f'<img src="{base}/api/email/track/open/{campaign_send_id}/" width="1" height="1" alt="" style="display:block;border:0;" />'
    if "</body>" in html_body:
        return html_body.replace("</body>", f"{pixel}</body>")
    return html_body + pixel


def personalize_for_send(html_body, plain_text_body, context, campaign_send):
    """context must already include unsubscribe_url (built from
    campaign_send.unsubscribe_token) alongside the org's live merge data."""
    html = substitute_merge_tags(html_body, context)
    text = substitute_merge_tags(plain_text_body, context)
    html = _wrap_links_for_click_tracking(html, campaign_send.id)
    html = _append_tracking_pixel(html, campaign_send.id)
    return html, text


def build_unsubscribe_url(campaign_send):
    return f"{_frontend_base_url()}/unsubscribe?token={campaign_send.unsubscribe_token}"
