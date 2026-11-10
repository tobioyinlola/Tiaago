"""Idempotency-Key support for state-changing API views.

Usage: decorate a view method with ``@idempotent("scope")``. A request without
the ``Idempotency-Key`` header behaves exactly as before. With one:

* first use runs the view and, on a 2xx, remembers the response;
* a repeat with the same key and body replays that response (header
  ``Idempotent-Replayed: true``) without running the view again;
* the same key with a different request is refused (422);
* the same key while the first request is still running is refused (409).

Only successful responses are remembered, so a client may retry a failure
with the same key.
"""
import hashlib
import json
from datetime import timedelta
from functools import wraps

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer

KEY_MAX_LENGTH = 80
RETENTION = timedelta(hours=24)


def _owner(request, kwargs):
    token = kwargs.get("token")
    if token:
        return "t:" + hashlib.sha256(str(token).encode()).hexdigest()[:40]
    user = getattr(request, "user", None)
    return f"u:{user.pk}" if user is not None and user.is_authenticated else "anon"


def _request_hash(request):
    try:
        data = request.data
        items = {}
        for field in data:
            values = data.getlist(field) if hasattr(data, "getlist") else [data[field]]
            items[field] = [
                f"file:{getattr(v, 'name', '')}:{getattr(v, 'size', '')}" if hasattr(v, "read") else str(v)
                for v in values
            ]
    except Exception:  # noqa: BLE001 - unreadable body hashes as empty
        items = {}
    raw = json.dumps([request.method, request.path, items], sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


def idempotent(scope):
    def decorator(view_method):
        @wraps(view_method)
        def wrapper(self, request, *args, **kwargs):
            from .models import IdempotencyRecord

            key = request.headers.get("Idempotency-Key")
            if not key:
                return view_method(self, request, *args, **kwargs)
            key = key.strip()
            if not key or len(key) > KEY_MAX_LENGTH:
                return Response(
                    {"detail": f"Idempotency-Key must be 1-{KEY_MAX_LENGTH} characters."}, status=400
                )
            owner, digest = _owner(request, kwargs), _request_hash(request)

            IdempotencyRecord.objects.filter(
                owner=owner, scope=scope, key=key, created_at__lt=timezone.now() - RETENTION
            ).delete()
            try:
                # Savepoint: a duplicate key must not poison an enclosing transaction.
                with transaction.atomic():
                    record = IdempotencyRecord.objects.create(
                        owner=owner, scope=scope, key=key, request_hash=digest
                    )
            except IntegrityError:
                existing = IdempotencyRecord.objects.filter(owner=owner, scope=scope, key=key).first()
                if existing is None:  # expired between the two statements
                    return view_method(self, request, *args, **kwargs)
                if existing.request_hash != digest:
                    return Response(
                        {"detail": "This Idempotency-Key was already used for a different request."},
                        status=422,
                    )
                if existing.status_code is None:
                    return Response(
                        {"detail": "A request with this Idempotency-Key is still being processed."},
                        status=409,
                    )
                replay = Response(existing.response_body, status=existing.status_code)
                replay["Idempotent-Replayed"] = "true"
                return replay

            try:
                response = view_method(self, request, *args, **kwargs)
            except BaseException:
                record.delete()
                raise
            if 200 <= response.status_code < 300:
                try:
                    body = json.loads(JSONRenderer().render(getattr(response, "data", None)) or b"null")
                    record.status_code, record.response_body = response.status_code, body
                    record.save(update_fields=("status_code", "response_body"))
                except Exception:  # noqa: BLE001 - never fail a successful request over bookkeeping
                    record.delete()
            else:
                record.delete()
            return response

        return wrapper

    return decorator
