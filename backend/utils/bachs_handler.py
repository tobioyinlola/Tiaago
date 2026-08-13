"""Bachs payment gateway handler -- the default wallet top-up provider
(see subscriptions.helper.get_active_gateway for the admin-editable switch
that decides whether Bachs, Paystack, or Stripe actually processes a given
top-up). Mirrors utils/paystack_sub_handler.py's structure -- an
APIHandler subclass wrapping a logged requests.Session -- since Bachs, like
Paystack, is a hosted-checkout redirect flow rather than an embedded SDK
like Stripe's.

Key Bachs API rules this module encodes:
- Money sent TO Bachs is always a decimal string at currency precision,
  never minor units -- NGN 5000 -> "5000.00", USD 25 -> "25.00". See
  format_amount_for_bachs().
- Money received FROM Bachs (webhook payloads) must be converted back to
  minor units for our DB -- see bachs_amount_to_minor_units().
- Webhooks are the only source of truth for crediting a wallet -- this
  module never credits anything itself; it only creates/reads checkout
  sessions and verifies webhook signatures. See
  subscriptions.views.bachs_wallet_fund_webhook for the actual crediting.
- Every POST to the Bachs API needs an Idempotency-Key header, format
  "<topup_id>-<timestamp>".

WEBHOOK SIGNATURE ALGORITHM: confirmed against the Bachs dashboard --
HMAC-SHA256 over the raw body, hex-digest, sent in the `X-Bachs-Signature`
header (read case-insensitively via request.headers in the webhook view).
"""

import hashlib
import hmac
import logging
import time
from decimal import Decimal

from django.conf import settings

from .logged_requests import APIHandler

logger = logging.getLogger("bachs")


def _active_environment() -> str:
    return (settings.BACHS_ENVIRONMENT or "sandbox").lower()


def is_live() -> bool:
    return _active_environment() == "live"


def base_url() -> str:
    return settings.BACHS_BASE_URL_LIVE if is_live() else settings.BACHS_BASE_URL_SANDBOX


def active_api_key() -> str:
    return settings.BACHS_API_KEY_LIVE if is_live() else settings.BACHS_API_KEY_SANDBOX


def base_headers() -> dict:
    return {
        "Authorization": f"Bearer {active_api_key()}",
        "Content-Type": "application/json",
    }


def format_amount_for_bachs(amount) -> str:
    """Bachs money is ALWAYS a decimal string at currency precision, never
    minor units -- NGN 5000 -> "5000.00", USD 25 -> "25.00". `amount` here
    is already in the currency's major unit (the recruiter's raw input),
    same as amount_decimal everywhere else in FundWalletView -- do NOT
    divide/multiply by 100 before calling this."""
    return str(Decimal(str(amount)).quantize(Decimal("0.01")))


def bachs_amount_to_minor_units(amount_string) -> int:
    """Converts a Bachs decimal-string amount back to minor units for our
    DB -- "10000.00" -> 1000000 (kobo), "25.00" -> 2500 (cents). Only ever
    called on amounts read back FROM a Bachs webhook/API response, never on
    values we're about to send TO Bachs."""
    return int(round(Decimal(str(amount_string)) * 100))


def _idempotency_key(topup_id) -> str:
    return f"{topup_id}-{int(time.time())}"


class BachsHandler(APIHandler):
    def create_checkout_session(
        self, topup_id, amount, currency, customer_email, customer_name,
        return_url, cancel_url, organisation_id, wallet_id,
    ):
        """Creates a Bachs-hosted checkout session for a wallet top-up.
        Returns {"checkoutUrl": ..., "checkoutId": ...} on success, None on
        failure -- mirrors PayStackSubscriptionHandler.fund_wallet's
        return-a-dict-or-None convention so FundWalletView's `if result:`
        check works identically across providers."""
        product_id = (
            settings.BACHS_TOPUP_PRODUCT_ID_NGN if currency == "NGN" else settings.BACHS_TOPUP_PRODUCT_ID_USD
        )
        url = f"{base_url()}/v1/checkout-sessions"
        headers = {**base_headers(), "Idempotency-Key": _idempotency_key(topup_id)}
        data = {
            "product_cart": [
                {"product_id": product_id, "quantity": 1, "unit_price": format_amount_for_bachs(amount)},
            ],
            "customer": {"email": customer_email, "name": customer_name},
            "return_url": return_url,
            "cancel_url": cancel_url,
            "metadata": {
                "topup_id": str(topup_id),
                "organisation_id": str(organisation_id),
                "wallet_id": str(wallet_id),
                "currency": currency,
            },
        }
        try:
            response = self.requests.post(url, json=data, headers=headers)
            result = response.json()
            logger.debug(f"Bachs Create Checkout Session Response: {result}")

            if response.status_code in (200, 201) and result.get("checkout_id"):
                checkout_id = result["checkout_id"]
                checkout_url = result.get("checkout_url") or result.get("url")
                logger.info(f"Bachs checkout session created successfully: {checkout_id}")
                return {"checkoutUrl": checkout_url, "checkoutId": checkout_id}

            error_message = result.get("message") or result.get("error") or "Bachs did not return a valid response."
            logger.error(f"Failed to create Bachs checkout session: {error_message}")
            return None
        except Exception as e:
            logger.error(f"Request error creating Bachs checkout session: {e}")
            return None

    def retrieve_checkout_session(self, checkout_id):
        """GET the current state of a checkout session -- fallback lookup
        used by the Bachs callback page while it polls a still-PENDING
        top-up, in case the webhook is delayed."""
        url = f"{base_url()}/v1/checkout-sessions/{checkout_id}"
        try:
            response = self.requests.get(url, headers=base_headers())
            result = response.json()
            if response.status_code == 200:
                return result
            logger.error(f"Failed to retrieve Bachs checkout session {checkout_id}: {result}")
            return None
        except Exception as e:
            logger.error(f"Request error retrieving Bachs checkout session {checkout_id}: {e}")
            return None

    def create_or_get_customer(self, organisation, email, name):
        """Returns organisation.bachs_customer_id if already saved, else
        creates a new Bachs customer and persists the id on the Company
        record (mirrors CustomUser.stripe_customer_id/paystack_customer_id's
        lazy-create-on-first-use pattern)."""
        if organisation.bachs_customer_id:
            return organisation.bachs_customer_id

        url = f"{base_url()}/v1/customers"
        headers = {**base_headers(), "Idempotency-Key": _idempotency_key(f"cust-{organisation.id}")}
        try:
            response = self.requests.post(url, json={"email": email, "name": name}, headers=headers)
            result = response.json()
            if response.status_code in (200, 201) and result.get("customer_id"):
                customer_id = result["customer_id"]
                organisation.bachs_customer_id = customer_id
                organisation.save(update_fields=["bachs_customer_id"])
                logger.info(f"Bachs customer created for organisation {organisation.id}: {customer_id}")
                return customer_id
            logger.error(f"Failed to create Bachs customer: {result}")
            return None
        except Exception as e:
            logger.error(f"Request error creating Bachs customer: {e}")
            return None


def verify_webhook_signature(raw_body: bytes, signature_header: str) -> bool:
    """Verifies a Bachs webhook's signature using BACHS_WEBHOOK_SECRET, with
    a constant-time comparison (same reasoning as the Paystack webhook's
    hmac.compare_digest usage -- see subscriptions.views). See this
    module's docstring for the confirmed algorithm/header."""
    if not signature_header:
        return False
    secret = settings.BACHS_WEBHOOK_SECRET
    if not secret:
        logger.error("BACHS_WEBHOOK_SECRET is not configured -- refusing to verify webhook.")
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)
