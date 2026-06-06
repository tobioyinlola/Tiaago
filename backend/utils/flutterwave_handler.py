import requests
from django.conf import settings
import logging

logger = logging.getLogger("flutterwave")


base_url = "https://api.flutterwave.com/v3"


class FlutterwaveHandler:
    def initialize_flutterwave_plan_payment(
        self,
        email: str,
        amount: str,
        callback_url: str,
        tx_ref: str,
        plan_id: str,
        phone_number: str,
        name: str,
    ):
        url = f"{base_url}/payments"
        headers = {"Authorization": f"Bearer {settings.FLW_SEC_KEY}"}

        data = {
            "tx_ref": tx_ref,
            "amount": str(amount),
            "currency": "USD",
            "redirect_url": callback_url,
            "customer": {"email": email, "phonenumber": phone_number, "name": name},
            "payment_plan": plan_id,
            "configurations": {
                "session_duration": 10,  # checkout session timeout
                "max_retry_attempt": 5,  # max payment retries
            },
        }

        try:
            response = requests.post(url, headers=headers, json=data)
            response_data = response.json()
            return response_data

        except requests.exceptions.RequestException as err:
            print("The payment didn't go through!!!")
            return str(err)


flutterwave_handler = FlutterwaveHandler()
