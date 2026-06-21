from django.core.cache import cache
from dj_rest_auth.jwt_auth import JWTCookieAuthentication


class CachedJWTCookieAuthentication(JWTCookieAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        cache_key = f"jwt_user:{user_id}"
        user = cache.get(cache_key)
        if user is None:
            user = super().get_user(validated_token)
            cache.set(cache_key, user, 60)
        return user
