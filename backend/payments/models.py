from django.db import models
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.utils.translation import gettext_lazy as _
from base.models import TimeStampedModel
from contract.models import Contract
from create_user.models import Referral, ReferralWallet, TalentProfile, WithdrawalRequest
from jobs.models import JobApplication
import uuid
from django.utils import timezone

class Payment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="payments",
        on_delete=models.SET_NULL,
        null=True,
    )
    ref = models.CharField(max_length=255, unique=True)
    plan_id = models.PositiveSmallIntegerField(default=0)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, default="pending")

    def __str__(self):
        return f"{self.ref} - {self.status}"


# Create your models here.
class Wallet(models.Model):
    class WALLET_USER_TYPE(models.TextChoices):
        TALENT = "T", _("Talent")
        COMPANY_REP = "CR", _("COMPANY REPRESENTATIVE")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="wallet",
        on_delete=models.SET_NULL,
        null=True,
    )
    user_type = models.CharField(max_length=20, choices=WALLET_USER_TYPE.choices)
    currency = models.CharField(max_length=20, default="NGN")
    pin = models.CharField(max_length=255)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_withdrawable = models.BooleanField(default=False)

    def set_pin(self, pin):
        """
        Hashes and sets the pin.
        """
        self.pin = make_password(pin)

    def check_pin(self, pin):
        """
        Verifies if the provided pin matches the stored hash.
        """
        return check_password(pin, self.pin)

    def __str__(self):
        """
        Return a string representation of the Wallet.
        """
        return f"Wallet for {self.user} with balance {self.balance}"


class Card(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="cards",
        on_delete=models.SET_NULL,
        null=True,
    )
    authorization_code = models.CharField(max_length=255, unique=True)
    card_type = models.CharField(max_length=100)
    last4 = models.CharField(max_length=4)
    exp_month = models.CharField(max_length=2)
    exp_year = models.CharField(max_length=4)
    bin = models.CharField(max_length=100)
    bank = models.CharField(max_length=100)
    channel = models.CharField(max_length=10)
    signature = models.CharField(max_length=100, unique=True)
    reusable = models.BooleanField(default=True)
    country_code = models.CharField(max_length=4)


