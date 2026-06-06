import logging
import time
import uuid
import requests
from django.conf import settings
from payments.models import Bank
from utils.logged_requests import APIHandler

logger = logging.getLogger("paystack")

base_url = "https://api.paystack.co"
base_headers = {
    "Authorization": f"Bearer {settings.PAYSTACK_PRIVATE_KEY}",
    "Content-Type": "application/json",
}


class PayStackHandler(APIHandler):

    def generate_transaction_reference(self, prefix=None):
        timestamp = str(int(time.time()))
        unique_id = str(uuid.uuid4().hex)[:8]
        return (
            f"{prefix}-{timestamp}-{unique_id}"
            if prefix
            else f"{timestamp}-{unique_id}"
        )

    def initialize_payment(
        self, email: str, amount: str, callback_url: str, reference_tag=None
    ):
        url = f"{base_url}/transaction/initialize"
        headers = base_headers

        data = {
            "email": email,
            "amount": str(int(amount) * 100),  # Convert to kobo
            "reference": self.generate_transaction_reference(reference_tag),
            "callback_url": callback_url,
            "channel": ["card", "bank_transfer"],
        }

        try:
            # Send request to Paystack API
            response = self.requests.post(url, json=data, headers=headers)
            # Check if the response is valid and status is True
            if response.status_code != 200 or not response.json().get("status"):
                # Log the error if response is invalid or status is missing
                logger.error(f"Error initializing payment: {response.json()}")
                return None

            # Return the successful response data
            results = response.json()
            logger.debug(f"Paystack Initialization Response: {results}")
            return results

        except requests.exceptions.RequestException as e:
            # Catch and log any connection errors or issues with the request
            logger.error(f"Request error: {e}")
            return None

    def verify_transaction(self, reference):
        url = f"{base_url}/transaction/verify/{reference}"
        headers = base_headers
        response = self.requests.get(url=url, headers=headers)
        return response.json()

    def charge_account(self, email: str, amount: str, authorization_code: str):
        url = f"{base_url}/transaction/charge_authorization"
        headers = base_headers
        data = {
            "email": email,
            "amount": str(int(amount) * 100),
            "authorization_code": authorization_code,
        }
        response = self.requests.post(url, headers=headers, json=data)
        return response.json()

    def fetch_and_save_banks(self):
        url = f"{base_url}/bank?currency=NGN"
        headers = base_headers
        response = self.requests.get(url, headers=headers)
        if response.status_code == 200:
            banks = response.json().get("data", [])
            for bank in banks:
                Bank.objects.update_or_create(code=bank["code"], name=bank["name"])

    def resolve_account(self, account_number, bank_code):
        url = f"{base_url}/bank/resolve?account_number={account_number}&bank_code={bank_code}"
        headers = base_headers
        response = self.requests.get(url=url, headers=headers)
        return response.json()

    def get_talent_recipient_code(
        self, type: str, name: str, account_number: str, bank_code: str
    ):
        url = f"{base_url}/transferrecipient"
        headers = base_headers
        data = {
            "type": type,
            "name": name,
            "account_number": account_number,
            "bank_code": bank_code,
        }
        response = self.requests.post(url, headers=headers, json=data)
        return response.json()

    def initiate_transfer_to_bank(
        self, source: str, reason: str, amount: str, recipient: str, reference_tag=None
    ):
        url = f"{base_url}/transfer"
        headers = base_headers
        data = {
            "source": source,
            "reason": reason,
            "amount": str(int(amount * 100)),
            "recipient": recipient,
            "reference": self.generate_transaction_reference(reference_tag),
        }
        response = self.requests.post(url, headers=headers, json=data)
        return response.json()

    def initialize_plan_recurring_payment(
        self, amount: str, callback_url: str, plan_code: str
    ):
        url = f"{base_url}/transaction/initialize"
        headers = base_headers
        data = {
            "plan": plan_code,
            "amount": str(int(amount) * 100),
            "callback_url": callback_url,
            "reference": self.generate_transaction_reference(),
        }
        x = self.requests.post(url, json=data, headers=headers)
        results = x.json()
        return results


paystack_handler = PayStackHandler(logger)
