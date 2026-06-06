import pycountry
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils.translation import gettext_lazy as _
from base.models import TimeStampedModel
from create_user.models import Company, TalentProfile
from jobs.constants import MANUALLY, WITH_AI
from roles.models import Role
from uuid import uuid4
from django.utils import timezone
from django.conf import settings


def get_location_options():
    nigeria = pycountry.countries.get(name="Nigeria")
    states_in_nigeria = [
        sub.name
        for sub in pycountry.subdivisions
        if sub.country_code == nigeria.alpha_2
    ]
    location_options = []
    for i in states_in_nigeria:
        location_options.append((i, i))
    return tuple(location_options)


#class ScreeningFeeCurrencies(models.TextChoices):
#    USD = "USD", "USD"
#    NAIRA = "NGN", "NGN"


class JobManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(job_status="ACTIVE")


class Job(models.Model):
    """Job Model"""

    class SalaryDuration(models.TextChoices):
        PER_HOUR = "PH", _("Per Hour")
        PER_MONTH = "PM", _("Per Month")
        CONTRACT = "CT", _("Contract")

    class JobType(models.TextChoices):
        FULL_TIME = "FT", _("Full time")
        PART_TIME = "PT", _("Part time")
        CONTRACT = "CW", _("Contract Work")
        INTERNSHIP = "IN", _("Internship")

    class JobStatus(models.TextChoices):
        ACTIVE = "ACTIVE", _("Active")  # Job application is still being accepted
        ON_HOLD = "ON_HOLD", _(
            "On hold"
        )  # The application or hiring process has been put on hold temporarily.
        HIRED = "HIRED", _("Hired")  # A candidate has been hired for the job
        EXPIRED = "EXPIRED", _(
            "Expired"
        )  # The job posting has expired, and no further applications are being accepted.

    class JobLevel(models.TextChoices):
        ENTRY = "ENTRY", _("Entry")
        JUNIOR = "JUNIOR", _("Junior")
        SENIOR = "SENIOR", _("Senior")

    class PaymentCurrency(models.TextChoices):
        USD = "USD", _("Dollar")
        NGN = "NGN", _("Naira")

    class DollarPaymentRange(models.TextChoices):
        RANGE_50_200 = "50-200", _("$50-$200")
        RANGE_200_500 = "200-500", _("$200-$500")
        RANGE_600_1000 = "600-1000", _("$600-$1000")
        RANGE_1100_1500 = "1100-1500", _("$1100-$1500")
        RANGE_1600_ABOVE = "1600-above", _("$1600 and above")

    class NairaPaymentRange(models.TextChoices):
         RANGE_50K_100K = "50000-100000", _("₦50,000 - ₦100,000")
         RANGE_150K_250K = "150000-250000", _("₦150,000 - ₦250,000")
         RANGE_300K_500K = "300000-500000", _("₦300,000 - ₦500,000")
         RANGE_500K_ABOVE = "500000-above", _("₦500,000 and above")



    HIRING_TYPES = ((MANUALLY, MANUALLY), (WITH_AI, WITH_AI))

    # Title will be dropdown from job roles (using role field)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="jobs")
    #tags = models.JSONField(blank=True, default=list, help_text="Optional tags for categorizing the job")

    
    # Job type dropdown
    job_type = models.CharField(max_length=2, choices=JobType.choices)
    
    # Job level dropdown
    job_level = models.CharField(max_length=6, choices=JobLevel.choices, default=JobLevel.ENTRY)
    
    # Location dropdown (Remote or Country)
    location = models.CharField(max_length=100, help_text="Remote or specific country", default="Remote")
    
    # Minimum experience dropdown (0-10 years)
    experience = models.PositiveIntegerField(help_text="Years of experience required (0-10)")
    
    # Payment type dropdown
    salary_duration = models.CharField(
        max_length=2, choices=SalaryDuration.choices, default=SalaryDuration.PER_MONTH
    )
    
    # Payment range dropdown (Currency + Range)
    #currency = models.CharField(max_length=3, choices=ScreeningFeeCurrencies.choices, default=ScreeningFeeCurrencies.USD)
    payment_currency = models.CharField(max_length=3, choices=PaymentCurrency.choices, default=PaymentCurrency.USD,)
    payment_range_usd = models.CharField(max_length=20, choices=DollarPaymentRange.choices, blank=True, null=True,)
    payment_range_ngn = models.CharField(max_length=20, choices=NairaPaymentRange.choices, blank=True, null=True,)
    
    # About company textfield
    about_company = models.TextField(max_length=5000, blank=True, default="")
    
    # Job requirement textfield
    job_requirement = models.TextField(max_length=5000, blank=True, default="")
    
    # Job description textfield
    description = models.TextField(max_length=7000, default="", blank=True)
    
    # Hiring process dropdown
    hiring_type = models.CharField(
        choices=HIRING_TYPES, default=WITH_AI, max_length=40
    )
    
    # Status and metadata
    job_status = models.CharField(
        max_length=10, choices=JobStatus.choices, default=JobStatus.ACTIVE
    )
    date_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    company = models.ForeignKey(Company, related_name="jobs", on_delete=models.CASCADE)
    objects = models.Manager()
    approved = JobManager()

    no_of_applications = models.PositiveIntegerField(default=0, help_text="Number of applications for this job")

    apply_token = models.UUIDField(default=uuid4, editable=False)
    external_apply_token_expires = models.DateTimeField(null=True, blank=True)
    external_skip_verification = models.BooleanField(default=False)
    

    class Meta:
        indexes = [
            models.Index(fields=["role", "company"]),
        ]
        ordering = ("-date_created",)

    def __str__(self):
        return f"{self.role.title if self.role else 'Unknown Role'} - {self.job_type}"

    def get_apply_url(self):
        return f"{settings.FRONTEND_URL}/jobs/{self.apply_token}/apply"
    
    def get_detail_url(self):
        return f"{settings.FRONTEND_URL}/jobs/{self.apply_token}"

    
    @property
    def is_open(self):
        if self.job_status != self.JobStatus.ACTIVE:
            return False
        return True
    
    @property
    def title(self):
        return self.role.title if self.role else "Unknown Role"

    @property
    def hires_with_ai(self):
        return self.hiring_type == WITH_AI
    
    def get_display_payment_range(self):
        if self.payment_currency == self.PaymentCurrency.USD:
            # Get the display value from DollarPaymentRange choices
            if self.payment_range_usd:
                return dict(self.DollarPaymentRange.choices)[self.payment_range_usd]
        elif self.payment_currency == self.PaymentCurrency.NGN:
            # Get the display value from NairaPaymentRange choices
            if self.payment_range_ngn:
                return dict(self.NairaPaymentRange.choices)[self.payment_range_ngn]
        return ""


