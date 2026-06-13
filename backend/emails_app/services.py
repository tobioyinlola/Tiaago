"""
Email rendering + sending service.

`render_email(name, context)` returns (subject, html_body, text_body).
`send_tiaago_email(name, to, context)` renders and sends via the
project's EmailHandler (Resend primary, Mailgun fallback).

Templates live in:  templates/emails/<name>.html   (HTML, extends base.html)
                    templates/emails/text/<name>.txt (plain-text alternative)
"""
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from .sample_context import EMAIL_META


def render_email(name, context=None):
    """Render an email by template name. Returns (subject, html, text)."""
    context = context or {}
    if settings.DEBUG:
        base = getattr(settings, "BASE_URL", "http://localhost:8000")
        asset_url = f"{base}/static/emails/assets"
    else:
        frontend = getattr(settings, "FRONTEND_URL", "https://www.tiaago.com/").rstrip("/")
        asset_url = f"{frontend}/emails/assets"
    context.setdefault("asset_url", asset_url)
    context.setdefault("logo_url", f"{asset_url}/Tiaago_logo_white.png")
    context.setdefault("hero_url", f"{asset_url}/welcome-onboard.png")
    context.setdefault("wave_url", f"{asset_url}/wave-indigo-alpha.png")
    label, subject = EMAIL_META.get(name, (name, "Tiaago"))
    subject = context.get("subject", subject)

    html_body = render_to_string(f"emails/{name}.html", context)

    try:
        text_body = render_to_string(f"emails/text/{name}.txt", context)
    except Exception:
        text_body = strip_tags(html_body)

    return subject, html_body, text_body


def send_tiaago_email(name, to, context=None, email_type=None, security=False):
    """Render `name` with `context` and send via EmailHandler (Resend/Mailgun)."""
    from utils.email_handler import EmailHandler

    if isinstance(to, str):
        to = [to]
    subject, html_body, text_body = render_email(name, context)

    handler = EmailHandler(to)
    return handler.send_mail(
        subject=subject,
        context=context or {},
        template=f"emails/{name}.html",
        email_type=email_type,
        security=security,
    )
