from django.conf import settings
from decimal import Decimal
from rest_framework.response import Response
from rest_framework.status import HTTP_402_PAYMENT_REQUIRED
from subscriptions.models import WalletUserUsage, UserUsage
from django.db import transaction
import uuid

# function to determine plan user usage
def determine_plan_usage(plan_name, plan_interval):
    # check the plan user subscribe too
    resume_limit = 0
    assessment_limit = 0
    
    if plan_name == "starter" and plan_interval in ["monthly", "month"]:
        resume_limit = 1000
        assessment_limit = 200
    elif plan_name == "pro" and plan_interval in ["monthly", "month"]:
        resume_limit = 2000
        assessment_limit = 400
    elif plan_name == "starter" and plan_interval in ["annually", "year"]:
        resume_limit = 1000
        assessment_limit = 200
    elif plan_name == "pro" and plan_interval in ["annually", "year"]:
        resume_limit = 2000
        assessment_limit = 400
    
    print(f"Returning: resume_limit={resume_limit}, assessment_limit={assessment_limit}")
    
    return {
        "resume_limit": resume_limit,
        "assessment_limit": assessment_limit,
    }


# function to determine free plan usage
def determine_free_plan_usage(plan_name, plan_interval):
    resume_limit = 0
    assessment_limit = 0
    
    if plan_name == "Free" and plan_interval == "monthly":
        resume_limit = 20
        assessment_limit = 10
    elif plan_name == "Free" and plan_interval == "annually":
        resume_limit = 20
        assessment_limit = 10
    
    return {
        "resume_limit": resume_limit,
        "assessment_limit": assessment_limit,
    }


def get_payg_price(action: str, currency: str) -> Decimal:
    """
    Retrieve PAYG pricing dynamically.
    e.g. get_payg_price("resume_screening", "usd")
    """
    prices = settings.PAYG_PRICES.get(action, {})
    return prices.get(currency.lower(), Decimal("0.00"))


def check_subscription_wallet_fallback(company, usage, determiner="resume-analyzes"):
    # --- FIRST: Check subscription usage ---
    if usage is None:
        usage = UserUsage.objects.create(company=company)

    if determiner == "resume-analyzes":
        if usage.can_screen_resume():
            usage.increment_resumes_used()
            return None
        
        # --- SECOND: Try wallet fallback ---
        wallet = getattr(company, 'wallet', None)
        if not wallet:
            return Response(
                {
                    "detail": "You have exceeded your subscription usage. "
                              "Please upgrade your plan or fund your wallet to continue."
                },
                status=HTTP_402_PAYMENT_REQUIRED,
            )
        
        # Get wallet usage (create if missing)
        wallet_usage = WalletUserUsage.objects.filter(wallet=wallet).first()
        if wallet_usage is None:
            wallet_usage = WalletUserUsage.objects.create(wallet=wallet)
        
        currency = wallet.currency or "ngn"
        
        # Price for PAYG screening
        price = get_payg_price("resume_screening", currency)
        if wallet.balance < price:
            return Response(
                {
                    "detail": (
                        f"This role is currently not available at the moment! "
                        # f"enough balance ({wallet.balance} {currency}). "
                        # f"Please fund your wallet or upgrade your plan."
                    )
                },
                status=HTTP_402_PAYMENT_REQUIRED,
            )
        
        # Deduct from wallet
        wallet.debit(
            amount=price,
            reference=str(uuid.uuid4()),
            description=f"Deduction for resume screening.",
            currency=currency,
        )
        
        # Increment usage in wallet
        wallet_usage.increment_resumes_used()
        return None
    elif determiner == "assessment":
        if usage is None:
            usage = UserUsage.objects.create(company=company)
        
        if usage.can_take_assessment():
            usage.increment_assessments_used()
            return None
        
        # --- SECOND: Try wallet fallback ---
        wallet = getattr(company, 'wallet', None)
        if not wallet:
            return Response(
                {
                    "detail": "You have exceeded your subscription usage. "
                              "Please upgrade your plan or fund your wallet to continue."
                },
                status=HTTP_402_PAYMENT_REQUIRED,
            )
        
        # Get wallet usage (create if missing)
        wallet_usage = WalletUserUsage.objects.filter(wallet=wallet).first()
        if wallet_usage is None:
            wallet_usage = WalletUserUsage.objects.create(wallet=wallet)
        
        currency = wallet.currency or "ngn"
        
        # Price for PAYG assessment
        price = get_payg_price("assessment", currency)
        if wallet.balance < price:
            return Response(
                {
                    "detail": (
                        f"This role is currently not available at the moment! "
                        # f"enough balance ({wallet.balance} {currency}). "
                        # f"Please fund your wallet or upgrade your plan."
                    )
                },
                status=HTTP_402_PAYMENT_REQUIRED,
            )
        
        # Deduct from wallet
        wallet.debit(
            amount=price,
            reference=str(uuid.uuid4()),
            description=f"Deduction for assessment",
            currency=currency,
        )
        
        # Increment usage in wallet
        wallet_usage.increment_assessments_used()
        return None
    else:
        return None


# dollar and naira conversion
FX_RATES = {
    ("NGN", "USD"): Decimal(1) / Decimal(1500),
    ("USD", "NGN"): Decimal(1500),
}

COUNTRY_CURRENCY_MAP = {
    "Nigeria": "NGN",
    "United States": "USD",
}

def get_fx_rate(from_currency: str, to_currency: str) -> Decimal:
    if from_currency == to_currency:
        return Decimal("1.0")

    rate = FX_RATES.get((from_currency, to_currency))
    if rate is None:
        raise ValueError(f"Missing FX rate: {from_currency} → {to_currency}")
    
    return rate


def convert_wallet_currency(company, new_country):
    wallet = company.wallet
    if not wallet:
        return

    old_currency = wallet.currency
    new_currency = COUNTRY_CURRENCY_MAP.get(new_country, "USD")  # default USD

    if old_currency == new_currency:
        return

    rate = get_fx_rate(old_currency, new_currency)

    new_balance = (wallet.balance * rate).quantize(Decimal("0.01"))

    with transaction.atomic():
        wallet.balance = new_balance
        wallet.currency = new_currency
        wallet.save()
