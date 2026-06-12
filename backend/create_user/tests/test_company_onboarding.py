from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from create_user.models import Company, OneTimePassword
from roles.models import Role

User = get_user_model()

PASSWORD = "Str0ng!pass123"


def register_company(client, email="jane@acme.com", **extra):
    payload = {
        "full_name": "Jane Doe",
        "email": email,
        "country": "Nigeria",
        "password1": PASSWORD,
        "password2": PASSWORD,
        **extra,
    }
    return client.post(reverse("rest_register") + "?user_type=company", payload)


class MinimalCompanyRegistrationTests(APITestCase):
    def test_minimal_registration_succeeds_without_role_size_website(self):
        response = register_company(self.client)
        self.assertEqual(response.status_code, 201, response.content)

        user = User.objects.get(email="jane@acme.com")
        company = Company.objects.get(company_rep=user)
        self.assertIsNone(company.role)
        self.assertIsNone(company.website)
        self.assertIsNone(company.size)
        self.assertIsNone(company.onboarding_completed_at)

    def test_full_registration_still_accepts_role_size_website(self):
        role = Role.objects.create(title="Hiring Manager", is_startup_role=True)
        response = register_company(
            self.client,
            email="full@acme.com",
            role=role.slug,
            size=Company.SIZE_CHOICES.SIZE50,
            website="https://acme.com",
        )
        self.assertEqual(response.status_code, 201, response.content)

        company = Company.objects.get(company_rep__email="full@acme.com")
        self.assertEqual(company.role, role)
        self.assertEqual(company.size, Company.SIZE_CHOICES.SIZE50)
        self.assertEqual(company.website, "https://acme.com")

    def test_duplicate_website_still_rejected(self):
        register_company(self.client, email="one@acme.com", website="https://acme.com")
        response = register_company(
            self.client, email="two@acme.com", website="https://acme.com"
        )
        self.assertEqual(response.status_code, 400)


