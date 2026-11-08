from unittest.mock import Mock

from django.test import SimpleTestCase, override_settings

from utils.bachs_handler import BachsHandler


@override_settings(
    BACHS_ENVIRONMENT="sandbox",
    BACHS_API_KEY_SANDBOX="test-only",
    BACHS_BASE_URL_SANDBOX="https://sandbox-api.bachs.io",
    BACHS_TOPUP_PRODUCT_ID_NGN="",
    BACHS_TOPUP_PRODUCT_ID_USD="",
)
class BachsCustomAmountTests(SimpleTestCase):
    def test_custom_amount_checkout_needs_no_catalog_product(self):
        for currency, amount, expected in [("NGN", "12345.67", "12345.67"), ("USD", "27.5", "27.50")]:
            with self.subTest(currency=currency):
                handler = BachsHandler()
                handler.requests.post = Mock(return_value=Mock(
                    status_code=201,
                    json=Mock(return_value={"checkout_id": "chk_test", "checkout_url": "https://checkout.example/test"}),
                ))
                result = handler.create_checkout_session(
                    "topup-test", amount, currency, "qa@example.com", "QA",
                    "https://example.com/success", "https://example.com/cancel", 1, 2,
                )
                payload = handler.requests.post.call_args.kwargs["json"]
                self.assertEqual(payload["pricing"], {"currency": currency, "amount": expected})
                self.assertNotIn("product_cart", payload)
                self.assertEqual(payload["success_url"], "https://example.com/success")
                self.assertEqual(payload["metadata"]["topup_id"], "topup-test")
                self.assertEqual(result["checkoutId"], "chk_test")
