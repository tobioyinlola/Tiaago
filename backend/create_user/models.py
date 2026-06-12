from allauth.account.models import EmailAddress
from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from phonenumber_field.modelfields import PhoneNumberField
from base.models import TimeStampedModel
from base.utils import get_media_url
from roles.models import Role
from . import managers
import uuid
from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.utils import timezone


class CustomUser(AbstractUser):
    """Tiaago User Model"""

    class USER_TYPE(models.TextChoices):
        TALENT = "T", _("Talent")
        COMPANY_REP = "CR", _("COMPANY REPRESENTATIVE")
        STAFF = "ST", _("STAFF")

    user_type = models.CharField(
        max_length=2, choices=USER_TYPE.choices, default=USER_TYPE.STAFF
    )
    phone_number = PhoneNumberField()
    country = models.CharField(max_length=100)
    bio = models.TextField()
    profile_pic = models.ImageField(
        upload_to="profile_pics/%Y/%m/%d/", null=True, blank=True
    )
    stripe_customer_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    paystack_customer_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    meeting_token = models.CharField(max_length=255, blank=True, default="")
    verified = models.BooleanField(blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    is_verified = models.BooleanField(default=False)

    objects = managers.CustomUserManager()
    staff_objects = managers.StaffManager()
    talent_objects = managers.TalentManager()
    company_objects = managers.CompanyManager()
    

    def get_associated_emails(self):
        emails = EmailAddress.objects.filter(email=self.email)
        return emails

    def get_profile_pic(self):
        #print(get_media_url(self.profile_pic))
        return get_media_url(self.profile_pic)

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def is_company(self):
        """
        Returns True if the user has an associated company profile
        and user_type is Company
        """
        try:
            company_profile = self.company
        except CustomUser.company.RelatedObjectDoesNotExist:
            return False
        return self.user_type == CustomUser.USER_TYPE.COMPANY_REP

    def is_talent(self):
        """
        Returns True if the user has an associated talent profile
        and user_type is Talent
        """
        try:
            talent_profile = self.profile
        except CustomUser.profile.RelatedObjectDoesNotExist:
            return False
        return self.user_type == CustomUser.USER_TYPE.TALENT

    def is_subscribed(self):
        # TODO: check if a user subscription is currently active
        if not self.get_subscribed_plan():
            return False
        return True

    def get_subscribed_plan(self):
        try:
            sub_plan = self.subscription.sub_plan
        except CustomUser.subscription.RelatedObjectDoesNotExist:
            sub_plan = None

        return sub_plan


class TalentProfile(models.Model):
    """Talent Profile Model"""

    class GENDER_TYPE(models.TextChoices):
        FEMALE = "F", _("FEMALE")
        MALE = "M", _("MALE")

    user = models.OneToOneField(
        CustomUser, related_name="profile", on_delete=models.CASCADE
    )
    full_name = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_TYPE.choices, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    experience_level = models.CharField(max_length=200, blank=True)
    role = models.ForeignKey(
        Role,
        related_name="talent_profiles",
        null=True,
        on_delete=models.SET_NULL,
    )
    referral_code = models.CharField(max_length=6, blank=True, null=True)
    referred_by = models.ForeignKey(
        "self", blank=True, null=True, on_delete=models.SET_NULL
    )
    portfolio = models.URLField(blank=True)
    resume = models.FileField(
        upload_to="resumes/%Y/%m/%d/",
        null=True,
        blank=True,
    )
    bank_name = models.CharField(max_length=100, blank=True, default="")
    account_name = models.CharField(max_length=255, blank=True, default="")
    account_number = models.CharField(max_length=255, blank=True, default="")
    recipient_code = models.CharField(max_length=255, blank=True, default="", null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    has_passed_tiaago_assessment = models.BooleanField(
        default=False,
        help_text="Boolean field to denote whether the user has taken a tiaago assessment and passed it",
    )
    social_media_links = models.ManyToManyField("SocialMediaLink", blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.user.username

    def get_first_name(self):
        first_name = self.full_name.split("")[0]
        return first_name

    def get_last_name(self):
        last_name = self.full_name.split(" ")[0]
        return last_name
    
    @property
    def portfolio_slug_safe(self):
        portfolio_object = getattr(self, "portfolio_object", None)
        return portfolio_object.slug if portfolio_object else None

class Company(models.Model):
    """Company Model"""

    class SIZE_CHOICES(models.TextChoices):
        SIZE10 = (
            "1-10",
            _("1-10"),
        )
        SIZE50 = (
            "11-50",
            _("11-50"),
        )
        SIZE200 = (
            "51-200",
            _("51-200"),
        )
        SIZE500 = (
            "201-500",
            _("201-500"),
        )
        SIZE1000 = (
            "501-1000",
            _("501-1000"),
        )
        SIZE5000 = (
            "1001-5000",
            _("1001-5000"),
        )
        SIZE10000 = (
            "5001-10000",
            _("5001-10000"),
        )
        SIZE10000PLUS = (
            "10000+",
            _("10000+"),
        )

    company_rep = models.OneToOneField(
        settings.AUTH_USER_MODEL, related_name="company", on_delete=models.CASCADE
    )
    company_name = models.CharField(max_length=255, blank=True)
    company_email = models.CharField(max_length=50)
    country = models.CharField(max_length=100, null=True, blank=True)
    logo = models.ImageField(upload_to="company_logos/%Y/%m/%d/")
    role = models.ForeignKey(
        Role,
        related_name="company_profiles",
        null=True,
        on_delete=models.SET_NULL,
    )
    website = models.URLField(max_length=255, null=True, blank=True)
    address = models.TextField(max_length=500, blank=True)
    size = models.CharField(
        max_length=20, choices=SIZE_CHOICES.choices, default=SIZE_CHOICES.SIZE10, null=True, blank=True
    )
    pay_range = models.CharField(max_length=25, blank=True, default="")

    # Post-signup onboarding cards (collected after OTP verification)
    class ACCOUNT_TYPE(models.TextChoices):
        IN_HOUSE = "in-house", _("In-house recruiter")
        AGENCY = "agency", _("Recruiting agency")
        HIRING_COMPANY = "hiring-company", _("Hiring company / startup")
        INDEPENDENT = "independent", _("Independent recruiter")

    account_type = models.CharField(
        max_length=20, choices=ACCOUNT_TYPE.choices, blank=True, default=""
    )
    industry = models.CharField(max_length=100, blank=True, default="")
    heard_from = models.CharField(max_length=100, blank=True, default="")
    heard_from_other = models.CharField(max_length=255, blank=True, default="")
    onboarding_notes = models.TextField(max_length=1000, blank=True, default="")
    # Null means the company rep has not finished the onboarding cards yet;
    # existing companies are backfilled as completed by migration.
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    # "Skip for now" defers onboarding: the dashboard stops force-redirecting
    # but shows a finish-setup banner until onboarding_completed_at is set.
    onboarding_skipped_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name_plural = "companies"

    def __str__(self):
        return self.company_name + " " + self.company_rep.country

    def get_logo_url(self):
        if self.logo:
            return self.logo
        return None

    def save(self, *args, **kwargs):
        # populate company_email from the linked user's email
        self.company_email = self.company_rep.email
        super().save(*args, **kwargs)
    
    @property
    def active_subscription(self):
        # Get active subscription for stripe
        stripe_sub = self.stripe_subscription.filter(status="active").order_by('-started_at').first()
        if stripe_sub:
            return stripe_sub
        
        # Get active subscription for paystack
        paystack_sub = self.paystack_subscriptions.filter(status="active").order_by('-started_at').first()
        if paystack_sub:
            return paystack_sub
        
        # Get free plan if no active subscription found
        return getattr(self, 'free_usage', None)


# Company Teams: These models are to handle company memebers and invite
class CompanyTeamMember(models.Model):
    class ROLE(models.TextChoices):
        ADMIN = "admin", "Admin"
        RECRUITER = "recruiter", "Recruiter"
        VIEWER = "viewer", "Viewer"

    company = models.ForeignKey(Company, related_name="team", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="company_memberships", on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE.choices, default=ROLE.VIEWER)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="invited_members", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("company", "user")

    def __str__(self):
        return f"{self.user.get_full_name()} @ {self.company.company_name} ({self.role})"


class CompanyTeamInvite(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REVOKED = "revoked"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REVOKED, "Revoked"),
    ]

    company = models.ForeignKey(Company, related_name="team_invites", on_delete=models.CASCADE)
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=CompanyTeamMember.ROLE.choices, default=CompanyTeamMember.ROLE.VIEWER)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="sent_team_invites", on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = (("company", "email"),)
        
    def __str__(self):
        return f"invite {self.email} -> {self.company.company_name} ({self.role})"
    

    @property
    def is_expired(self):
        return self.created_at < timezone.now() - timezone.timedelta(days=5)
    

    def mark_accepted(self):
        self.status = self.STATUS_ACCEPTED
        self.save(update_fields=["status", "updated_at"])

    def mark_revoked(self):
        self.status = self.STATUS_REVOKED
        # fix: update_fields should reference "status"
        self.save(update_fields=["status", "updated_at"])






class OneTimePassword(models.Model):
    MAX_ATTEMPTS = 5

    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name="otp"
    )
    # Not globally unique: codes are short and only need to be unique per
    # user, which the OneToOne on user already guarantees.
    code = models.CharField(max_length=6)
    otp_expires = models.DateTimeField(blank=True, null=True)
    # Wrong guesses so far; the OTP is invalidated at MAX_ATTEMPTS.
    attempts = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"{self.user.first_name}-passcode"

