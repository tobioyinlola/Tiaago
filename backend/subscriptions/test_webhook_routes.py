import hashlib
import hmac
import json

from django.test import override_settings
from rest_framework.test import APITestCase

from subscriptions.models import WalletTransaction


@override_settings(BACHS_WEBHOOK_SECRET="qa-webhook-secret")
class BachsWebhookRouteTests(APITestCase):
    paths = (
        "/webhook",
        "/webhook/",
        "/api/subscriptions/bachs-wallet-fund-webhook/",
    )

    def test_unsigned_requests_are_rejected_at_every_route(self):
        before = WalletTransaction.objects.count()
        for path in self.paths:
            with self.subTest(path=path):
                response = self.client.post(path, b'{}', content_type="application/json")
                self.assertEqual(response.status_code, 401)
                self.assertNotIn("Location", response)
        self.assertEqual(WalletTransaction.objects.count(), before)

    def test_signed_unhandled_events_are_acknowledged_without_wallet_writes(self):
        payload = json.dumps({"event": "qa.unhandled", "data": {}}, separators=(",", ":")).encode()
        signature = hmac.new(b"qa-webhook-secret", payload, hashlib.sha256).hexdigest()
        before = WalletTransaction.objects.count()
        for path in self.paths:
            with self.subTest(path=path):
                response = self.client.post(
                    path, payload, content_type="application/json",
                    HTTP_X_BACHS_SIGNATURE=signature,
                )
                self.assertEqual(response.status_code, 200, response.content)
                self.assertNotIn("Location", response)
        self.assertEqual(WalletTransaction.objects.count(), before)
