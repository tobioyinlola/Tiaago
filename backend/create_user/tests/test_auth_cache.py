from django.core.cache import cache
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from create_user.authentication import CachedJWTCookieAuthentication
from create_user.models import CustomUser


class AuthenticatedProfileCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = CustomUser.objects.create_user(
            email="cache-test@example.com", username="cache-test", password="test-only",
            user_type="T", first_name="Before",
        )
        self.token = RefreshToken.for_user(self.user).access_token
        self.auth = CachedJWTCookieAuthentication()

    def tearDown(self):
        cache.clear()

    def test_next_authentication_sees_committed_profile_changes(self):
        self.assertEqual(self.auth.get_user(self.token).first_name, "Before")
        with self.captureOnCommitCallbacks(execute=True):
            self.user.first_name = "After"
            self.user.save(update_fields=["first_name"])
        self.assertEqual(self.auth.get_user(self.token).first_name, "After")

    def test_rollback_does_not_publish_uncommitted_profile(self):
        self.auth.get_user(self.token)
        from django.db import transaction
        try:
            with transaction.atomic():
                self.user.first_name = "Uncommitted"
                self.user.save(update_fields=["first_name"])
                raise ValueError("rollback")
        except ValueError:
            pass
        self.assertEqual(self.auth.get_user(self.token).first_name, "Before")
