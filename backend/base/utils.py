from django.forms import FileField
from django.http import HttpRequest
from django.conf import settings
import ipaddress
import os
import requests
from loguru import logger

def extract_query_from_request(request: HttpRequest, param_name="q"):
    return request.GET.get(param_name)


def _is_valid_ip(ip: str) -> bool:
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def get_client_ip(request: HttpRequest) -> str | None:
    """Best-effort real client IP behind a reverse proxy/load balancer --
    X-Forwarded-For's first entry is the original client, everything after
    is intermediate proxies. Falls back to REMOTE_ADDR (correct for local
    dev / direct connections with no proxy in front).

    X-Forwarded-For is a client-supplied header -- validate it's actually a
    well-formed IP before returning it. Callers typically write this straight
    into a GenericIPAddressField via the ORM, which skips validation (no
    full_clean() on save()); an unvalidated garbage value would hit the
    database as a raw, uncaught DataError instead of failing gracefully."""
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    candidate = forwarded_for.split(",")[0].strip() if forwarded_for else request.META.get("REMOTE_ADDR")
    return candidate if candidate and _is_valid_ip(candidate) else None


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved)


def lookup_geo(ip: str | None) -> dict:
    """Best-effort IP geolocation via ip-api.com's free tier (no key
    required, ~45 req/min limit) -- never raises, returns {} on any
    failure or for a private/loopback IP (e.g. local dev), since there's
    nothing meaningful to look up there."""
    if not ip or not _is_public_ip(ip):
        return {}
    try:
        resp = requests.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,country,regionName,city,lat,lon"},
            timeout=3,
        )
        data = resp.json()
    except Exception:
        logger.warning("Geo lookup failed for IP %s", ip)
        return {}
    if data.get("status") != "success":
        return {}
    return {
        "country": data.get("country"),
        "region": data.get("regionName"),
        "city": data.get("city"),
        "lat": data.get("lat"),
        "lon": data.get("lon"),
    }

base_url=os.getenv("BASE_URL", "")
def get_media_url(file):
    if not file:
        return None

    try:
        url = file.url  # handles FileField or ImageField
    except AttributeError:
        url = str(file)  # handles string fallback

    base_url = ""
    if settings.IS_STAGING:
        base_url = ""
    elif settings.IS_DEV:
        base_url = ""
    elif settings.IS_PRODUCTION:
        base_url = ""
    else:
        base_url = ""

    return base_url + url if base_url else url
