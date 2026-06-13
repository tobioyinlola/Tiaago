"""
Dev-only preview views for the Tiaago email templates.

Wire up in your project urls.py (guard behind DEBUG):

    if settings.DEBUG:
        urlpatterns += [path("dev/emails/", include("emails_app.urls"))]

Then visit /dev/emails/ for the index and /dev/emails/<name>/ for one email.
Append ?format=txt to any email URL to see its plain-text alternative.
"""
from django.http import HttpResponse, Http404
from django.shortcuts import render

from .sample_context import SAMPLE_CONTEXT, EMAIL_META, EMAIL_ORDER
from .services import render_email


def email_index(request):
    """Grid of every template with links to HTML + text previews."""
    items = []
    for name in EMAIL_ORDER:
        label, subject = EMAIL_META.get(name, (name, ""))
        items.append({"name": name, "label": label, "subject": subject})
    return render(request, "emails/dev/email_index.html", {"items": items})


def email_preview(request, name):
    """Render a single email with its sample context."""
    if name not in SAMPLE_CONTEXT:
        raise Http404(f"Unknown email template: {name}")
    context = SAMPLE_CONTEXT[name]
    subject, html_body, text_body = render_email(name, context)

    if request.GET.get("format") == "txt":
        return HttpResponse(text_body, content_type="text/plain; charset=utf-8")
    return HttpResponse(html_body)
