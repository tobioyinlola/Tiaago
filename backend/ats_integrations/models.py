from django.db import models

from base.models import TimeStampedModel
from create_user.models import Company


class AtsProvider(models.TextChoices):
    """Values here must exactly equal the Nango integration's Unique Key
    (aka provider_config_key) -- Nango's default naming appends an
    auth-type suffix whenever a provider has multiple auth variants (e.g.
    "lever-basic" vs a hypothetical OAuth one), so these aren't always the
    bare provider slug. See ats_integrations.nango_client and each
    providers/*.py module's PROVIDER_CONFIG_KEY, which must match too."""

    GREENHOUSE = "greenhouse", "Greenhouse"
    LEVER = "lever-basic", "Lever"
    WORKABLE = "workable", "Workable"
    SMARTRECRUITERS = "smartrecruiters-api-key", "SmartRecruiters"
    ZOHO_RECRUIT = "zoho-recruit", "Zoho Recruit"
    ASHBY = "ashby", "Ashby"
    GEM = "gem", "Gem"
    BREEZY_HR = "breezy-hr", "Breezy HR"
    JAZZHR = "jazzhr", "JazzHR"
    JOBVITE = "jobvite", "Jobvite"
    RECRUITERFLOW = "recruiterflow", "Recruiterflow"
    RECRUITEE = "recruitee", "Recruitee"
    TEAMTAILOR = "teamtailor", "Teamtailor"


class AtsConnection(TimeStampedModel):
    """One connect -> pull -> disconnect cycle for a company's ATS.

    We're on Nango's free tier, which caps concurrent connections, so a
    connection is never left alive longer than a single sync: the Nango
    connection is deleted as soon as AtsSyncService finishes successfully
    (see tasks.run_ats_sync). If a sync fails partway, nango_connection_id
    is deliberately left populated so the same connection can be retried
    without the recruiter re-authorizing.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"  # session token issued, not yet authorized
        CONNECTED = "CONNECTED", "Connected"  # Nango auth done, sync not yet run
        SYNCING = "SYNCING", "Syncing"
        SYNCED = "SYNCED", "Synced"  # pulled + disconnected successfully
        FAILED = "FAILED", "Failed"  # sync failed partway -- connection intentionally left intact

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="ats_connections")
    provider = models.CharField(max_length=30, choices=AtsProvider.choices)
    nango_connection_id = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    candidates_synced = models.PositiveIntegerField(default=0)
    jobs_synced = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    connected_at = models.DateTimeField(null=True, blank=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.company_id}:{self.provider}:{self.status}"


class AtsCandidate(TimeStampedModel):
    """A candidate normalized from a connected ATS into our own schema --
    see ats_integrations.providers.base.NormalizedCandidate for the shared
    shape every provider's raw response gets mapped into."""

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="ats_candidates")
    provider = models.CharField(max_length=30, choices=AtsProvider.choices)
    external_id = models.CharField(max_length=255, help_text="The candidate's ID in the source ATS")
    first_name = models.CharField(max_length=255, blank=True, default="")
    last_name = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    resume_url = models.URLField(blank=True, default="", max_length=1000)
    stage = models.CharField(max_length=255, blank=True, default="", help_text="Current pipeline stage/status in the ATS")
    source = models.CharField(max_length=255, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    ats_job_external_ids = models.JSONField(default=list, blank=True, help_text="External job IDs this candidate applied to, if known")
    location = models.CharField(max_length=255, blank=True, default="")
    linkedin_url = models.URLField(blank=True, default="", max_length=500)
    portfolio_urls = models.JSONField(default=list, blank=True, help_text="Other links from the candidate's profile (GitHub, personal site, Twitter, etc.)")
    current_title = models.CharField(max_length=255, blank=True, default="")
    current_company = models.CharField(max_length=255, blank=True, default="")
    cover_letter = models.TextField(blank=True, default="")
    education = models.JSONField(default=list, blank=True, help_text="[{school, degree, field, start_date, end_date}]")
    work_experience = models.JSONField(default=list, blank=True, help_text="[{company, title, start_date, end_date}]")
    application_answers = models.JSONField(default=list, blank=True, help_text="Custom screening-question responses, [{question, answer}], where the ATS exposes them")
    ats_created_at = models.DateTimeField(null=True, blank=True)
    raw_data = models.JSONField(default=dict, blank=True, help_text="Original ATS payload, kept for debugging and future re-mapping")
    last_synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["company", "provider", "external_id"], name="unique_ats_candidate_per_company")
        ]
        indexes = [models.Index(fields=["company", "provider"])]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.provider})".strip()


class AtsJob(TimeStampedModel):
    """Normalized job pulled from a connected ATS.

    Deliberately carries the fields a future "push to job boards" feature
    will need (salary range, external ATS job id) so that feature's schema
    doesn't need rework -- see task step 7 in the ATS integration spec.
    """

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"
        DRAFT = "DRAFT", "Draft"
        UNKNOWN = "UNKNOWN", "Unknown"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="ats_jobs")
    provider = models.CharField(max_length=30, choices=AtsProvider.choices)
    external_id = models.CharField(max_length=255, help_text="The job's ID in the source ATS")
    title = models.CharField(max_length=500, blank=True, default="")
    description = models.TextField(blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    department = models.CharField(max_length=255, blank=True, default="")
    employment_type = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNKNOWN)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=10, blank=True, default="")
    ats_created_at = models.DateTimeField(null=True, blank=True)
    raw_data = models.JSONField(default=dict, blank=True, help_text="Original ATS payload, kept for debugging and future re-mapping")
    last_synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["company", "provider", "external_id"], name="unique_ats_job_per_company")
        ]
        indexes = [models.Index(fields=["company", "provider"])]

    def __str__(self):
        return f"{self.title} ({self.provider})"