class JobApplication(models.Model):
    """Job Application Model"""

    class JobApplicationStatus(models.TextChoices):
        APPLIED = "APPLIED", _(
            "Applied"
        )  # The candidate has submitted their application for the job.
        REVIEWED = "REVIEWED", _(
            "Reviewed"
        )  # The application has been reviewed by the hiring team or recruiters.
        INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED", _(
            "Interview scheduled"
        )  # The candidate has been shortlisted for further consideration or interviews.
        PENDING_DECISION = "PENDING_DECISION", _(
            "Pending decision"
        )  # The hiring team is deliberating on the candidate's application or interview performance
        OFFER_EXTENDED = "OFFER_EXTENDED", _(
            "Offer extended"
        )  # The candidate has been offered the job
        OFFER_ACCEPTED = "OFFER_ACCEPTED", _(
            "Offer accepted"
        )  # The candidate has accepted the job offer.
        OFFER_DECLINED = "OFFER_DECLINED", _(
            "Offer declined"
        )  # The candidate has declined the job offer.
        REJECTED = "REJECTED", _(
            "Rejected"
        )  # The candidate's application has been rejected for this particular position.
        WITHDRAWN = "WITHDRAWN", _(
            "Withdrawn"
        )  # The candidate has withdrawn their application

    applicant = models.ForeignKey(
        TalentProfile, on_delete=models.CASCADE, related_name="applicants"
    )
    job = models.ForeignKey(
        Job, on_delete=models.CASCADE, related_name="job_applications"
    )
    applied_date = models.DateTimeField(auto_now_add=True)
    cover_letter = models.TextField(max_length=3000, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=JobApplicationStatus.choices,
        default=JobApplicationStatus.APPLIED,
    )

    was_verified_at_application = models.BooleanField(
        default=False,
        help_text="Tracks whether applicant was verified when they applied")

    is_external_application = models.BooleanField(
        default=False,
        help_text="Whether this application was submitted via external link")

    verification_prompted = models.BooleanField(
        default=False,
        help_text="Whether verification was prompted for this application")

    verification_completed = models.BooleanField(
        default=False,
        help_text="Whether verification was completed for this application")

    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

   

    def save(self, *args, **kwargs):
        if not self.pk:
            self.was_verified_at_application = self.applicant.user.is_verified
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.applicant} applied for {self.job}"


