from django.conf import settings
from rest_framework.permissions import BasePermission


class HasInternalServiceKey(BasePermission):
    """Gates the endpoints only the standalone interview_agent/ LiveKit
    process calls (agent-data, segment, status, complete) -- authenticated
    with a shared secret in the X-Internal-Key header rather than a user
    session, since the agent is a server-to-server caller with no logged-in
    user. Mirrors the X-Service-Key header Django itself sends to the ai/
    FastAPI service (backend/utils/ai_service.py), just in the other
    direction."""

    def has_permission(self, request, view):
        expected = getattr(settings, "INTERNAL_API_KEY", "")
        if not expected:
            return False
        return request.headers.get("X-Internal-Key") == expected
