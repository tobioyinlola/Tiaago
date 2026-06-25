from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import uuid
from django.db import transaction
from dateutil.relativedelta import relativedelta

from create_user.models import CustomUser, Company
User = get_user_model()


class SubPlan(models.Model):
    class SUB_TYPE(models.TextChoices):
        BASIC = "BS", _("Basic")
        PREMIUM = "PR", _("Premium")

    class SUB_USER_TYPE(models.TextChoices):
        TALENT = "T", _("Talent")
        COMPANY_REP = "CR", _("COMPANY REPRESENTATIVE")

    name = models.CharField(max_length=50)
    description = models.CharField(max_length=100)
    info = models.TextField(max_length=1000)
    sub_type = models.CharField(
        max_length=2,
        choices=SUB_TYPE.choices,
    )
    user_type = models.CharField(
        max_length=4,
        choices=SUB_USER_TYPE.choices,
    )
    no_of_days = models.PositiveIntegerField(default=30)
    amount = models.DecimalField(max_digits=7, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")

   

    def __str__(self):
        return f"{self.name} - {self.sub_type} - {self.user_type}"



class Subscription(models.Model):
    user = models.OneToOneField(
        User,
        related_name='subscription',
        on_delete=models.CASCADE
    )
    sub_plan = models.ForeignKey(
        SubPlan,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    status  = models.CharField(max_length=20, default="pending")
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(blank=True)
    transaction_reference = models.CharField(max_length=50, unique=True)


    def __str__(self):
        return f"{self.user.username} sunscribes to {self.sub_plan} plan"

    def save(self, *args, **kwargs):
        if not self.end_date:
            self.end_date = self.start_date + timezone.timedelta(days=self.sub_plan.no_of_days)
        return super().save(*args, **kwargs)

    def is_active(self):
        # check if subscription is still valid
        return timezone.now() <= self.end_date  and 'success' in self.status
    

# Paystack Plan model
class PaystackPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    plan_code = models.CharField(max_length=50, unique=True)
    interval = models.CharField(max_length=20)
    amount = models.PositiveIntegerField(help_text="Amount in Kobo")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.interval})"

# Paystack Subscription 
class PaystackSubscription(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("non-renewing", "Non Renewing"),
        ("disabled", "Disabled"),
        ("cancelled", "Cancelled"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="paystack_subscriptions")
    company_email = models.CharField(max_length=255)
    plan = models.ForeignKey(PaystackPlan, on_delete=models.CASCADE)
    customer_code = models.CharField(max_length=50, unique=True)
    # email_token = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    next_payment_date = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    end_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Plan limits
    resume_limit = models.PositiveIntegerField(default=0)
    assessment_limit = models.PositiveIntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=["company", "status", "-started_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.plan.name} ({self.status})"

    def check_and_update_cycle(self):
        """Check if the subscription cycle has ended and update status accordingly."""
        now = timezone.now()

        # --- MONTHLY PLAN ---
        if self.plan.interval == "monthly":
            if now > self.end_at:
                # Reset monthly usage
                usage = getattr(self.company, 'usage', None)
                if usage:
                    usage.resumes_used = 0
                    usage.assessments_used = 0
                    usage.last_reset = now
                    usage.save(update_fields=['resumes_used', 'assessments_used', 'last_reset'])
                
                # Mark plan inactive until user renews
                self.status = "inactive"
                self.save(update_fields=['status'])
    
            return
        
        # --- YEARLY PLAN (14 months) ---
        if self.plan.interval == "annually":
            usage = getattr(self.company, 'usage', None)
            if usage:
                # Check if one month is completed
                if usage.last_reset is None or now >= usage.last_reset + relativedelta(months=1):
                    usage.resumes_used = 0
                    usage.assessments_used = 0
                    usage.last_reset = now
                    usage.save(update_fields=['resumes_used', 'assessments_used', 'last_reset'])
            
            # Annual plan expiration check
            if now > self.end_at:
                self.status = "inactive"
                self.save(update_fields=['status'])


class SubscriptionTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="paystack_transactions")
    company_email = models.CharField(max_length=255, null=True, blank=True)
    plan_name = models.CharField(max_length=255, null=True, blank=True)
    provider = models.CharField(max_length=50, default="paystack")
    reference = models.CharField(max_length=100, unique=True)
    amount = models.PositiveIntegerField(help_text="Amount in Kobo or cent")
    next_payment_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50)
    channel = models.CharField(max_length=50, blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.reference
    

class PaystackWebhookLog(models.Model):
    event = models.CharField(max_length=100)
    payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.event} - {self.received_at.strftime('%Y-%m-%d %H:%M:%S')}"


# Stripe plan price model
class StripePlanPrice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    price_id = models.CharField(max_length=100, unique=True)
    currency = models.CharField(max_length=10, default="usd")
    unit_amount = models.PositiveIntegerField(default=0)
    recurring_interval = models.CharField(max_length=20, default="month")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.price_id}"