class WalletTransaction(models.Model):
    class TRANSACTION_TYPE(models.TextChoices):
        COMPANY_WALLET_FUNDING = "company wallet funding", _("Company Wallet Funding")
        COMPANY_CARD_DIRECT_DEBIT = "company card debit", _("Company Card Debit")
        DEBIT_COMPANY_WALLET = "company debit", _("Debit Company Wallet")
        CREDIT_TALENT_WALLET = "talent credit", _("credit talent wallet")
        TALENT_BANK_TRANSFER_PAYOUT = "talent bank transfer", _("Talent Bank Transfer")
        TALENT_REFERRAL_REWARD = "talent referral credit", _("Talent Referral Credit")
        TALENT_REFERRAL_WITHDRAWAL = "talent referral withdrawal", _("Talent Referral Withdrawal")

    STATUS_CHOICES = [
        ("initiated", "Initiated"),
        ("pending", "Pending"),
        ("available", "Available"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="transaction",
        on_delete=models.SET_NULL,
        null=True,
    )
    contract = models.ForeignKey(
        Contract, related_name="transaction", on_delete=models.CASCADE, null=True
    )
    wallet = models.ForeignKey(
        Wallet, related_name="transaction", on_delete=models.CASCADE, null=True
    )
    card = models.ForeignKey(
        Card, related_name="card", on_delete=models.SET_NULL, null=True
    )
    referral = models.ForeignKey(
        Referral, related_name="transaction", on_delete=models.SET_NULL, null=True
    )

    #Link to referral wallet and withdrawal
    referral_withdrawal = models.ForeignKey(ReferralWallet, related_name="transactions", on_delete=models.SET_NULL, null=True, blank=True)
    withdrawal_request = models.ForeignKey(
        WithdrawalRequest, related_name="wallet_transactions", on_delete=models.SET_NULL, null=True, blank=True
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    tiaago_fees = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPE.choices)
    ref = models.CharField(max_length=255, unique=True)
    transfer_code = models.CharField(max_length=255)
    recipient_code = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="initiated"
    )
    retry_attempts = models.IntegerField(default=0)
    next_retry_date = models.DateField(null=True, blank=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

class Bank(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.name


class TiaagoPricing(TimeStampedModel):
    """Model for tiaago pricing."""

    resume_screening_fee = models.DecimalField(max_digits=10, decimal_places=3)
    mcq_skill_assessment_per_candidate_fee = models.DecimalField(
        max_digits=10, decimal_places=3
    )
    code_skill_assessment_per_candidate_fee = models.DecimalField(
        max_digits=10, decimal_places=3
    )
    ai_interview_fee = models.DecimalField(max_digits=10, decimal_places=3)
    free_candidate_screening_count = models.IntegerField(
        help_text="Maximum amount of free screenings that companies are allowed to have before they start getting charged"
    )



class Pricing(models.Model):    
    name = models.CharField(max_length=100)
    billing_type = models.CharField(max_length=100, default="pay_as_you_go") 
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stripe_price_id = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    features = models.JSONField(default=dict) 
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['price'] 

    def __str__(self):
        return f"{self.name} - ${self.price or 'metered'}"

class PaymentMethod(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payment_methods")
    stripe_payment_method_id = models.CharField(max_length=100,null=True,blank=True)
    paystack_authorisation_code=models.CharField(max_length=100,null=True,blank=True)
    paystack_card_signature = models.CharField(max_length=255, null=True, blank=True)
    card_last4 = models.CharField(max_length=4)
    card_brand = models.CharField(max_length=20)
    exp_month = models.IntegerField()
    exp_year = models.IntegerField()
    is_default = models.BooleanField(default=False)
    subscription_item_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.card_brand} ****{self.card_last4}"


class Invoice(models.Model):
    STATUS_CHOICES = (
        ('paid', 'Paid'),
        ('open', 'Open'),
        ('void', 'Void'),
        ('uncollectible', 'Uncollectible'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="invoices")
    stripe_invoice_id = models.CharField(max_length=100, unique=True ,null=True, blank=True)
    paystack_reference_id = models.CharField(max_length=100, unique=True ,null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    invoice_pdf = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice {self.stripe_invoice_id} - {self.user.email}"


class UsageEvent(models.Model):
    SERVICE_CHOICES = [
        ('resume_analysis', 'Resume Analysis'),
        ('skill_assessment', 'Skill Assessment'),
        ('interview_screening', 'Interview Screening'),
    ]

    job_application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='usage_events'
    )
    service_type = models.CharField(
        max_length=50,
        choices=SERVICE_CHOICES
    )
    stripe_event_id = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )
    provider     = models.CharField(max_length=20 , null=True, blank=True)   
    external_id  = models.CharField(max_length=100, null=True, blank=True)

    used_at = models.DateTimeField(auto_now_add=True)
    quantity = models.PositiveIntegerField(default=1)
    billed = models.BooleanField(default=False)
    billed_at = models.DateTimeField(null=True, blank=True)
    invoice = models.ForeignKey('Invoice', null=True, blank=True, on_delete=models.SET_NULL, related_name='usage_events')

    class Meta:
        ordering = ['-used_at']
        verbose_name = "Usage Event"
        verbose_name_plural = "Usage Events"

    def __str__(self):
        job_str = f" for {self.job_application}" if self.job_application else ""
        return f"{self.service_type} x{self.quantity}{job_str} on {self.used_at.date()}"

class ReportPAYGFlowStatus(models.Model):
    class Status(models.TextChoices):
        STARTED = "started", "Started"
        FAILED = "failed", "Failed"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"

    job_application = models.OneToOneField(JobApplication, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.STARTED
    )
    error_message = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.job_application} - {self.status}"
    


class Community(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    
class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name="coupons")
    discount_amount_ngn = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_amount_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_percent = models.PositiveIntegerField(null=True, blank=True)
    max_usage = models.PositiveIntegerField(default=1)
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return self.used_count < self.max_usage and timezone.now() < self.expires_at

    def __str__(self):
        return f"{self.code} ({self.community.name})"

    @staticmethod
    def generate_code(community_name: str) -> str:
        clean_name = community_name.upper().replace(" ", "")
        suffix = uuid.uuid4().hex[:6].upper()
        return f"{clean_name}-{suffix}"

class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="usages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    used_at = models.DateTimeField(auto_now_add=True)