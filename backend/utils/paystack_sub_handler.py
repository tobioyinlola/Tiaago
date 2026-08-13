from .logged_requests import APIHandler
from django.conf import settings
import logging
from django.contrib.auth import get_user_model

User = get_user_model()

logger = logging.getLogger("paystack_subscriptions")
base_url = "https://api.paystack.co"
base_headers = {
    "Authorization": f"Bearer {settings.PAYSTACK_PRIVATE_KEY}",
    "Content-Type": "application/json",
}

class PayStackSubscriptionHandler(APIHandler):
    
    # create plan
    def create_plan(self, name: str, amount: str, interval: str):
        url = f"{base_url}/plan"
        headers = base_headers
        data = {
            "name": name,
            "interval": interval,
            "amount": str(int(amount)),  # Convert to kobo
        }
        try:
            response = self.requests.post(url, json=data, headers=headers)
            result = response.json()
            print(result)
            print(response.status_code)
            
            logger.debug(f"Paystack Create Plan Response: {result}")
            
            if response.status_code == 200 or result.get("status") is True:
                logger.debug(f"Plan created successfully: {result['data'].get('plan_code')}")
                logger.debug(f"Plan creation response data: {result['data']}")
                return result
            else:
                logger.error(f"Error creating plan: {result}")
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None
    
    
    # create subscription for user
    def create_subscription(self, customer_email: str, plan_code: str, amount: str):
        url = f"{base_url}/transaction/initialize"
        headers = base_headers
        data = {
            "email": customer_email,
            "plan": plan_code,
            "amount": str(int(amount)),  # Convert to kobo
            "metadata": {
                "type": "subscription_auth"
            }
        }
        
        try:
            response = self.requests.post(url, json=data, headers=headers)
            result = response.json()
            logger.debug(f"Paystack Create Subscription Response: {result}")
            
            if response.status_code == 200 or result.get("status") is True:
                logger.debug(f"Paystack Create Subscription Response: {result}")
                logger.info(f"Subscription created successfully: {result['data'].get('subscription_code')}")
                return result
            else:
                logger.error(f"Error creating subscription: {result}")
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None
        
    
    # method to fund wallet
    def fund_wallet(self, customer_email: str, amount: str, callback_url: str = None):
        url = f"{base_url}/transaction/initialize"
        headers = base_headers
        data = {
            "email": customer_email,
            "amount": int(amount) * 100,  # Convert to kobo
            "metadata": {
                "type": "wallet_funding"
            }
        }
        # Without this, Paystack redirects to whatever default callback URL
        # is configured in the merchant dashboard instead of back to the
        # Tiaago billing page -- same callback_url role Stripe's success_url
        # and Bachs' return_url play for their own checkouts.
        if callback_url:
            data["callback_url"] = callback_url

        try:
            response = self.requests.post(url, json=data, headers=headers)
            result = response.json()
            logger.debug(f"Paystack Fund Wallet Response: {result}")

            if response.status_code == 200 or result.get("status") is True:
                logger.info(f"Wallet funding initialized successfully: {result['data'].get('reference')}")
            else:
                logger.error(f"Error initializing wallet funding: {result}")
            # Always return the parsed Paystack response (success or failure)
            # instead of implicitly returning None here -- callers rely on
            # response.get("status")/.get("data"), and a bare None crashes
            # that with an unrelated AttributeError, hiding the real
            # Paystack-reported reason (e.g. secret_key_invalid) behind a
            # generic 500.
            return result
        except Exception as e:
            logger.error(f"Request error: {e}")
            return {"status": False, "message": str(e)}
