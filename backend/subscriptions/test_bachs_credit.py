import hashlib
import hmac
import json
import time
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from unittest.mock import patch

from django.db import close_old_connections
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient, APITestCase

from create_user.models import Company, CustomUser
from subscriptions.models import Wallet, WalletTopup, WalletTransaction


class BachsPaymentFixtures:
    def setUp(self):
        super().setUp()
        self.user = CustomUser.objects.create_company_user(
            username="paid-wallet", email="paid-wallet@example.com", verified=True,
        )
        self.company = Company.objects.create(company_rep=self.user, company_name="Paid Wallet")
        self.wallet = Wallet.objects.create(company=self.company, currency="USD", balance=Decimal("12"))
        self.topup = self.make_topup("chk_wallet_1")
        notification_patch = patch("subscriptions.views._after_bachs_wallet_credit")
        self.notify = notification_patch.start()
        self.addCleanup(notification_patch.stop)

    def make_topup(self, checkout_id):
        return WalletTopup.objects.create(
            wallet=self.wallet, organisation=self.company, amount=Decimal("50"), currency="USD",
            payment_provider="bachs", provider_payment_id=checkout_id,
        )

    def event(self, topup=None, **changes):
        topup = topup or self.topup
        data = {
            "charge_id": "ch_" + topup.provider_payment_id,
            "checkout_id": topup.provider_payment_id,
            "status": "SUCCEEDED", "amount": "50.00", "currency": "USD",
            "settlement_amount": "48.00", "processing_fee": "2.00",
            "metadata": {"topup_id": str(topup.id)},
        }
        data.update(changes)
        return {"id": "evt_" + topup.provider_payment_id, "type": "collection.succeeded", "data": data}

    def send(self, event, client=None):
        body = json.dumps(event).encode()
        timestamp = str(int(time.time()))
        signature = hmac.new(b"test-signing-key", timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()
        return (client or self.client).post(
            "/webhook", body, content_type="application/json", HTTP_X_BACHS_SIGNATURE=signature, HTTP_X_BACHS_TIMESTAMP=timestamp,
        )


@override_settings(BACHS_WEBHOOK_SECRET="test-signing-key")
class BachsWalletCreditTests(BachsPaymentFixtures, APITestCase):
    def test_success_credits_full_amount_and_completes_topup(self):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.send(self.event())
        self.assertEqual(response.status_code, 200)
        self.wallet.refresh_from_db()
        self.topup.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("62"))
        self.assertEqual(self.wallet.total_funded_lifetime, Decimal("50"))
        self.assertEqual(self.topup.status, "completed")
        txn = WalletTransaction.objects.get(wallet=self.wallet)
        self.assertEqual(txn.reference, "ch_chk_wallet_1")
        self.assertEqual(txn.amount, Decimal("50"))  # no deduction of gateway fees
        self.notify.assert_called_once()

    def test_retries_never_credit_twice(self):
        event = self.event()
        self.assertEqual(self.send(event).status_code, 200)
        event["id"] = "evt_another_delivery_of_same_charge"
        self.assertEqual(self.send(event).status_code, 200)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("62"))
        self.assertEqual(WalletTransaction.objects.filter(wallet=self.wallet).count(), 1)

    def test_second_payment_to_same_wallet_is_also_credited(self):
        self.send(self.event())
        second = self.make_topup("chk_wallet_2")
        self.assertEqual(self.send(self.event(second)).status_code, 200)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("112"))
        self.assertEqual(WalletTransaction.objects.filter(wallet=self.wallet).count(), 2)

    def test_legacy_events_without_charge_id_have_distinct_references(self):
        self.send(self.event(charge_id=None))
        second = self.make_topup("chk_wallet_legacy_2")
        self.send(self.event(second, charge_id=None))
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("112"))
        self.assertFalse(WalletTransaction.objects.filter(wallet=self.wallet, reference__isnull=True).exists())

    def test_mismatched_amount_or_currency_never_credits(self):
        for changes in [{"amount": "500"}, {"amount": "-50"}, {"amount": "NaN"}, {"currency": "NGN"}]:
            with self.subTest(changes=changes):
                self.assertEqual(self.send(self.event(**changes)).status_code, 400)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("12"))
        self.assertFalse(WalletTransaction.objects.filter(wallet=self.wallet).exists())

    def test_credit_and_topup_completion_roll_back_together_then_retry(self):
        original_save = WalletTopup.save
        def fail_completion(instance, *args, **kwargs):
            if instance.status == "completed":
                raise RuntimeError("simulated database write failure")
            return original_save(instance, *args, **kwargs)
        with patch.object(WalletTopup, "save", fail_completion):
            self.assertEqual(self.send(self.event()).status_code, 500)
        self.wallet.refresh_from_db()
        self.topup.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("12"))
        self.assertEqual(self.topup.status, "pending")
        self.assertFalse(WalletTransaction.objects.filter(wallet=self.wallet).exists())
        self.assertEqual(self.send(self.event()).status_code, 200)
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("62"))

    def test_notification_failure_does_not_undo_payment_or_force_retry(self):
        self.notify.side_effect = RuntimeError("notification queue unavailable")
        with self.captureOnCommitCallbacks(execute=True):
            response = self.send(self.event())
        self.assertEqual(response.status_code, 200)
        self.wallet.refresh_from_db()
        self.topup.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("62"))
        self.assertEqual(self.topup.status, "completed")

    def test_failed_attempt_leaves_checkout_pending_for_successful_retry(self):
        event = self.event()
        event["type"] = "collection.failed"
        self.assertEqual(self.send(event).status_code, 200)
        self.topup.refresh_from_db()
        self.assertEqual(self.topup.status, "pending")
        self.assertEqual(self.send(self.event()).status_code, 200)
        self.topup.refresh_from_db()
        self.wallet.refresh_from_db()
        self.assertEqual(self.topup.status, "completed")
        self.assertEqual(self.wallet.balance, Decimal("62"))

    def test_late_failure_cannot_undo_confirmed_credit(self):
        self.send(self.event())
        event = self.event()
        event["type"] = "collection.failed"
        self.send(event)
        self.topup.refresh_from_db()
        self.assertEqual(self.topup.status, "completed")

    def test_redirect_and_checkout_completed_never_credit_wallet(self):
        event = self.event()
        event["type"] = "checkout.completed"
        self.assertEqual(self.send(event).status_code, 200)
        self.client.force_authenticate(self.user)
        response = self.client.get(f"/api/subscriptions/topup/{self.topup.id}/status/?success=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "pending")
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("12"))


@override_settings(BACHS_WEBHOOK_SECRET="test-signing-key")
class BachsConcurrentCreditTests(BachsPaymentFixtures, TransactionTestCase):
    def test_simultaneous_duplicate_deliveries_credit_once(self):
        event = self.event()
        def deliver(_):
            close_old_connections()
            try:
                return self.send(event, APIClient()).status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(deliver, range(2)))
        self.assertEqual(statuses, [200, 200])
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal("62"))
        self.assertEqual(WalletTransaction.objects.filter(wallet=self.wallet).count(), 1)