class Tool(TimeStampedModel):

    def upload_icon_to(instance, filename):
        return "/".join(["tools", "icons", filename])

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=200)
    icon = models.ImageField(blank=True, null=True, upload_to=upload_icon_to)

    def __str__(self):
        return self.name


class Portfolio(TimeStampedModel):
    """Portfolio model"""

    def upload_banner_to(instance, filename):
        talent_name = instance.talent.full_name if instance.talent.full_name else (
            instance.talent.user.username if instance.talent.user.username else "unknown"
        )
        talent_name = "".join(c for c in talent_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        talent_name = talent_name.replace(' ', '_')
        return "/".join(["portfolios", talent_name, "banners", filename])

    slug = models.SlugField(max_length=400, blank=True, null=True, unique=True)
    banner = models.ImageField(blank=True, null=True, upload_to=upload_banner_to)
    about = models.TextField(blank=True, null=True)
    talent = models.OneToOneField(
        TalentProfile,
        null=False,
        blank=False,
        on_delete=models.CASCADE,
        related_name="portfolio_object",
    )
    project_links = models.JSONField(default=list, blank=True, null=True)
    tools = models.ManyToManyField(Tool, blank=True)
    role = models.ForeignKey('roles.Role', on_delete=models.SET_NULL, null=True, blank=True, related_name='portfolios')

    @property
    def experience(self):
        return self.experience_set.all()

    @property
    def certifications(self):
        return self.certification_set.all()

    @property
    def education(self):
        return self.education_set.all()

    def save(self, *args, **kwargs):
        if not self.slug and self.talent.user.username:
            self.slug = self.talent.user.username
        super().save(*args, **kwargs)


class Experience(TimeStampedModel):

    class EmploymentType(models.TextChoices):
        FULL_TIME = "FT", _("Full time")
        PART_TIME = "PT", _("Part time")
        CONTRACT = "CW", _("Contract Work")
        INTERNSHIP = "IN", _("Internship")

    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE)
    title = models.CharField(max_length=252)
    company_name = models.CharField(max_length=200, default="")
    company_logo = models.ImageField(blank=True, null=True)
    company_logo_url = models.URLField(blank=True, null=True) 
    employment_type = models.CharField(
        max_length=200, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME
    )
    start_date = models.DateField(blank=False, null=False)
    end_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"Experience: {self.portfolio.talent.user} - {self.title} {self.start_date} - {self.end_date}"