class SocialMediaLink(TimeStampedModel):
    name = models.CharField(max_length=40)
    url = models.URLField(max_length=400)

    def __str__(self):
        return f"{self.name} - {self.url}"


class Referral(models.Model):
    inviter = models.ForeignKey(
        TalentProfile, related_name="inviter", on_delete=models.CASCADE
    )
    invitee = models.ForeignKey(
        CustomUser, related_name="invitee", on_delete=models.CASCADE
    )
    invitee_email = models.EmailField(unique=True)
    date_invited = models.DateField()
    reward = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    has_received_reward = models.BooleanField(default=False)
    reward_transaction = models.ForeignKey('payments.WalletTransaction', related_name="referral_reward", on_delete=models.SET_NULL, null=True, blank=True)
    date_rewarded = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.invitee.get_full_name()} referred by {self.inviter.full_name}"
    

class ReferralWallet(models.Model):
    talent = models.OneToOneField(
        TalentProfile, related_name="referral_wallet", on_delete=models.CASCADE
    )
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_withdrawn = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(balance__gte=0),
                name='referral_wallet_non_negative_balance'
            ),
            models.CheckConstraint(
                check=models.Q(total_earned__gte=0),
                name='referral_wallet_non_negative_earned'
            ),
            models.CheckConstraint(
                check=models.Q(total_withdrawn__gte=0),
                name='referral_wallet_non_negative_withdrawn'
            )
        ]

    def __str__(self):
        return f"{self.talent.full_name} - ₦{self.balance}"
    
    def clean(self):
        if self.balance < 0:
            raise ValidationError("Balance cannot be negative")
        if self.total_earned < 0:
            raise ValidationError("Total earned cannot be negative")
        if self.total_withdrawn < 0:
            raise ValidationError("Total withdrawn cannot be negative")
        if self.total_withdrawn > self.total_earned:
            raise ValidationError("Cannot withdraw more than total earned")
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def can_withdraw(self, amount):
        """Check if user has sufficient balance"""
        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
        if amount <= 0:
            raise ValidationError("Withdrawal amount must be positive")
        return self.balance >= amount
    
    @transaction.atomic
    def add_reward(self, amount):
        """Add referral reward to wallet with validation"""
        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
        if amount <= 0:
            raise ValidationError("Reward amount must be positive")
            
        self.balance += amount
        self.total_earned += amount
        self.save()
        return True

    @transaction.atomic
    def deduct_withdrawal(self, amount):
        """Safely deduct amount for withdrawal with validation"""
        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
        if amount <= 0:
            raise ValidationError("Withdrawal amount must be positive")
            
        if not self.can_withdraw(amount):
            raise ValidationError(f"Insufficient balance. Available: ₦{self.balance}")
            
        self.balance -= amount
        self.total_withdrawn += amount
        self.save()
        return True
    


