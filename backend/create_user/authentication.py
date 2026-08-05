import logging

from django.core.cache import cache
from dj_rest_auth.jwt_auth import JWTCookieAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from create_user.models import CustomUser

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
            try:
                user = super().get_user(validated_token)
            except AuthenticationFailed as e:
                # "User not found" specifically means the token's user_id has
                # no matching row anymore (deleted account, or a stale cookie
                # left over from a wiped/reset DB) -- not that the caller
                # supplied bad credentials for a real account. Raising here
                # would 401 the request before permission_classes is ever
                # consulted, breaking every AllowAny/public endpoint (e.g.
                # the AI-interview candidate join link) for anyone whose
                # browser happens to carry such a cookie. Treat it as no
                # credentials instead, same as not sending the cookie at
                # all -- protected endpoints still correctly reject the
                # resulting anonymous user via IsAuthenticated. Other
                # failures (inactive/password-changed) still raise, since
                # those describe a real account the caller should know about.
                detail = getattr(e, "detail", None)
                code = detail.get("code") if isinstance(detail, dict) else None
                if code == "user_not_found":
                    return None
                raise
            try:
                cache.set(cache_key, user, 60)
            except Exception:
                pass

        # Staff deactivation must take effect on the very next request, not
        # wait out this cache's TTL. Deactivating a staff member busts this
        # same `jwt_user:{id}` key (see staff/views.py), so the check below
        # always sees a freshly-loaded `is_active` once that happens.
        if user and user.user_type == CustomUser.USER_TYPE.STAFF and not user.is_active:
            raise AuthenticationFailed("This account has been deactivated.")

        return user
