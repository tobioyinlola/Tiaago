import logging
import os
import secrets

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from create_user.tasks import ping_task
from django.shortcuts import render

logger = logging.getLogger("talentsync_backend")

# Failed health-auth attempts allowed per IP before throttling kicks in.
HEALTH_THROTTLE_LIMIT = 10
HEALTH_THROTTLE_WINDOW = 600  # seconds


@require_GET
@csrf_exempt
def health_check(request):
    """Public liveness check — no DB, no internals. Also the warm-up target
    the frontend pings to spin up the Render free instance early."""
    return JsonResponse({
        "status": "healthy",
        "time": timezone.now().isoformat(),
    })


def _client_ip(request):
    # Behind Render's proxy the client is the first X-Forwarded-For hop.
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _failed_auth_count(ip):
    try:
        return int(cache.get(f"health:fail:{ip}") or 0)
    except Exception:
        # Cache being down must never break the health endpoint itself —
        # it is reported separately by the cache probe below.
        return 0


def _record_failed_auth(ip):
    key = f"health:fail:{ip}"
    try:
        try:
            cache.incr(key)
        except ValueError:
            cache.add(key, 1, HEALTH_THROTTLE_WINDOW)
    except Exception:
        pass


@require_GET
@csrf_exempt
def health_status(request):
    """Authenticated health check for uptime monitoring (cron-job.org).

    Probes the database and cache so a non-2xx response means a real outage,
    not just a slow request. Auth is the X-Health-Key header compared against
    HEALTHCHECK_SECRET; an empty secret (local dev) disables the check.
    """
    secret = os.environ.get("HEALTHCHECK_SECRET", "")
    if secret:
        ip = _client_ip(request)
        if _failed_auth_count(ip) >= HEALTH_THROTTLE_LIMIT:
            return JsonResponse({"detail": "too many requests"}, status=429)
        provided = request.headers.get("X-Health-Key", "")
        if not secrets.compare_digest(provided, secret):
            _record_failed_auth(ip)
            logger.warning(f"Health check auth failure from {ip}")
            return JsonResponse({"detail": "unauthorized"}, status=401)

    db_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        db_ok = False
        logger.exception("Health check: database unreachable")

    cache_ok = True
    try:
        cache.set("health:probe", "1", 10)
        cache_ok = cache.get("health:probe") == "1"
    except Exception:
        cache_ok = False
    if not cache_ok:
        logger.error("Health check: cache unreachable")

    healthy = db_ok and cache_ok
    return JsonResponse(
        {
            "status": "ok" if healthy else "error",
            "db": "ok" if db_ok else "unreachable",
            "cache": "ok" if cache_ok else "unreachable",
            "time": timezone.now().isoformat(),
        },
        status=200 if healthy else 503,
    )

@require_GET
@csrf_exempt
def test_endpoint(request):
    """Test endpoint to verify Django is working"""
    return JsonResponse({
        "success": True,
        "data": "Hello from Tiaago Backend!",
        "version": "1.0.0-production"
    })

@require_GET
@csrf_exempt
def media_debug(request):
    """Debug endpoint for media files"""
    media_root = os.environ.get('MEDIA_ROOT', '/app/media')
    static_root = os.environ.get('STATIC_ROOT', '/app/staticfiles')

    return JsonResponse({
        "media_debug": True,
        "media_root": media_root,
        "static_root": static_root,
        "media_exists": os.path.exists(media_root),
        "static_exists": os.path.exists(static_root),
        "working_directory": os.getcwd()
    })
    
def test_ping(request):
    task = ping_task.delay()   
    return JsonResponse({"task_id": task.id})

# (sentry trigger_error view removed — production routes must not crash by design)
def ws_test(request):
    return render(request, "ws_test.html")