class Education(TimeStampedModel):
    portfolio = models.ForeignKey(
        Portfolio, on_delete=models.CASCADE, blank=False, null=False
    )
    school = models.CharField(max_length=400, default="")
    program = models.CharField(max_length=200, default="")
    degree = models.CharField(max_length=200, default="")
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return f"Education: {self.portfolio.talent.user} - {self.school} {self.start_date} - {self.end_date}"


class Certification(TimeStampedModel):
    options = (
        ("Mid-level", "Mid-level"),
        ("Senior-level", "Senior-level"),
        ("Beginner-level", "Beginner-level"),
    )
    portfolio = models.ForeignKey(
        Portfolio, on_delete=models.CASCADE, blank=False, null=False
    )
    certificate = models.ImageField(upload_to="certificate/")
    title = models.CharField(max_length=255)
    skill_level = models.CharField(choices=options, max_length=255)
    issued_by = models.CharField(max_length=255)

    def __str__(self):
        return f"Certification: {self.portfolio.talent.user} - {self.title} {self.skill_level} - {self.issued_by}"




class TalentScreening(TimeStampedModel):
    """Talent Screening model. Used to track talent screenings so that the PAYG model can work"""

    job_application = models.ForeignKey(JobApplication, on_delete=models.CASCADE)
    is_paid_screening = models.BooleanField(
        default=False,
        help_text="Is this talent screening going to be paid for by the company ?",
    )

    @property
    def has_been_completed(self):
        return all(
            [
                hasattr(self, "resume_screening"),
                hasattr(self, "skill_assessment_screening"),
            ]
        )

    @property
    def total_fee(self):
        total = 0

    def __str__(self):
        return f"Talent Screening: {self.job_application.job.title} - {self.job_application.applicant.user.username}"


class CandidateResumeScreening(TimeStampedModel):
    talent_screening = models.OneToOneField(
        TalentScreening, on_delete=models.CASCADE, related_name="resume_screening"
    )
    fee_note = models.CharField(max_length=500)
    fee = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    resume_analysis = models.OneToOneField(
        "skill_assessment.ResumeAnalysis",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    is_paid = models.BooleanField(default=False, help_text="Has this been paid for ?")

    @property
    def requires_payment(self):
        return self.talent_screening.is_paid_screening

    @property
    def is_pending_payment(self):
        return not self.is_paid and self.requires_payment
    
    def __str__(self):
        return f"Candidate Resume Screening: {self.talent_screening.job_application.job.title} - {self.talent_screening.job_application.applicant.user.username}"


class SkillAssessmentScreening(TimeStampedModel):
    talent_screening = models.OneToOneField(
        TalentScreening,
        on_delete=models.CASCADE,
        related_name="skill_assessment_screening",
    )
    fee_note = models.CharField(max_length=500)
    fee = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    skill_assessment = models.OneToOneField(
        "skill_assessment.GeneralSkillAssessment",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    skill_assessment_submission = models.OneToOneField(
        "skill_assessment.CandidateAssessmentSubmission",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    is_paid = models.BooleanField(default=False, help_text="Has this been paid for ?")

    @property
    def requires_payment(self):
        return self.talent_screening.is_paid_screening

    @property
    def is_pending_payment(self):
        return not self.is_paid and self.requires_payment


class InterviewScreening(TimeStampedModel):
    talent_screening = models.OneToOneField(
        TalentScreening, on_delete=models.CASCADE, related_name="interview_screening"
    )
    fee_note = models.CharField(max_length=500)
    fee = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    meeting = models.OneToOneField(
        "scheduler.Scheduler",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    is_paid = models.BooleanField(default=False, help_text="Has this been paid for ?")

    @property
    def requires_payment(self):
        return self.talent_screening.is_paid_screening

    @property
    def is_pending_payment(self):
        return not self.is_paid and self.requires_payment


class Project(models.Model):
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    image = models.URLField(blank=True, null=True)
    link = models.URLField()

    def __str__(self):
        return f"{self.name} ({self.link})"
