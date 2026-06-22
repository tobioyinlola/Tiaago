import logging

from django.core.cache import cache
from dj_rest_auth.jwt_auth import JWTCookieAuthentication

logger = logging.getLogger("auth_middleware")


class CachedJWTCookieAuthentication(JWTCookieAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        cache_key = f"jwt_user:{user_id}"
        try:
            user = cache.get(cache_key)
        except Exception:
            user = None
        if user is None:
            user = super().get_user(validated_token)
            try:
                cache.set(cache_key, user, 60)
            except Exception:
                pass
        return user
