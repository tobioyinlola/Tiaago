from django.contrib.auth import get_user_model
from django.test import TestCase

from create_user.models import Company, TalentProfile
from jobs.models import Job, JobApplication
from subscriptions.billing_service import (
    BillingService,
    _pause_company_jobs_for_wallet_exhaustion,
    _resume_company_jobs_after_wallet_topup,
    get_or_create_wallet,
)

User = get_user_model()


def _make_company(email="recruiter@acme.dev"):
    user = User.objects.create_user(
        username=email, email=email, password="testpass123", user_type="CR",
    )
    return Company.objects.create(company_rep=user, company_name="Acme", company_email=email)


def _make_job(company, role="Backend Engineer", status=Job.JobStatus.ACTIVE):
    return Job.objects.create(
        company=company, role=role, job_type=Job.JobType.FULL_TIME, job_status=status,
    )


class WalletExhaustionPauseResumeTests(TestCase):
    """Covers the wallet-exhaustion job-pause mechanism added in
    subscriptions.billing_service -- pauses every ACTIVE job for a company
    the moment a resume-screening/assessment charge can't be covered, and
    auto-resumes only the jobs it paused once the wallet is topped up."""

    def setUp(self):
        self.company = _make_company()
        self.wallet = get_or_create_wallet(self.company)
        # get_or_create_wallet grants free credits by default -- zero them out
        # so charges hit the real balance (0.00) and land on insufficient_funds.
        self.wallet.free_credits_remaining = 0
        self.wallet.save(update_fields=["free_credits_remaining"])

    def test_pause_flips_all_active_jobs_and_is_idempotent(self):
        job1 = _make_job(self.company)
        job2 = _make_job(self.company, role="Data Analyst")
        manually_held = _make_job(self.company, role="Designer", status=Job.JobStatus.ON_HOLD)

        _pause_company_jobs_for_wallet_exhaustion(self.company)

        job1.refresh_from_db()
        job2.refresh_from_db()
        manually_held.refresh_from_db()

        self.assertEqual(job1.job_status, Job.JobStatus.ON_HOLD)
        self.assertTrue(job1.paused_for_billing)
        self.assertIsNotNone(job1.billing_paused_at)
        self.assertEqual(job2.job_status, Job.JobStatus.ON_HOLD)
        self.assertTrue(job2.paused_for_billing)

        # A recruiter's own manual hold must never be touched or relabelled
        # as billing-paused.
        self.assertEqual(manually_held.job_status, Job.JobStatus.ON_HOLD)
        self.assertFalse(manually_held.paused_for_billing)

        # Repeat call: nothing ACTIVE is left, so it's a no-op -- doesn't
        # re-stamp billing_paused_at or error out.
        first_paused_at = job1.billing_paused_at
        _pause_company_jobs_for_wallet_exhaustion(self.company)
        job1.refresh_from_db()
        self.assertEqual(job1.billing_paused_at, first_paused_at)

    def test_resume_only_reactivates_jobs_paused_for_billing(self):
        auto_paused = _make_job(self.company, status=Job.JobStatus.ON_HOLD)
        auto_paused.paused_for_billing = True
        auto_paused.save(update_fields=["paused_for_billing"])

        manually_held = _make_job(self.company, role="Designer", status=Job.JobStatus.ON_HOLD)

        _resume_company_jobs_after_wallet_topup(self.company)

        auto_paused.refresh_from_db()
        manually_held.refresh_from_db()

        self.assertEqual(auto_paused.job_status, Job.JobStatus.ACTIVE)
        self.assertFalse(auto_paused.paused_for_billing)
        self.assertIsNone(auto_paused.billing_paused_at)

        # Manual hold is untouched by the wallet top-up.
        self.assertEqual(manually_held.job_status, Job.JobStatus.ON_HOLD)
        self.assertFalse(manually_held.paused_for_billing)

    def test_resume_is_a_noop_when_nothing_was_billing_paused(self):
        # Should not raise even with zero paused jobs.
        _resume_company_jobs_after_wallet_topup(self.company)

    def _make_application(self):
        job = _make_job(self.company)
        talent_user = User.objects.create_user(
            username="candidate@example.com", email="candidate@example.com",
            password="testpass123", user_type="T",
        )
        talent_profile = TalentProfile.objects.create(user=talent_user, full_name="Candidate One")
        application = JobApplication.objects.create(applicant=talent_profile, job=job)
        return job, application

    def test_resume_screening_insufficient_funds_pauses_company_jobs(self):
        job, application = self._make_application()
        other_job = _make_job(self.company, role="Data Analyst")

        result = BillingService.process_resume_candidate_screening(application)

        self.assertEqual(result["reason"], "insufficient_funds")

        job.refresh_from_db()
        other_job.refresh_from_db()
        self.assertEqual(job.job_status, Job.JobStatus.ON_HOLD)
        self.assertTrue(job.paused_for_billing)
        # Wallet is shared per company -- the other job pauses too, even
        # though this charge was only for the first job's candidate.
        self.assertEqual(other_job.job_status, Job.JobStatus.ON_HOLD)
        self.assertTrue(other_job.paused_for_billing)

    def test_assessment_charge_insufficient_funds_pauses_company_jobs(self):
        job, application = self._make_application()

        result = BillingService.process_assessment_charge(application)

        self.assertEqual(result["reason"], "insufficient_funds")

        job.refresh_from_db()
        self.assertEqual(job.job_status, Job.JobStatus.ON_HOLD)
        self.assertTrue(job.paused_for_billing)

    def test_charged_result_does_not_pause_jobs(self):
        job, application = self._make_application()
        self.wallet.balance = 100
        self.wallet.save(update_fields=["balance"])

        result = BillingService.process_resume_candidate_screening(application)

        self.assertEqual(result["reason"], "charged")
        job.refresh_from_db()
        self.assertEqual(job.job_status, Job.JobStatus.ACTIVE)
        self.assertFalse(job.paused_for_billing)
