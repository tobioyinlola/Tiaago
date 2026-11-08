import hashlib
import hmac
import time

from django.test import SimpleTestCase, override_settings

from utils.bachs_handler import verify_webhook_signature


@override_settings(BACHS_WEBHOOK_SECRET="signature-test-key")
class BachsSignatureTests(SimpleTestCase):
    def setUp(self):
        self.body = b'{"type":"collection.succeeded","data":{"amount":"50.00"}}'
        self.timestamp = str(int(time.time()))
        self.signature = hmac.new(
            b"signature-test-key", self.timestamp.encode() + b"." + self.body, hashlib.sha256,
        ).hexdigest()

    def test_timestamped_signature_matches(self):
        self.assertTrue(verify_webhook_signature(self.body, self.signature, self.timestamp))

    def test_v2_accepts_rotated_signature_in_any_position(self):
        self.assertTrue(verify_webhook_signature(
            self.body, "", signature_v2_header=f"t={self.timestamp},v1=wrong,v1={self.signature}",
        ))

    def test_missing_or_stale_timestamp_and_tampered_body_are_rejected(self):
        self.assertFalse(verify_webhook_signature(self.body, self.signature))
        self.assertFalse(verify_webhook_signature(self.body, self.signature, str(int(self.timestamp) - 1000)))
        self.assertFalse(verify_webhook_signature(self.body + b" ", self.signature, self.timestamp))

    def test_malformed_v2_cannot_fall_back_to_other_header(self):
        self.assertFalse(verify_webhook_signature(
            self.body, self.signature, self.timestamp, signature_v2_header="t=invalid,v1=bad",
        ))