class ConfirmEmailTokenTests(APITestCase):
    def _set_otp(self, user, code="432109"):
        OneTimePassword.objects.update_or_create(
            user=user,
            defaults={
                "code": code,
                "otp_expires": timezone.now() + timedelta(minutes=10),
                "attempts": 0,
            },
        )

    def test_otp_confirmation_returns_login_tokens(self):
        register_company(self.client)
        user = User.objects.get(email="jane@acme.com")
        self._set_otp(user)

        response = self.client.post(
            reverse("account_confirm_email"),
            {"email": "jane@acme.com", "otp": "432109"},
        )
        self.assertEqual(response.status_code, 200, response.content)
        for key in ("access", "refresh", "access_expiration", "refresh_expiration"):
            self.assertIn(key, response.data)
            self.assertTrue(response.data[key])
        self.assertEqual(response.data["user_type"], user.user_type)

        user.refresh_from_db()
        self.assertTrue(user.verified)

        # the returned access token must authenticate API requests
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )
        onboarding = self.client.get(reverse("company_onboarding"))
        self.assertEqual(onboarding.status_code, 200, onboarding.content)

    def test_invalid_otp_returns_400_without_tokens(self):
        register_company(self.client)
        response = self.client.post(
            reverse("account_confirm_email"),
            {"email": "jane@acme.com", "otp": "000000"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access", response.data)

    def test_otp_invalidated_after_max_wrong_attempts(self):
        register_company(self.client)
        user = User.objects.get(email="jane@acme.com")
        self._set_otp(user)

        for _ in range(OneTimePassword.MAX_ATTEMPTS):
            response = self.client.post(
                reverse("account_confirm_email"),
                {"email": "jane@acme.com", "otp": "000000"},
            )
            self.assertEqual(response.status_code, 400)

        # the OTP is burned: even the correct code no longer works
        self.assertFalse(OneTimePassword.objects.filter(user=user).exists())
        response = self.client.post(
            reverse("account_confirm_email"),
            {"email": "jane@acme.com", "otp": "432109"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access", response.data)

    def test_wrong_attempts_below_limit_keep_otp_usable(self):
        register_company(self.client)
        user = User.objects.get(email="jane@acme.com")
        self._set_otp(user)

        for _ in range(OneTimePassword.MAX_ATTEMPTS - 1):
            self.client.post(
                reverse("account_confirm_email"),
                {"email": "jane@acme.com", "otp": "000000"},
            )

        response = self.client.post(
            reverse("account_confirm_email"),
            {"email": "jane@acme.com", "otp": "432109"},
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn("access", response.data)


class CompanyOnboardingAPITests(APITestCase):
    def setUp(self):
        register_company(self.client)
        self.user = User.objects.get(email="jane@acme.com")
        self.company = Company.objects.get(company_rep=self.user)
        self.client.force_authenticate(self.user)
        self.url = reverse("company_onboarding")

    def test_get_returns_incomplete_status_for_new_company(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.data["has_completed_onboarding"])
        self.assertIsNone(response.data["onboarding_completed_at"])

    def test_patch_saves_each_card_partially(self):
        # card 1: account type
        response = self.client.patch(self.url, {"account_type": "agency"})
        self.assertEqual(response.status_code, 200, response.content)

        # card 2: organization
        response = self.client.patch(
            self.url,
            {
                "company_name": "Acme Inc.",
                "website": "https://acme.com",
                "industry": "Technology",
                "size": Company.SIZE_CHOICES.SIZE200,
            },
        )
        self.assertEqual(response.status_code, 200, response.content)

        # card 3: about you
        role = Role.objects.create(title="Talent Lead", is_startup_role=True)
        response = self.client.patch(
            self.url, {"role": role.slug, "phone_number": "+2348012345678"}
        )
        self.assertEqual(response.status_code, 200, response.content)

        self.company.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.company.account_type, "agency")
        self.assertEqual(self.company.company_name, "Acme Inc.")
        self.assertEqual(self.company.website, "https://acme.com")
        self.assertEqual(self.company.industry, "Technology")
        self.assertEqual(self.company.size, Company.SIZE_CHOICES.SIZE200)
        self.assertEqual(self.company.role, role)
        self.assertEqual(str(self.user.phone_number), "+2348012345678")
        # still not complete until the final card is submitted
        self.assertIsNone(self.company.onboarding_completed_at)

    def test_final_card_with_complete_flag_finishes_onboarding(self):
        response = self.client.patch(
            self.url,
            {
                "heard_from": "LinkedIn",
                "onboarding_notes": "Hiring two engineers this quarter",
                "complete": True,
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data["has_completed_onboarding"])

        self.company.refresh_from_db()
        self.assertEqual(self.company.heard_from, "LinkedIn")
        self.assertIsNotNone(self.company.onboarding_completed_at)

    def test_skip_defers_onboarding_without_completing(self):
        response = self.client.patch(self.url, {"skip": True})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data["has_skipped_onboarding"])
        self.assertFalse(response.data["has_completed_onboarding"])

        self.company.refresh_from_db()
        self.assertIsNotNone(self.company.onboarding_skipped_at)
        self.assertIsNone(self.company.onboarding_completed_at)

    def test_skipped_user_can_resume_and_complete(self):
        self.client.patch(self.url, {"skip": True})
        response = self.client.patch(
            self.url, {"heard_from": "Podcast", "complete": True}
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data["has_completed_onboarding"])

        self.company.refresh_from_db()
        self.assertEqual(self.company.heard_from, "Podcast")
        self.assertIsNotNone(self.company.onboarding_completed_at)

    def test_complete_timestamp_is_not_overwritten(self):
        self.client.patch(self.url, {"complete": True})
        self.company.refresh_from_db()
        first_completed_at = self.company.onboarding_completed_at

        self.client.patch(self.url, {"complete": True})
        self.company.refresh_from_db()
        self.assertEqual(self.company.onboarding_completed_at, first_completed_at)

    def test_invalid_account_type_rejected(self):
        response = self.client.patch(self.url, {"account_type": "not-a-choice"})
        self.assertEqual(response.status_code, 400)

    def test_user_without_company_gets_404(self):
        talent = User.objects.create_talent_user(
            username="talent1", email="talent@x.com", password=PASSWORD
        )
        self.client.force_authenticate(talent)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)

    def test_anonymous_user_rejected(self):
        self.client.force_authenticate(None)
        response = self.client.get(self.url)
        self.assertIn(response.status_code, (401, 403))
