import time
import uuid
from decimal import Decimal
from django.conf import settings
from dateutil.relativedelta import relativedelta      
from django.utils.timezone import now
from django.db.models import Sum
from payments.models import UsageEvent
import stripe
import requests

stripe.api_key = settings.STRIPE_SECRET_KEY


def generate_transaction_reference():
    # Concatenate a timestamp and a unique identifier (UUID)
    timestamp = str(int(time.time()))
    unique_id = str(uuid.uuid4().hex)[:8]  # Truncate UUID to 8 characters for brevity

    return f"{timestamp}-{unique_id}"


def calculate_fees(salary, rate=0.1):
    """Calculate platform fees and net amount."""
    fees = salary * Decimal(rate)
    net_amount = salary - fees
    return fees, net_amount


def calculate_referral_reward(platform_fees, rate=0.01):
    reward = platform_fees * Decimal(rate)
    return reward


UNIT_PRICE_NGN = Decimal("500")    

def _last_twentieth(dt):
    twentieth = dt.replace(day=20, hour=0, minute=0, second=0, microsecond=0)
    if dt >= twentieth:
        return twentieth
    return twentieth - relativedelta(months=1)


def _cycle_window(dt):
    start = _last_twentieth(dt)
    end   = start + relativedelta(months=1)  
    return start, end


def usage_unbilled_for_company(company):
    today = now()
    start, end = _cycle_window(today)
    qset = UsageEvent.objects.filter(
        job_application__job__company=company,
        used_at__gte=start,
        used_at__lt=end,
        billed=False,
    )
    total_qty = qset.aggregate(total=Sum("quantity"))["total"] or 0

    # If none left then previous cycle is closed then show next cycle
    if total_qty == 0:
        start, end = end, end + relativedelta(months=1)
        qset = UsageEvent.objects.filter(
            job_application__job__company=company,
            used_at__gte=start,
            used_at__lt=end,
            billed=False,
        )
        total_qty = qset.aggregate(total=Sum("quantity"))["total"] or 0

    due_date = end.date()   # always the 20‑th (start of next period)
    return total_qty, start.date(), due_date

def initiate_stripe_payment(user, amount_usd,assessment_id, coupon=None):
    success_url = f"{settings.FRONTEND_SUCCESS_URL}/{assessment_id}"
    cancel_url = f"{settings.FRONTEND_CANCEL_URL}/{assessment_id}"
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": "Skill Assessment",
                },
                "unit_amount": int(amount_usd * 100), 
            },
            "quantity": 1,
        }],
        mode="payment",
        customer_email=user.email,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "coupon_code": coupon.code if coupon else "",
        }
    )

    return session.url, session.id

def initiate_paystack_payment(user, amount_ngn,assessment_id,coupon=None):
    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_PRIVATE_KEY}",
        "Content-Type": "application/json",
    }
    callback_url = f"{settings.FRONTEND_CALLBACK_URL}/{assessment_id}"
    metadata = {
        "user_id": user.id,
        "assessment_id": assessment_id,
    }
    if coupon:  
        metadata["coupon_code"] = coupon.code

    data = {
        "email": user.email,
        "amount": int(amount_ngn * 100),
        "callback_url": callback_url,
        "metadata": metadata,
    }

    response = requests.post("https://api.paystack.co/transaction/initialize", json=data, headers=headers)
    response_data = response.json()

    if response.status_code == 200 and response_data["status"]:
        payment_url = response_data["data"]["authorization_url"]
        reference = response_data["data"]["reference"]
        return payment_url, reference

    raise Exception("Unable to initialize Paystack payment")
