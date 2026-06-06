import logging
from django.utils.crypto import get_random_string
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from emails import emails
from django.core.mail import send_mail
from django.conf import settings
from django.utils.encoding import force_str, force_bytes
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from .models import CustomUser, OneTimePassword, TalentProfile, CompanyTeamInvite
from utils.email_handler import EmailHandler, EmailTypes
from subscriptions.models import PaystackSubscription, StripeSubscription, Wallet, FreePlan

logger = logging.getLogger(__name__)
User = get_user_model()


def generate_otp(user):
    otp_code = get_random_string(length=4, allowed_chars="0123456789")
    otp_expires = timezone.now() + timedelta(seconds=settings.OTP_EXPIRY_TIME)

    otp, created = OneTimePassword.objects.update_or_create(
        user=user, defaults={"code": otp_code, "otp_expires": otp_expires}
    )
    return otp_code


def send_otp_to_user(email):
    subject = "One-Time Password for Email Verification"
    email_template_name = "account/email/email_confirmation_signup_message.html"
    user = CustomUser.objects.filter(email=email).first()
    otp_code = generate_otp(user)  # Generate OTP
    context = {"otp": otp_code, "user": user}
    if user:
        EmailHandler(email).send_mail(
            subject=subject,
            template=email_template_name,
            email_type=EmailTypes.OTP_FOR_EMAIL_VERIFICATION,
            context=context,
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
    subject = "You’re Invited to Tiaago!"
    invite_link = f"{settings.FRONTEND_URL.rstrip('/')}/talents/signup?ref={referral_code}"

    try:
        inviter = TalentProfile.objects.get(referral_code=referral_code)
        # Load HTML email template for invitation
        email_template_name = "account/email/invite_email.html"
        context = {"inviter": inviter.full_name, "invite_link": invite_link, "welcome_image_url": f"{settings.BASE_URL}/static/emails/assets/welcome_onboard.jpg"}
        EmailHandler(email).send_mail(
            subject=subject,
            context=context,
            template=email_template_name,
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
    link = build_invite_link(invite.token)
    subject = f"You're invited to join {invite.company.company_name} on Tiaago"

    context = {
        "company_name": invite.company.company_name,
        "inviter": invite.invited_by.get_full_name() if invite.invited_by else "A teammate",
        "role": invite.role,
        "link": link,
        "expiry_days" : 5,
    }
    message = render_to_string("emails/company_invite.txt", context)
    html_message = render_to_string("emails/company_invite.html", context) if True else None

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "nonreply@example.com"),
        recipient_list=[invite.email],
        html_message=html_message,
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
