from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import uuid
from django.db import transaction
from dateutil.relativedelta import relativedelta

from create_user.models import CustomUser, Company, TalentProfile
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
        """Starts the plan's one-time cycle on first check, then expires it
        for good once that cycle ends. Deliberately does NOT renew month
        over month -- the free plan is a one-time grant (or, after a paid
        subscription lapses, a one-time grace period), not a recurring
        monthly allowance. See helper.has_active_subscription_capacity for
        why real billing no longer keys off this model at all; this only
        governs the legacy resume_limit/assessment_limit display."""
        now = timezone.now()

        if self.end_at is None:
            # First check: start the one cycle this plan ever gets.
            self.end_at = now + relativedelta(months=1)
            self.status = "active"
            self.save(update_fields=['end_at', 'status'])
        elif now > self.end_at and self.status != "expired":
            self.status = "expired"
            self.save(update_fields=['status'])
    

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
    total_funded_lifetime = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_spent_lifetime = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    low_balance_threshold = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    low_balance_alert_enabled = models.BooleanField(default=True)
    low_balance_alert_sent_at = models.DateTimeField(null=True, blank=True)
    free_credits_remaining = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet of {self.company.company_name} - Balance: {self.balance}"

    def locked(self):
        """Re-fetch this wallet with a row lock -- must be called inside an
        outer transaction.atomic() block. Use before any read-then-write of
        balance/free_credits_remaining to prevent a lost-update race between
        two concurrent billing calls for the same company."""
        return Wallet.objects.select_for_update().get(pk=self.pk)

    @transaction.atomic
    def credit(self, amount, reference=None, description=None, currency=None, service_type=None,
               status="completed", job=None, candidate=None, metadata=None):
        wallet = self.locked()
        wallet.balance += amount
        wallet.currency = currency or wallet.currency
        wallet.total_funded_lifetime += amount
        wallet.save(update_fields=['balance', 'currency', 'total_funded_lifetime'])
        self.balance = wallet.balance
        txn = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TransactionType.CREDIT,
            amount=amount,
            currency=currency,
            balance_after=wallet.balance,
            reference=reference,
            description=description,
            service_type=service_type,
            status=status,
            job=job,
            candidate=candidate,
            metadata=metadata or {},
        )
        return txn

    @transaction.atomic
    def debit(self, amount, reference=None, description=None, currency=None, service_type=None,
              status="completed", job=None, candidate=None, metadata=None):
        wallet = self.locked()
        if amount > wallet.balance:
            raise ValueError("Insufficient balance in wallet.")
        wallet.balance -= amount
        wallet.total_spent_lifetime += amount
        wallet.save(update_fields=['balance', 'total_spent_lifetime'])
        self.balance = wallet.balance
        txn = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TransactionType.DEBIT,
            amount=amount,
            currency=currency,
            balance_after=wallet.balance,
            reference=reference,
            description=description,
            service_type=service_type,
            status=status,
            job=job,
            candidate=candidate,
            metadata=metadata or {},
        )
        return txn


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
    class TransactionType(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"
        REFUND = "refund", "Refund"
        ADJUSTMENT = "adjustment", "Adjustment"

    # Kept for backward compatibility with existing code that references
    # WalletTransaction.TRANSACTION_TYPES directly.
    TRANSACTION_TYPES = TransactionType.choices

    class ServiceType(models.TextChoices):
        RESUME_SCREENING = "resume_screening", "Resume Screening"
        ASSESSMENT = "assessment", "Assessment"
        WALLET_TOPUP = "wallet_topup", "Wallet Top-up"
        FREE_CREDIT = "free_credit", "Free Credit"
        INTERVIEW = "interview", "Interview"
        AI_INTERVIEW = "ai_interview", "AI Interview"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REVERSED = "reversed", "Reversed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    service_type = models.CharField(
        max_length=30, choices=ServiceType.choices, null=True, blank=True, db_index=True
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, null=True, blank=True)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reference = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED, db_index=True)
    job = models.ForeignKey("jobs.Job", on_delete=models.SET_NULL, null=True, blank=True, related_name="wallet_transactions")
    candidate = models.ForeignKey(TalentProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="wallet_transactions")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["wallet", "-created_at"]),
            models.Index(fields=["service_type", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.transaction_type.upper()} of {self.amount} on {self.created_at.strftime('%Y-%m-%d %H:%M:%S')} for {self.wallet.company.company_name}"


class CandidateBillingRecord(models.Model):
    """One row per (organisation, job_application) -- or per (organisation,
    skill_assessment) for a standalone (no-job) assessment invite, see
    skill_assessment below. This is the idempotency guard that ensures a
    candidate's resume screening and assessment are each ever charged (or
    covered by a free credit) exactly once, no matter how many times the
    pipeline retries."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="candidate_billing_records")
    # Null for a standalone assessment charge (see skill_assessment below) --
    # there's no Job at all in that flow.
    job = models.ForeignKey(
        "jobs.Job", on_delete=models.CASCADE, related_name="candidate_billing_records",
        null=True, blank=True,
    )
    # The idempotency key used to be (organisation, job, candidate), but a
    # guest application (see jobs.JobApplication.applicant, now nullable)
    # has no TalentProfile to be a `candidate` -- job_application uniquely
    # identifies the (job, candidate-or-guest) pair either way, so it's the
    # key now. `candidate` (nullable) stays purely for display/reporting on
    # real accounts.
    job_application = models.ForeignKey(
        "jobs.JobApplication", on_delete=models.CASCADE, related_name="billing_records",
        null=True, blank=True,
    )
    # Set instead of job/job_application for a standalone (no-job) assessment
    # invite -- see BillingService.process_standalone_assessment_charge and
    # skill_assessment.views.InviteCandidatesToAssessmentAPIView. Each
    # invited candidate gets their own cloned GeneralSkillAssessment row
    # (source_template on the clone points back at the recruiter's saved
    # template), so charging per-clone here mirrors charging per-
    # job_application on the job-flow side exactly.
    skill_assessment = models.ForeignKey(
        "skill_assessment.GeneralSkillAssessment", on_delete=models.CASCADE, related_name="billing_records",
        null=True, blank=True,
    )
    candidate = models.ForeignKey(
        TalentProfile, on_delete=models.CASCADE, related_name="billing_records",
        null=True, blank=True,
    )
    was_free_credit = models.BooleanField(default=False)

    resume_screening_charged = models.BooleanField(default=False)
    resume_screening_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    resume_screening_charged_at = models.DateTimeField(null=True, blank=True)

    assessment_charged = models.BooleanField(default=False)
    assessment_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    assessment_charged_at = models.DateTimeField(null=True, blank=True)

    total_charged = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organisation", "job_application"], name="unique_candidate_billing_record"
            ),
            models.UniqueConstraint(
                fields=["organisation", "skill_assessment"],
                condition=models.Q(skill_assessment__isnull=False),
                name="unique_candidate_billing_record_standalone",
            ),
        ]
        indexes = [
            models.Index(fields=["organisation", "-created_at"]),
        ]

    def __str__(self):
        candidate = self.candidate or (
            (self.job_application and self.job_application.candidate_full_name)
            or (self.skill_assessment and self.skill_assessment.invited_name)
        )
        scope = self.job or self.skill_assessment or self.organisation
        return f"Billing record: {candidate} / {scope} / {self.organisation}"


class WalletTopup(models.Model):
    """Tracks a wallet-funding attempt through its whole lifecycle (PENDING
    at initiation -> COMPLETED/FAILED on webhook/callback), keyed by the
    provider's own payment identifier so webhook handlers can idempotently
    look it up instead of only matching on a loosely-checked reference
    string."""

    class Provider(models.TextChoices):
        STRIPE = "stripe", "Stripe"
        PAYSTACK = "paystack", "Paystack"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="topups")
    organisation = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="wallet_topups")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10)
    payment_provider = models.CharField(max_length=20, choices=Provider.choices)
    provider_payment_id = models.CharField(max_length=255, unique=True, db_index=True)
    provider_status = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.CharField(max_length=500, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["organisation", "-initiated_at"]),
        ]

    def __str__(self):
        return f"Top-up {self.amount} {self.currency} ({self.status}) for {self.organisation.company_name}"


class PricingConfig(models.Model):
    """Admin-editable key/value pricing settings, replacing the hardcoded
    settings.PAYG_PRICES dict so price changes take effect platform-wide
    without a deploy."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=255)
    description = models.CharField(max_length=500, blank=True, default="")
    updated_by_admin = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name="pricing_config_updates"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key} = {self.value}"
