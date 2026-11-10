"""Email verification: a correct code verifies and signs in on the first try."""
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils.timezone import now

from create_user.models import CustomUser, OneTimePassword


class ConfirmEmailTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_talent_user(
            username="verify-me", email="verify-me@example.com", password="x"
        )
        self.otp = OneTimePassword.objects.create(
            user=self.user, code="123456", otp_expires=now() + timedelta(minutes=10)
        )
        self.url = reverse("account_confirm_email")

    def _post(self, code, email="verify-me@example.com"):
        with patch("create_user.views.send_after_commit"):
            return self.client.post(self.url, {"email": email, "otp": code}, content_type="application/json")

    def test_correct_code_verifies_and_returns_tokens_first_time(self):
        response = self._post("123456")
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertTrue(body["access"] and body["refresh"] and body["access_expiration"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)
        self.otp.refresh_from_db()
        self.assertIsNotNone(self.otp.used_at)  # kept briefly so a retry can be recognised

    def test_a_wrong_code_is_counted_but_the_right_one_still_works(self):
        wrong = self._post("000000")
        self.assertEqual(wrong.status_code, 400)
        self.otp.refresh_from_db()
        self.assertEqual(self.otp.attempts, 1)
        self.assertEqual(self._post("123456").status_code, 200)

    def test_a_retry_after_a_lost_response_signs_in_without_repeating_side_effects(self):
        with patch("create_user.views.send_after_commit") as welcome:
            first = self.client.post(self.url, {"email": "verify-me@example.com", "otp": "123456"}, content_type="application/json")
            # The browser never heard the answer and submits the same code again.
            again = self.client.post(self.url, {"email": "verify-me@example.com", "otp": "123456"}, content_type="application/json")
        self.assertEqual((first.status_code, again.status_code), (200, 200), again.content)
        self.assertTrue(again.json()["access"])
        welcome.assert_called_once()  # one welcome email, not two

    def test_the_replay_window_closes_and_wrong_codes_never_replay(self):
        self.assertEqual(self._post("123456").status_code, 200)
        self.assertEqual(self._post("000000").status_code, 400)  # wrong code, even right after success

        OneTimePassword.objects.filter(user=self.user).update(
            used_at=now() - timedelta(seconds=OneTimePassword.REPLAY_GRACE_SECONDS + 5)
        )
        self.assertEqual(self._post("123456").status_code, 400)  # the grace period is over

    def test_requesting_a_new_code_clears_a_used_one(self):
        from create_user.utils import generate_otp

        self.assertEqual(self._post("123456").status_code, 200)
        new_code = generate_otp(self.user)
        self.otp.refresh_from_db()
        self.assertIsNone(self.otp.used_at)
        self.assertEqual(self._post(new_code).status_code, 200)
