# asgi.py
import os
import django
import logging
from django.core.asgi import get_asgi_application


logger = logging.getLogger(__name__)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "talentsync_backend.settings")
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from .auth_middleware import JWTAuthMiddleware
import chats.routing
import skill_assessment.routing

def debug_router(router):
    async def inner(scope, receive, send):
        path = scope.get("path", "")
        logger.info(f"🔍 WebSocket routing attempt for path={path}")
        try:
            return await router(scope, receive, send)
        except Exception as e:
            logger.error(f"❌ Routing failed for path={path}: {e}")
            raise
    return inner


websocket_router = debug_router(
    URLRouter([
        *chats.routing.websocket_urlpatterns,
        *skill_assessment.routing.websocket_urlpatterns,
    ])
)

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        AuthMiddlewareStack(
            websocket_router
        )
    ),
})
