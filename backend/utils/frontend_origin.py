"""Which frontend host should links we hand back to the client point at?

The app can be served from more than one hostname (for example
``tiaago.com`` and ``www.tiaago.com``), and a recruiter who signed up on one
should get job links on that same one, not always the single configured
``FRONTEND_URL``. The Next.js server forwards the host it was reached on in the
``X-Frontend-Origin`` header.

That header is client-controlled in principle, so it is only honoured when it
matches an origin we already trust (the configured frontend URLs, CORS/CSRF
origins, an optional ``FRONTEND_EXTRA_ORIGINS`` list, and the ``www.``/bare
variant of each). Anything else falls back to ``settings.FRONTEND_URL`` so a
forged header cannot put an attacker's domain into a link we generate.
"""
from urllib.parse import urlsplit

from django.conf import settings

HEADER = "X-Frontend-Origin"


def _origin(value):
    """``scheme://host[:port]`` for an http(s) URL, else ``None``."""
    try:
        parts = urlsplit(str(value).strip())
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or not parts.netloc or parts.username or parts.password:
        return None
    return f"{parts.scheme}://{parts.netloc}".lower()


def _with_www_variants(origin):
    scheme, _, host = origin.partition("://")
    yield origin
    yield f"{scheme}://{host[4:]}" if host.startswith("www.") else f"{scheme}://www.{host}"


def allowed_frontend_origins():
    configured = [
        getattr(settings, "FRONTEND_URL", ""),
        getattr(settings, "FRONTEND_BASE_URL", ""),
        *getattr(settings, "CSRF_TRUSTED_ORIGINS", []),
        *getattr(settings, "CORS_ALLOWED_ORIGINS", []),
        *getattr(settings, "FRONTEND_EXTRA_ORIGINS", []),
    ]
    allowed = set()
    for value in configured:
        origin = _origin(value)
        if origin:
            allowed.update(_with_www_variants(origin))
    return allowed


def default_frontend_url():
    return str(getattr(settings, "FRONTEND_URL", "")).rstrip("/")


def frontend_base_url(request=None):
    """Base URL (no trailing slash) to build user-facing links on."""
    header = getattr(request, "headers", {}).get(HEADER) if request is not None else None
    origin = _origin(header) if header else None
    if origin and origin in allowed_frontend_origins():
        return origin
    return default_frontend_url()