# stripe subscription model
class StripeSubscription(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("failed", "Failed"),
        ("pending", "Pending"),
        ("canceled", "Canceled"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="stripe_subscription")
    company_email = models.CharField(max_length=255, null=True, blank=True)
    plan = models.ForeignKey(StripePlanPrice, on_delete=models.CASCADE)
    subscription_id = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    started_at = models.DateTimeField(auto_now_add=True)
    end_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Plan limits
    resume_limit = models.PositiveIntegerField(default=0)
    assessment_limit = models.PositiveIntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=["company", "status", "-started_at"]),
        ]

    def __str__(self):
        return f"{self.company.company_email} - {self.plan.name} ({self.status})"

    def check_and_update_cycle(self):
        """Check if the subscription cycle has ended and update status accordingly."""
        now = timezone.now()

        # --- MONTHLY PLAN ---
        if self.plan.recurring_interval == "month":
            if now > self.end_at:
                # Reset monthly usage
                usage = getattr(self.company, 'usage', None)
                if usage:
                    usage.resumes_used = 0
                    usage.assessments_used = 0
                    usage.last_reset = now
                    usage.save(update_fields=['resumes_used', 'assessments_used', 'last_reset'])
                
                # Mark plan inactive until user renews
                self.status = "inactive"
                self.save(update_fields=['status'])
    
            return
        
        # --- YEARLY PLAN (14 months) ---
        if self.plan.recurring_interval == "year":
            usage = getattr(self.company, 'usage', None)
            if usage:
                # Check if one month is completed
                if usage.last_reset is None or now >= usage.last_reset + relativedelta(months=1):
                    usage.resumes_used = 0
                    usage.assessments_used = 0
                    usage.last_reset = now
                    usage.save(update_fields=['resumes_used', 'assessments_used', 'last_reset'])
            
            # Annual plan expiration check
            if now > self.end_at:
                self.status = "inactive"
                self.save(update_fields=['status'])
      
# Free plan model
class FreePlan(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="free_usage")
    company_email = models.CharField(max_length=255, null=True, blank=True)
    resume_limit = models.PositiveIntegerField(default=20)
    assessment_limit = models.PositiveIntegerField(default=10)
    status = models.CharField(max_length=20, default="active")
    end_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Free Plan for {self.company.company_name}"
    
    def check_and_update_cycle(self):
        """Check if the free plan cycle has ended and update status accordingly."""
        now = timezone.now()
        
        if self.end_at is None or now > self.end_at:
            usage = getattr(self.company, 'usage', None)
            if usage:
                usage.resumes_used = 0
                usage.assessments_used = 0
                usage.last_reset = now
                usage.save(update_fields=['resumes_used', 'assessments_used', 'last_reset'])
            
            # Renew plan for another month
            self.end_at = now + relativedelta(months=1)
            self.status = "active"
            self.save(update_fields=['end_at', 'status'])
    

# Model to track user usage
class UserUsage(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="usage")
    resumes_used = models.PositiveIntegerField(default=0)
    assessments_used = models.PositiveIntegerField(default=0)
    last_reset = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Usage for {self.company.company_name}"
    
    def get_subscription(self):
        """Retrieve the current subscription or free plan for the company."""
        return self.company.active_subscription
    
    def can_screen_resume(self):
        """Check if user can screen more resumes based on their plan limits."""
        subscription = self.get_subscription()
        
        if not subscription:
            return False
        
        # Auto-reset cycle if needed
        subscription.check_and_update_cycle()
        
        return self.resumes_used < subscription.resume_limit
    
    def can_take_assessment(self):
        """Check if user can take more assessments based on their plan limits."""
        subscription = self.get_subscription()
        
        if not subscription:
            return False
        
        # Auto-reset cycle if needed
        subscription.check_and_update_cycle()
        
        return self.assessments_used < subscription.assessment_limit
    
    def increment_resumes_used(self):
        """Increment the count of resumes used."""
        self.resumes_used += 1
        self.save(update_fields=['resumes_used'])
    
    def increment_assessments_used(self):
        """Increment the count of assessments used."""
        self.assessments_used += 1
        self.save(update_fields=['assessments_used'])

        
class Wallet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Wallet of {self.company.company_name} - Balance: {self.balance}"
    
    @transaction.atomic
    def credit(self, amount, reference=None, description=None, currency=None):
        self.balance += amount
        self.currency = currency
        self.save(update_fields=['balance', 'currency'])
        WalletTransaction.objects.create(
            wallet=self,
            transaction_type="credit",
            amount=amount,
            currency=currency,
            reference=reference,
            description=description,
        )
    
    @transaction.atomic
    def debit(self, amount, reference=None, description=None, currency=None):
        if amount > self.balance:
            raise ValueError("Insufficient balance in wallet.")
        self.balance -= amount
        self.save(update_fields=['balance'])
        WalletTransaction.objects.create(
            wallet=self,
            transaction_type="debit",
            amount=amount,
            currency=currency,
            reference=reference,
            description=description,
        )


class WalletUserUsage(models.Model):
    wallet = models.OneToOneField(Wallet, on_delete=models.CASCADE, related_name="usage")
    resumes_used = models.PositiveIntegerField(default=0)
    assessments_used = models.PositiveIntegerField(default=0)
    last_reset = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Wallet Usage for {self.wallet.company.company_name}"
    
    def increment_resumes_used(self):
        """Increment the count of resumes used."""
        self.resumes_used += 1
        self.save(update_fields=['resumes_used'])
    
    def increment_assessments_used(self):
        """Increment the count of assessments used."""
        self.assessments_used += 1
        self.save(update_fields=['assessments_used'])


class WalletTransaction(models.Model):
    TRANSACTION_TYPES = [
        ("credit", "Credit"),
        ("debit", "Debit"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, null=True, blank=True)
    reference = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.transaction_type.upper()} of {self.amount} on {self.created_at.strftime('%Y-%m-%d %H:%M:%S')} for {self.wallet.company.company_name}"
