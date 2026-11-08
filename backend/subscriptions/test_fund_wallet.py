from decimal import Decimal
from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from create_user.models import Company, CustomUser
from subscriptions.models import Wallet, WalletTopup


@override_settings(FRONTEND_URL="https://tiaago.vercel.app")
class FundWalletCheckoutTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_company_user(
            username="checkout-test", email="checkout@example.com", verified=True,
        )
        self.company = Company.objects.create(company_rep=self.user, company_name="Checkout Test")
        self.wallet = Wallet.objects.create(company=self.company, currency="USD")
        self.client.force_authenticate(self.user)

    @patch("subscriptions.views.get_active_gateway", return_value="bachs")
    @patch("subscriptions.views.BachsHandler")
    def test_selected_amount_reaches_checkout_and_creates_pending_topup(self, handler_class, gateway):
        handler = handler_class.return_value
        handler.create_checkout_session.return_value = {
            "checkoutUrl": "https://checkout.example/test", "checkoutId": "chk_test",
        }
        response = self.client.post("/api/subscriptions/fund-wallet/", {
            "amount": 50,
            # Bachs builds its own URLs. A stale Stripe-only URL must not
            # reject a valid Bachs checkout.
            "success_url": "https://tiaago.com/recruiter/dashboard/billing",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        call = handler.create_checkout_session.call_args.kwargs
        self.assertEqual(call["amount"], Decimal("50"))
        self.assertEqual(call["currency"], "USD")
        self.assertTrue(call["return_url"].startswith("https://tiaago.vercel.app/"))
        topup = WalletTopup.objects.get(provider_payment_id="chk_test")
        self.assertEqual(topup.amount, Decimal("50.00"))
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, 0)  # creating checkout never credits money

    @patch("subscriptions.views.BachsHandler")
    def test_missing_amount_never_calls_payment_provider(self, handler):
        response = self.client.post("/api/subscriptions/fund-wallet/", {}, format="json")
        self.assertEqual(response.status_code, 400)
        handler.assert_not_called()

    @patch("subscriptions.views.get_active_gateway", return_value="stripe")
    @patch("subscriptions.views.BachsHandler")
    def test_stripe_still_rejects_untrusted_success_urls(self, handler, gateway):
        response = self.client.post("/api/subscriptions/fund-wallet/", {
            "amount": 50, "success_url": "https://untrusted.example/",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid success_url.")
        handler.assert_not_called()