class WithdrawalRequest(models.Model):
    """Track withdrawal requests"""
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    MINIMUM_WITHDRAWAL = Decimal('1000.00')  
    MAXIMUM_WITHDRAWAL = Decimal('100000.00')  

    talent = models.ForeignKey(
        TalentProfile, related_name="withdrawal_requests", on_delete=models.CASCADE)
    referral_wallet = models.ForeignKey(
        ReferralWallet, related_name="withdrawal_requests", on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )

    reference = models.CharField(max_length=255, unique=True, editable=False)
    transfer_code = models.CharField(max_length=255, blank=True, null=True)
    failure_reason = models.TextField(blank=True, null=True)

    #Admin approval fields
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="approved_withdrawals",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    approved_at = models.DateTimeField(null=True, blank=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def clean(self):
        if self.amount < self.MINIMUM_WITHDRAWAL:
            raise ValidationError(f"Minimum withdrawal amount is ₦{self.MINIMUM_WITHDRAWAL}")
        if self.amount > self.MAXIMUM_WITHDRAWAL:
            raise ValidationError(f"Maximum withdrawal amount is ₦{self.MAXIMUM_WITHDRAWAL}")
        if self.fee < 0:
            raise ValidationError("Fee cannot be negative")
        if not self.net_amount:
            self.net_amount = self.amount - self.fee
        if self.net_amount <= 0:
            raise ValidationError("Net amount must be positive")
        
        # Validate wallet balance
       # if self.referral_wallet and not self.referral_wallet.can_withdraw(self.amount):
        #    raise ValidationError(f"Insufficient balance. Available: ₦{self.referral_wallet.balance}")
        
        # Validate status transitions
        if self.pk:  # If this is an existing instance
            old_instance = WithdrawalRequest.objects.get(pk=self.pk)
            if old_instance.status != self.status:
                self._validate_status_transition(old_instance.status, self.status)

    def _validate_status_transition(self, old_status, new_status):
        """Validate withdrawal status transitions"""
        valid_transitions = {
            'pending': ['processing', 'cancelled', 'failed'],
            'processing': ['completed', 'failed'],
            'completed': [], 
            'failed': [],  
            'cancelled': [], 
        }
        
        if new_status not in valid_transitions.get(old_status, []):
            raise ValidationError(f"Invalid status transition from {old_status} to {new_status}")

    @property
    def is_active(self):
        """Check if the withdrawal is still active"""
        return self.status in ['pending', 'processing']

    def approve(self, admin_user):
        """Approve the withdrawal request"""
        if self.status != 'pending':
            raise ValidationError("Only pending withdrawals can be approved")
        
        # validate wallet balance before approving
        if not self.referral_wallet.can_withdraw(self.amount):
            available = self.referral_wallet.balance
            raise ValidationError({"detail": f"Insufficient balance to approve withdrawal. Available: ₦{available}"})
        
        # Proceed to deduct the amount from wallet
        self.status = 'processing'
        self.approved_by = admin_user
        self.approved_at = timezone.now()
        self.save()

    def complete(self, transfer_code=None):
        """Mark the withdrawal as completed"""
        if self.status != 'processing':
            raise ValidationError("Only processing withdrawals can be completed")
        self.status = 'completed'
        self.completed_at = timezone.now()
        if transfer_code:
            self.transfer_code = transfer_code
        self.save()

    def fail(self, reason):
        """Mark the withdrawal as failed"""
        if self.status in ['completed', 'failed', 'cancelled']:
            raise ValidationError(f"Cannot fail a withdrawal with status: {self.status}")
        self.status = 'failed'
        self.failure_reason = reason
        self.save()

        # Refund the amount to wallet
        if self.referral_wallet:
            self.referral_wallet.add_reward(self.amount)

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"WDR-{uuid.uuid4().hex[:12].upper()}"
        if not self.net_amount:
            self.net_amount = self.amount - self.fee
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-date_created']

    def __str__(self):
        return f"{self.talent.user.get_full_name()} - ₦{self.amount} ({self.status})"

