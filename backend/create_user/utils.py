import logging
import threading
from django.utils.crypto import get_random_string
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from emails import emails
from django.conf import settings
from django.utils.encoding import force_str, force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from .models import CustomUser, OneTimePassword, TalentProfile, CompanyTeamInvite
from utils.email_handler import EmailHandler, EmailTypes
from subscriptions.models import PaystackSubscription, StripeSubscription, Wallet, FreePlan

logger = logging.getLogger(__name__)


def send_after_commit(fn, *args, **kwargs):
    """Run *fn* in a daemon thread after the current DB transaction commits.

    Drop-in replacement for Celery `task.delay()` when the worker isn't
    running. Swap to `.delay()` later with no caller changes.
    """
    def _run():
        try:
            fn(*args, **kwargs)
        except Exception:
            logger.exception("Background send failed: %s", fn.__name__)

    transaction.on_commit(lambda: threading.Thread(target=_run, daemon=True).start())
User = get_user_model()


def generate_otp(user):
    otp_code = get_random_string(length=6, allowed_chars="0123456789")
    otp_expires = timezone.now() + timedelta(seconds=settings.OTP_EXPIRY_TIME)

    otp, created = OneTimePassword.objects.update_or_create(
        user=user,
        defaults={"code": otp_code, "otp_expires": otp_expires, "attempts": 0},
    )
    return otp_code


def send_otp_to_user(email):
    subject = "Verify your email"
    user = CustomUser.objects.filter(email=email).first()
    otp_code = generate_otp(user)
    context = {"code": list(otp_code)}
    if user:
        EmailHandler(email).send_mail(
            subject=subject,
            template="emails/verify_email.html",
            email_type=EmailTypes.OTP_FOR_EMAIL_VERIFICATION,
            context=context,
            security=True,
        )



def send_welcome_mail(user_pk):
    user = User.objects.get(pk=user_pk)
    return emails.send_welcome_mail(user)


def generate_referral_code():
    while True:
        referral_code = get_random_string(length=6)
        if not TalentProfile.objects.filter(referral_code=referral_code).exists():
            return referral_code


def send_invite_to_user(email, referral_code):
    subject = "You're invited to join Tiaago"
    invite_url = f"{settings.FRONTEND_URL.rstrip('/')}/talents/signup?ref={referral_code}"

    try:
        inviter = TalentProfile.objects.get(referral_code=referral_code)
        context = {"inviter": inviter.full_name, "invite_url": invite_url}
        EmailHandler(email).send_mail(
            subject=subject,
            context=context,
            template="emails/referral_invite.html",
            email_type=EmailTypes.USER_INVITE,
        )
    except TalentProfile.DoesNotExist:
        logger.error(f"User with referral code does not exist")
    except Exception as e:
        logger.error(f"Failed to send invite email to {email}: {e}")


def build_invite_link(token:str):
    # frontend route for handling invitation acceptance
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    return f"{frontend_url.rstrip('/')}/invite/accept?token={token}"


def send_invite_email(invite: CompanyTeamInvite):
    invite_url = build_invite_link(invite.token)
    inviter_name = invite.invited_by.get_full_name() if invite.invited_by else "A teammate"
    subject = f"{inviter_name} invited you to {invite.company.company_name} on Tiaago"

    context = {
        "company_name": invite.company.company_name,
        "inviter": inviter_name,
        "role": invite.role,
        "invite_url": invite_url,
        "expiry_days": "5",
    }
    EmailHandler(invite.email).send_mail(
        subject=subject,
        context=context,
        template="emails/company_team_invite.html",
        email_type=EmailTypes.COMPANY_TEAM_INVITE,
        from_name=f"{inviter_name} via Tiaago",
        headers={"X-Entity-Ref-ID": str(invite.token)},
    )
    
   
  
def get_company_billing_type(company):
    """
    Determine the billing type for a company based on its active subscriptions.
    """
    
    stripe_active = StripeSubscription.objects.filter(
        company=company, status="active"
    ).first()
    
    paystack_active = PaystackSubscription.objects.filter(
        company=company, status="active"
    ).first()
    
    free_plan = FreePlan.objects.filter(company=company, status="active").first()
    
    wallet = Wallet.objects.filter(
        company=company, balance__gte=0
    )
    
    if (stripe_active or paystack_active):
        return "subscription"
    elif free_plan:
        return "subscription"
    elif wallet.exists():
        return "wallet"
    

def get_active_subscription(company):
    """
    Retrieve the active subscription for a company based on its billing type.
    """
    stripe_sub = StripeSubscription.objects.filter(
        company=company, status="active"
    ).first()
    
    if stripe_sub:
        return {
            "provider": "stripe",
            "plan": stripe_sub.plan.name,
            "status": stripe_sub.status,
            "resume_limit": stripe_sub.resume_limit,
            "assessment_limit": stripe_sub.assessment_limit,
            "cancelled_at": stripe_sub.cancelled_at,
        }
    
    paystack_sub = PaystackSubscription.objects.filter(
        company=company, status="active"
    ).first()
    
    if paystack_sub:
        return {
            "provider": "paystack",
            "plan": paystack_sub.plan.name,
            "status": paystack_sub.status,
            "resume_limit": paystack_sub.resume_limit,
            "assessment_limit": paystack_sub.assessment_limit,
            "cancelled_at": paystack_sub.cancelled_at,
        }
    
    # free tier
    free_plan = FreePlan.objects.filter(company=company, status="active").first()
    if free_plan:
        return {
            "provider": "free_tier",
            "plan": "Free",
            "status": "active",
            "resume_limit": free_plan.resume_limit,
            "assessment_limit": free_plan.assessment_limit,
        }
    
    return None

def get_wallet_balance(company):
    """
    Retrieve wallet balance
    """
    wallet = Wallet.objects.filter(company=company).first()
    if wallet:
        return wallet.balance
    return 0
