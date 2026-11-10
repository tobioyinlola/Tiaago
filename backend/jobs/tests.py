"""Pipeline stage transition tests.

Covers the split of the single "interview" stage into separate AI_INTERVIEW
and HUMAN_INTERVIEW stages: the AI interview gates the human one on the job's
ai_interview_pass_mark, and "Interview scheduled" only means something is
actually booked.
"""

import json
from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from ai_interviews.models import AIInterview
from ai_interviews.tasks import _advance_on_ai_interview_result
from create_user.models import Company, CustomUser, TalentProfile
from jobs.models import (
    ApplicationEligibilityCheck,
    ApplicationPracticalAssessment,
    HiringProfile,
    Job,
    JobApplication,
)
from jobs.serializers import GuestJobApplicationSerializer, JobApplicationSerializer, JobSerializer
from jobs.services import current_workflow_stage, workflow_transition_block_detail
from jobs.views import _has_booked_interview
from scheduler.models import Scheduler


def _make_job(company, **kwargs):
    """Only role/job_type/company have no model default."""
    return Job.objects.create(
        role="Backend Engineer",
        job_type=Job.JobType.FULL_TIME,
        company=company,
        **kwargs,
    )


class AIInterviewPassMarkGateTests(TestCase):
    """A candidate only reaches the human interview by clearing the mark."""

    def setUp(self):
        rep = CustomUser.objects.create_company_user(
            username="gate-rep", email="gate-rep@example.com", password="x"
        )
        self.company = Company.objects.create(company_name="Gate Co", company_rep=rep)
        talent_user = CustomUser.objects.create_talent_user(
            username="gate-talent", email="gate-talent@example.com", password="x"
        )
        self.talent = TalentProfile.objects.create(user=talent_user, full_name="Gate Talent")
        self.job = _make_job(self.company, ai_interview_enabled=True, ai_interview_pass_mark=70)
        self.application = JobApplication.objects.create(
            applicant=self.talent,
            job=self.job,
            status=JobApplication.JobApplicationStatus.AI_INTERVIEW,
        )

    def _interview(self, score):
        return AIInterview.objects.create(
            job=self.job,
            candidate=self.talent,
            job_application=self.application,
            organisation=self.company,
            livekit_room_name=f"room-{score}",
            candidate_identity="cand",
            window_end_at=timezone.now() + timedelta(hours=1),
            overall_score=score,
        )

    def _run(self, score):
        with patch("jobs.tasks.send_interview_slot_invite.delay") as invite:
            _advance_on_ai_interview_result(self._interview(score), self.job)
        self.application.refresh_from_db()
        return invite

    def test_pass_advances_to_interview_scheduled_and_invites(self):
        invite = self._run(85)
        self.assertEqual(
            self.application.status,
            JobApplication.JobApplicationStatus.INTERVIEW_SCHEDULED,
        )
        invite.assert_called_once_with(self.application.id)

    def test_score_exactly_on_the_mark_passes(self):
        """'at or above', per get_ai_interview_pass_mark's contract."""
        self._run(70)
        self.assertEqual(
            self.application.status,
            JobApplication.JobApplicationStatus.INTERVIEW_SCHEDULED,
        )

    def test_passing_ai_score_cannot_bypass_a_required_eligibility_review(self):
        self.job.eligibility_requirements = [
            {
                "code": "right-to-work",
                "label": "Right to work",
                "description": "I am authorised to work in the role's stated location.",
                "required": True,
            }
        ]
        self.job.save(update_fields=["eligibility_requirements"])

        invite = self._run(85)

        self.assertEqual(
            self.application.status,
            JobApplication.JobApplicationStatus.AI_INTERVIEW,
        )
        self.assertEqual(self.application.eligibility_checks.count(), 1)
        self.assertEqual(
            self.application.eligibility_checks.get().status,
            ApplicationEligibilityCheck.Status.NEEDS_REVIEW,
        )
        invite.assert_not_called()

    def test_held_ai_progression_is_recorded_and_released_when_review_clears(self):
        from jobs.models import HeldTransition
        from jobs.transitions import retry_hold

        self.job.eligibility_requirements = [
            {"code": "right-to-work", "label": "Right to work", "description": "x", "required": True}
        ]
        self.job.save(update_fields=["eligibility_requirements"])
        self._run(85)
        hold = HeldTransition.objects.get(application=self.application)
        self.assertEqual(hold.source, "ai_interview")
        self.assertEqual(hold.status, HeldTransition.Status.OPEN)
        self.assertEqual(retry_hold(hold), "blocked")

        self.application.eligibility_checks.update(
            status=ApplicationEligibilityCheck.Status.PASS, reviewed_at=timezone.now()
        )
        with patch("jobs.tasks.send_interview_slot_invite.delay") as invite, self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(retry_hold(hold), "resolved")
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, JobApplication.JobApplicationStatus.INTERVIEW_SCHEDULED)
        invite.assert_called_once_with(self.application.id)

    def test_below_the_mark_holds_for_recruiter_review(self):
        """Deliberately not an auto-rejection -- the recruiter still decides."""
        invite = self._run(69)
        self.assertEqual(
            self.application.status, JobApplication.JobApplicationStatus.AI_INTERVIEW
        )
        invite.assert_not_called()

    def test_does_not_drag_back_a_candidate_the_recruiter_moved_on(self):
        self.application.status = JobApplication.JobApplicationStatus.OFFER_EXTENDED
        self.application.save(update_fields=["status"])

        invite = self._run(95)

        self.assertEqual(
            self.application.status, JobApplication.JobApplicationStatus.OFFER_EXTENDED
        )
        invite.assert_not_called()

    def test_falls_back_to_the_default_mark_when_unset(self):
        self.job.ai_interview_pass_mark = None
        self.job.save(update_fields=["ai_interview_pass_mark"])
        self.assertEqual(
            self.job.get_ai_interview_pass_mark(), Job.DEFAULT_AI_INTERVIEW_PASS_MARK
        )
        self._run(Job.DEFAULT_AI_INTERVIEW_PASS_MARK - 1)
        self.assertEqual(
            self.application.status, JobApplication.JobApplicationStatus.AI_INTERVIEW
        )


class HasBookedInterviewTests(TestCase):
    """Decides whether "Interview scheduled" sends an invitation or a
    confirmation -- the two are opposite emails."""

    def setUp(self):
        rep = CustomUser.objects.create_company_user(
            username="book-rep", email="book-rep@example.com", password="x"
        )
        self.company = Company.objects.create(company_name="Book Co", company_rep=rep)
        talent_user = CustomUser.objects.create_talent_user(
            username="book-talent", email="book-talent@example.com", password="x"
        )
        self.talent = TalentProfile.objects.create(user=talent_user, full_name="Book Talent")
        self.job = _make_job(self.company)
        self.application = JobApplication.objects.create(
            applicant=self.talent, job=self.job
        )

    def _meeting(self, status):
        today = timezone.now().date()
        return Scheduler.objects.create(
            title="Interview",
            meeting_date=today,
            start_time="10:00",
            end_time="11:00",
            talent=self.talent,
            job_application=self.application,
            company=self.company,
            description="Interview",
            status=status,
        )

    def test_false_when_nothing_booked(self):
        self.assertFalse(_has_booked_interview(self.application))

    def test_true_for_a_live_booking(self):
        self._meeting(Scheduler.Status.SCHEDULED)
        self.assertTrue(_has_booked_interview(self.application))

    def test_cancelled_booking_does_not_count(self):
        """They need a fresh invitation, not a confirmation for a dead room."""
        self._meeting(Scheduler.Status.CANCELLED)
        self.assertFalse(_has_booked_interview(self.application))


class InterviewTypeConfigTests(TestCase):
    """Item 3: recruiters pick where the interview happens, and an external
    platform is meaningless without the link."""

    def setUp(self):
        rep = CustomUser.objects.create_company_user(
            username="cfg-rep", email="cfg-rep@example.com", password="x"
        )
        self.company = Company.objects.create(company_name="Cfg Co", company_rep=rep)

    def test_in_house_is_not_external(self):
        job = _make_job(self.company)
        self.assertEqual(job.interview_type, "IN_HOUSE")
        self.assertFalse(job.is_external_interview())

    def test_google_meet_and_zoom_are_external(self):
        for value in ("GOOGLE_MEET", "ZOOM", "OTHER"):
            with self.subTest(value=value):
                job = _make_job(self.company, interview_type=value)
                self.assertTrue(job.is_external_interview())

    def test_external_type_requires_a_meeting_link(self):
        from jobs.serializers import _validate_interview_type
        from rest_framework.serializers import ValidationError

        with self.assertRaises(ValidationError) as ctx:
            _validate_interview_type({"interview_type": "ZOOM", "interview_meeting_url": ""})
        self.assertIn("interview_meeting_url", ctx.exception.detail)

    def test_in_house_rejects_a_stray_meeting_link(self):
        """It would be silently ignored -- Tiaago provisions its own room."""
        from jobs.serializers import _validate_interview_type
        from rest_framework.serializers import ValidationError

        with self.assertRaises(ValidationError):
            _validate_interview_type({
                "interview_type": "IN_HOUSE",
                "interview_meeting_url": "https://zoom.us/j/1",
            })

    def test_valid_external_config_passes(self):
        from jobs.serializers import _validate_interview_type

        attrs = {"interview_type": "GOOGLE_MEET", "interview_meeting_url": "https://meet.google.com/abc"}
        self.assertEqual(_validate_interview_type(attrs), attrs)

    def test_configured_duration_overrides_slot_length(self):
        job = _make_job(self.company, interview_duration_minutes=30)
        self.assertEqual(job.interview_duration_minutes or 60, 30)

    def test_duration_falls_back_to_slot_length_when_unset(self):
        job = _make_job(self.company)
        self.assertIsNone(job.interview_duration_minutes)
        self.assertEqual(job.interview_duration_minutes or 60, 60)


class SecondInterviewRoundTests(TestCase):
    """Item 5: a second round reuses the same published availability and is
    stored as its own round, without walking the candidate backward."""

    def setUp(self):
        rep = CustomUser.objects.create_company_user(
            username="r2-rep", email="r2-rep@example.com", password="x"
        )
        self.company = Company.objects.create(company_name="R2 Co", company_rep=rep)
        talent_user = CustomUser.objects.create_talent_user(
            username="r2-talent", email="r2-talent@example.com", password="x"
        )
        self.talent = TalentProfile.objects.create(user=talent_user, full_name="R2 Talent")
        self.job = _make_job(self.company)
        self.application = JobApplication.objects.create(
            applicant=self.talent, job=self.job
        )

    def _meeting(self, round_no, status=None):
        return Scheduler.objects.create(
            title="Interview",
            meeting_date=timezone.now().date(),
            start_time="10:00",
            end_time="11:00",
            talent=self.talent,
            job_application=self.application,
            company=self.company,
            description="Interview",
            round=round_no,
            status=status or Scheduler.Status.SCHEDULED,
        )

    def test_rounds_are_stored_separately(self):
        self._meeting(1, Scheduler.Status.COMPLETED)
        self._meeting(2)
        rounds = sorted(
            Scheduler.objects.filter(job_application=self.application).values_list("round", flat=True)
        )
        self.assertEqual(rounds, [1, 2])

    def test_completing_the_board_stage_closes_out_the_first_round(self):
        """Otherwise the stale active booking blocks a second-round claim."""
        from jobs.views import _close_out_active_interviews

        first = self._meeting(1)
        _close_out_active_interviews(self.application)
        first.refresh_from_db()
        self.assertEqual(first.status, Scheduler.Status.COMPLETED)

    def test_close_out_leaves_cancelled_rounds_alone(self):
        from jobs.views import _close_out_active_interviews

        cancelled = self._meeting(1, Scheduler.Status.CANCELLED)
        _close_out_active_interviews(self.application)
        cancelled.refresh_from_db()
        self.assertEqual(cancelled.status, Scheduler.Status.CANCELLED)

    def test_completed_first_round_no_longer_counts_as_booked(self):
        """So the candidate can be invited to pick a second-round slot."""
        from jobs.views import _has_booked_interview

        self._meeting(1, Scheduler.Status.COMPLETED)
        self.assertFalse(_has_booked_interview(self.application))


class JobStatusChangeBillingGateTests(TestCase):
    """Changing a job's status is gated on the company being able to PAY to
    process applications, which means free credits OR wallet balance.

    Every charge path in subscriptions.billing_service spends
    free_credits_remaining first and only falls through to wallet.balance
    once credits run out, so credits alone are enough to keep working.
    """

    def setUp(self):
        from rest_framework.test import APIClient

        self.rep = CustomUser.objects.create_company_user(
            username="bill-rep", email="bill-rep@example.com", password="x"
        )
        self.rep.verified = True
        self.rep.save(update_fields=["verified"])
        self.company = Company.objects.create(company_name="Bill Co", company_rep=self.rep)
        self.job = _make_job(self.company, job_status=Job.JobStatus.ACTIVE)

        self.client = APIClient()
        self.client.force_authenticate(user=self.rep)

    def _wallet(self, balance, credits):
        from subscriptions.billing_service import get_or_create_wallet

        wallet = get_or_create_wallet(self.company)
        wallet.balance = balance
        wallet.free_credits_remaining = credits
        wallet.save(update_fields=["balance", "free_credits_remaining"])
        return wallet

    def _patch_status(self, status):
        return self.client.patch(
            f"/api/jobs/{self.job.public_id}/", {"job_status": status}, format="json"
        )

    def test_free_credits_with_zero_balance_can_change_status(self):
        """The reported bug: a free-tier company was locked out of its own
        job statuses despite having credits it could still spend."""
        self._wallet(balance=0, credits=20)

        res = self._patch_status(Job.JobStatus.ON_HOLD)

        self.assertEqual(res.status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.job_status, Job.JobStatus.ON_HOLD)

    def test_balance_with_no_credits_can_change_status(self):
        self._wallet(balance=5000, credits=0)

        res = self._patch_status(Job.JobStatus.ON_HOLD)

        self.assertEqual(res.status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.job_status, Job.JobStatus.ON_HOLD)

    def test_both_exhausted_blocks_status_change(self):
        self._wallet(balance=0, credits=0)

        res = self._patch_status(Job.JobStatus.ON_HOLD)

        self.assertEqual(res.status_code, 400)
        self.job.refresh_from_db()
        self.assertEqual(self.job.job_status, Job.JobStatus.ACTIVE)

    def test_both_exhausted_still_allows_non_status_edits(self):
        """The gate is on job_status only -- it must not freeze the whole job."""
        self._wallet(balance=0, credits=0)

        res = self.client.patch(
            f"/api/jobs/{self.job.public_id}/", {"role": "Staff Engineer"}, format="json"
        )

        self.assertEqual(res.status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.role, "Staff Engineer")


class HiringProfileFoundationTests(TestCase):
    """The configurable engine is opt-in and never rewrites legacy jobs."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.rep = CustomUser.objects.create_company_user(
            username="profile-rep", email="profile-rep@example.com", password="x"
        )
        self.rep.verified = True
        self.rep.save(update_fields=["verified"])
        self.company = Company.objects.create(
            company_name="Profile Co", company_rep=self.rep
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.rep)
        # A retained Django test database is flushed after a suite, which
        # removes rows seeded by RunPython migrations. Create the profile if
        # needed so these tests exercise the same contract on fresh and
        # `--keepdb` runs.
        self.finance, _ = HiringProfile.objects.get_or_create(
            code="finance-accounting",
            defaults={
                "name": "Finance & accounting",
                "summary": "Professional finance, accounting, audit, treasury, tax, and FP&A roles.",
                "role_family": HiringProfile.RoleFamily.PROFESSIONAL,
                "industry_context": "Finance, accounting, and professional services",
                "work_setting": "Office, hybrid, or client site",
                "application_defaults": {
                    "application_configuration": {
                        "version": 1,
                        "resume": {"enabled": True, "required": True},
                        "linkedin": {"enabled": True, "required": False},
                        "cover_letter": {"enabled": True, "required": False},
                        "additional_info": {
                            "enabled": False,
                            "required": False,
                            "label": "Anything else you'd like us to know?",
                        },
                    }
                },
            },
        )

    def _job_data(self, **overrides):
        data = {
            "role": "Financial Controller",
            "job_type": Job.JobType.FULL_TIME,
            "job_level": Job.JobLevel.SENIOR,
            "experience": 5,
            "salary_duration": Job.SalaryDuration.PER_MONTH,
            "payment_currency": Job.PaymentCurrency.USD,
            "payment_range_usd": Job.DollarPaymentRange.RANGE_600_1000,
        }
        data.update(overrides)
        return data

    def test_existing_jobs_stay_on_the_legacy_engine(self):
        job = _make_job(self.company)

        self.assertEqual(job.hiring_engine, Job.HiringEngine.LEGACY)
        self.assertIsNone(job.hiring_profile)
        self.assertEqual(job.hiring_profile_version, 0)
        self.assertEqual(job.hiring_profile_snapshot, {})

    def test_disabled_company_cannot_list_or_select_profiles(self):
        response = self.client.get("/api/jobs/hiring-profiles/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"enabled": False, "profiles": []})

        serializer = JobSerializer(
            data=self._job_data(hiring_profile_code=self.finance.code),
            context={"company": self.company},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("hiring_profile_code", serializer.errors)

    def test_enabled_company_can_publish_an_immutable_profile_snapshot(self):
        self.company.hiring_profiles_enabled = True
        self.company.save(update_fields=["hiring_profiles_enabled"])
        profile_version_at_publish = self.finance.version

        response = self.client.get("/api/jobs/hiring-profiles/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["enabled"])
        self.assertIn(
            self.finance.code,
            [profile["code"] for profile in response.data["profiles"]],
        )

        # Exercise the actual posting endpoint too: the view must pass the
        # resolved company into JobSerializer, otherwise a direct HTTP client
        # could never select a profile even after its cohort is enabled.
        with patch("talent_network.tasks.run_talent_network_matching.delay"):
            response = self.client.post(
                "/api/jobs/",
                self._job_data(hiring_profile_code=self.finance.code),
                format="json",
            )
        self.assertEqual(response.status_code, 201, response.data)
        job = Job.objects.get(public_id=response.data["public_id"])

        self.assertEqual(job.hiring_engine, Job.HiringEngine.CONFIGURABLE)
        self.assertEqual(job.hiring_profile, self.finance)
        self.assertEqual(job.hiring_profile_version, self.finance.version)
        self.assertEqual(job.hiring_profile_snapshot["code"], self.finance.code)
        self.assertEqual(job.hiring_profile_snapshot["version"], self.finance.version)

        # Updating the library is a future profile revision, not a silent
        # alteration to a job that is already accepting candidates.
        self.finance.version = profile_version_at_publish + 1
        self.finance.name = "Updated finance profile"
        self.finance.save(update_fields=["version", "name"])
        job.refresh_from_db()
        self.assertEqual(job.hiring_profile_snapshot["version"], profile_version_at_publish)
        self.assertEqual(job.hiring_profile_snapshot["name"], "Finance & accounting")
        self.assertEqual(
            JobSerializer(job).data["hiring_profile"]["name"],
            "Finance & accounting",
        )

    def test_enabled_company_can_publish_a_profile_with_a_no_cv_form(self):
        self.company.hiring_profiles_enabled = True
        self.company.save(update_fields=["hiring_profiles_enabled"])
        configuration = {
            "version": 1,
            "resume": {"enabled": True, "required": False},
            "linkedin": {"enabled": False, "required": False},
            "cover_letter": {"enabled": True, "required": False},
            "additional_info": {
                "enabled": True,
                "required": True,
                "label": "Tell us about relevant site work.",
            },
        }

        with patch("talent_network.tasks.run_talent_network_matching.delay"):
            response = self.client.post(
                "/api/jobs/",
                self._job_data(
                    hiring_profile_code=self.finance.code,
                    application_configuration=configuration,
                ),
                format="json",
            )

        self.assertEqual(response.status_code, 201, response.data)
        job = Job.objects.get(public_id=response.data["public_id"])
        self.assertEqual(job.application_configuration, configuration)
        self.assertFalse(job.requires_resume())
        self.assertEqual(response.data["application_configuration"], configuration)

    def test_guest_no_cv_application_obeys_the_published_form(self):
        job = _make_job(
            self.company,
            application_configuration={
                "version": 1,
                "resume": {"enabled": True, "required": False},
                "linkedin": {"enabled": False, "required": False},
                "cover_letter": {"enabled": False, "required": False},
                "additional_info": {
                    "enabled": True,
                    "required": True,
                    "label": "Relevant driving experience",
                },
            },
        )
        with patch("jobs.views.emails.application_received_mail"), patch(
            "jobs.views.carry_out_resume_analysis.delay"
        ) as resume_analysis:
            response = self.client.post(
                f"/api/jobs/apply/{job.apply_token}/guest/",
                {
                    "full_name": "Guest Candidate",
                    "email": "guest@example.com",
                    "phone_number": "+2348000000000",
                    "additional_info": "Three years of local delivery experience.",
                    "terms_accepted": True,
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 201, response.data)
        resume_analysis.assert_not_called()
        application = JobApplication.objects.get(id=response.data["id"])
        self.assertFalse(application.guest_resume)
        self.assertEqual(application.guest_linkedin_url, "")

    def test_legacy_guest_application_still_requires_cv_and_linkedin(self):
        job = _make_job(self.company)
        serializer = GuestJobApplicationSerializer(
            data={
                "full_name": "Guest Candidate",
                "email": "legacy-guest@example.com",
                "phone_number": "+2348000000000",
                "terms_accepted": True,
            },
            context={"job": job},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("resume", serializer.errors)
        self.assertIn("linkedin_url", serializer.errors)


class EligibilityReviewFoundationTests(TestCase):
    """Operational-role declarations always remain human-reviewable."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.rep = CustomUser.objects.create_company_user(
            username="eligibility-rep", email="eligibility-rep@example.com", password="x"
        )
        self.rep.verified = True
        self.rep.save(update_fields=["verified"])
        self.company = Company.objects.create(
            company_name="Eligibility Co",
            company_rep=self.rep,
            hiring_profiles_enabled=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.rep)
        self.driver, _ = HiringProfile.objects.get_or_create(
            code="driver-frontline",
            defaults={
                "name": "Driver & frontline",
                "summary": "High-volume driving, delivery, customer service, and frontline roles.",
                "role_family": HiringProfile.RoleFamily.FRONTLINE,
                "industry_context": "Transport, delivery, retail, hospitality, and field service",
                "work_setting": "On the road, customer site, depot, or shift location",
            },
        )
        self.driver.application_defaults = {
            "application_configuration": {
                "version": 1,
                "resume": {"enabled": True, "required": False},
                "linkedin": {"enabled": False, "required": False},
                "cover_letter": {"enabled": False, "required": False},
                "additional_info": {
                    "enabled": True,
                    "required": True,
                    "label": "Briefly describe your relevant driving or frontline experience.",
                },
            }
        }
        self.driver.eligibility_defaults = {
            "requirements": [
                {"code": "right-to-work", "required": True},
                {"code": "driving-licence", "required": True},
            ]
        }
        self.driver.evaluation_defaults = {"methods": ["work_sample", "scenario", "structured_interview"]}
        self.driver.workflow_defaults = {"stages": ["application", "eligibility", "screen", "scenario", "assessment", "interview", "decision"]}
        self.driver.save(update_fields=["application_defaults", "eligibility_defaults", "evaluation_defaults", "workflow_defaults"])

    def _job_data(self, **overrides):
        data = {
            "role": "Delivery Driver",
            "job_type": Job.JobType.FULL_TIME,
            "job_level": Job.JobLevel.JUNIOR,
            "experience": 1,
            "salary_duration": Job.SalaryDuration.PER_MONTH,
            "payment_currency": Job.PaymentCurrency.USD,
            "payment_range_usd": Job.DollarPaymentRange.RANGE_600_1000,
            "hiring_profile_code": self.driver.code,
        }
        data.update(overrides)
        return data

    def _publish_job(self, **overrides):
        with patch("talent_network.tasks.run_talent_network_matching.delay"):
            response = self.client.post("/api/jobs/", self._job_data(**overrides), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return Job.objects.get(public_id=response.data["public_id"])

    def _apply_as_guest(self, job, *, email, declarations, work_sample=None, scenario_response=None):
        from jobs.tasks import scan_application_work_sample

        # Scanning is fail-closed in production; tests run the scan task
        # inline with the explicit "disabled" backend so uploads clear.
        with self.settings(MALWARE_SCAN_BACKEND="disabled"), patch(
            "jobs.tasks.scan_application_work_sample.delay",
            side_effect=lambda sample_id: scan_application_work_sample(sample_id),
        ), self.captureOnCommitCallbacks(execute=True), patch(
            "jobs.views.emails.application_received_mail"
        ), patch("jobs.views.carry_out_resume_analysis.delay"):
            payload = {
                "full_name": "Eligible Driver",
                "email": email,
                "phone_number": "+2348000000000",
                "additional_info": "Three years of last-mile delivery experience.",
                "eligibility_declarations": json.dumps(declarations),
                "terms_accepted": True,
            }
            if work_sample:
                payload["work_sample"] = work_sample
            if scenario_response is not None:
                payload["scenario_response"] = scenario_response
            response = self.client.post(
                f"/api/jobs/apply/{job.apply_token}/guest/",
                payload,
                format="multipart",
            )
        self.assertEqual(response.status_code, 201, response.data)
        return JobApplication.objects.get(id=response.data["id"])

    def test_profile_defaults_are_snapshotted_and_a_positive_declaration_is_pending(self):
        job = self._publish_job()

        self.assertEqual(
            job.eligibility_requirements,
            [
                {
                    "code": "right-to-work",
                    "label": "Right to work",
                    "description": "I am authorised to work in the role's stated location.",
                    "required": True,
                },
                {
                    "code": "driving-licence",
                    "label": "Valid driving licence",
                    "description": "I hold the valid licence required for this driving role.",
                    "required": True,
                },
            ],
        )
        self.assertEqual(
            job.get_workflow_configuration(),
            {"version": 1, "stages": ["application", "eligibility", "screen", "scenario", "assessment", "interview", "decision"]},
        )

        application = self._apply_as_guest(
            job,
            email="driver-pending@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
        )

        checks = list(application.eligibility_checks.order_by("requirement_code"))
        self.assertEqual(len(checks), 2)
        self.assertTrue(all(check.declaration for check in checks))
        self.assertTrue(all(check.status == ApplicationEligibilityCheck.Status.PENDING for check in checks))

    def test_reviewed_status_uses_assessment_only_when_that_stage_is_published(self):
        assessment_job = self._publish_job(
            workflow_configuration={
                "version": 1,
                "stages": ["application", "assessment", "interview", "decision"],
            }
        )
        assessment_application = self._apply_as_guest(
            assessment_job,
            email="driver-assessment-workflow@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
        )
        self.assertEqual(
            workflow_transition_block_detail(
                assessment_application, JobApplication.JobApplicationStatus.REVIEWED
            ),
            "",
        )
        assessment_application.status = JobApplication.JobApplicationStatus.REVIEWED
        self.assertEqual(current_workflow_stage(assessment_application), "assessment")
        self.assertEqual(
            JobApplicationSerializer(assessment_application).data["workflow_stage"], "assessment"
        )

        screen_job = self._publish_job(
            workflow_configuration={
                "version": 1,
                "stages": ["application", "screen", "scenario", "interview", "decision"],
            }
        )
        screen_application = self._apply_as_guest(
            screen_job,
            email="driver-screen-workflow@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
        )
        self.assertEqual(
            workflow_transition_block_detail(
                screen_application, JobApplication.JobApplicationStatus.REVIEWED
            ),
            "",
        )
        screen_application.status = JobApplication.JobApplicationStatus.REVIEWED
        self.assertEqual(current_workflow_stage(screen_application), "screen")

    def test_screen_only_workflow_does_not_dispatch_a_hidden_assessment(self):
        job = self._publish_job(
            workflow_configuration={
                "version": 1,
                "stages": ["application", "screen", "scenario", "interview", "decision"],
            }
        )
        application = self._apply_as_guest(
            job,
            email="driver-screen-only@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
        )
        for check in application.eligibility_checks.all():
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/eligibility/{check.id}/",
                {"status": ApplicationEligibilityCheck.Status.PASS},
                format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)

        with patch("jobs.views.send_assessment_link.apply_async") as send_assessment:
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/",
                {"status": JobApplication.JobApplicationStatus.REVIEWED},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)
        send_assessment.assert_not_called()
        application.refresh_from_db()
        self.assertEqual(application.status, JobApplication.JobApplicationStatus.REVIEWED)
        self.assertEqual(current_workflow_stage(application), "screen")

    def test_workflow_blocks_an_interview_transition_omitted_from_the_job(self):
        job = self._publish_job(
            workflow_configuration={
                "version": 1,
                "stages": ["application", "screen", "assessment", "decision"],
            }
        )
        application = self._apply_as_guest(
            job,
            email="driver-no-interview@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
        )

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/",
            {"status": JobApplication.JobApplicationStatus.PENDING_DECISION},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("does not include the interview stage", response.data["detail"])

    def test_negative_required_declaration_fails_and_recruiter_can_record_final_review(self):
        job = self._publish_job()
        application = self._apply_as_guest(
            job,
            email="driver-review@example.com",
            declarations={"right-to-work": True, "driving-licence": False},
        )
        licence_check = application.eligibility_checks.get(requirement_code="driving-licence")
        right_to_work_check = application.eligibility_checks.get(requirement_code="right-to-work")

        self.assertEqual(licence_check.status, ApplicationEligibilityCheck.Status.FAIL)
        self.assertEqual(right_to_work_check.status, ApplicationEligibilityCheck.Status.PENDING)

        queue = self.client.get("/api/jobs/job-applications/eligibility-review/")
        self.assertEqual(queue.status_code, 200, queue.data)
        self.assertEqual(queue.data["count"], 1)
        self.assertEqual(queue.data["results"][0]["id"], application.id)

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/eligibility/{right_to_work_check.id}/",
            {"status": ApplicationEligibilityCheck.Status.PASS},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], ApplicationEligibilityCheck.Status.PASS)
        self.assertEqual(response.data["reviewer_name"], self.rep.email)

        right_to_work_check.refresh_from_db()
        self.assertEqual(right_to_work_check.reviewer, self.rep)
        self.assertIsNotNone(right_to_work_check.reviewed_at)

        queue = self.client.get("/api/jobs/job-applications/eligibility-review/")
        self.assertEqual(queue.status_code, 200, queue.data)
        self.assertEqual(queue.data["count"], 0)

    def test_unanswered_requirements_from_a_non_form_intake_are_never_auto_passed(self):
        job = self._publish_job()

        application = JobApplication.objects.create(
            applicant=None,
            job=job,
            guest_full_name="Imported Driver",
            guest_email="driver-imported@example.com",
            guest_phone_number="+2348000000000",
        )

        self.assertEqual(application.eligibility_checks.count(), 2)
        self.assertTrue(
            all(
                check.status == ApplicationEligibilityCheck.Status.NEEDS_REVIEW
                and check.declaration is None
                for check in application.eligibility_checks.all()
            )
        )

    def test_required_reviews_block_put_and_patch_until_a_reviewer_clears_them(self):
        job = self._publish_job()
        application = self._apply_as_guest(
            job,
            email="driver-gated@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
        )

        for method in (self.client.put, self.client.patch):
            response = method(
                f"/api/jobs/job-applications/{application.id}/",
                {"status": JobApplication.JobApplicationStatus.REVIEWED},
                format="json",
            )
            self.assertEqual(response.status_code, 400, response.data)
            self.assertIn("eligibility reviews", response.data["detail"])

        for check in application.eligibility_checks.all():
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/eligibility/{check.id}/",
                {"status": ApplicationEligibilityCheck.Status.PASS},
                format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)

        with patch("jobs.views.send_assessment_link.apply_async") as send_assessment:
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/",
                {"status": JobApplication.JobApplicationStatus.REVIEWED},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)
        application.refresh_from_db()
        self.assertEqual(application.status, JobApplication.JobApplicationStatus.REVIEWED)
        send_assessment.assert_called_once()

    def test_workflow_gate_materialises_missing_legacy_checks_as_needing_review(self):
        job = self._publish_job()
        application = self._apply_as_guest(
            job,
            email="driver-legacy@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
        )
        ApplicationEligibilityCheck.all_objects.filter(application=application).delete()

        response = self.client.put(
            f"/api/jobs/job-applications/{application.id}/",
            {"status": JobApplication.JobApplicationStatus.REVIEWED},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        checks = list(application.eligibility_checks.order_by("requirement_code"))
        self.assertEqual(len(checks), 2)
        self.assertTrue(
            all(check.status == ApplicationEligibilityCheck.Status.NEEDS_REVIEW for check in checks)
        )

    def test_required_work_sample_is_private_reviewable_and_blocks_progression(self):
        job = self._publish_job()
        job.work_sample_configuration = {
            "enabled": True,
            "required": True,
            "prompt": "Upload a redacted delivery-route improvement proposal.",
            "instructions": "Use a CSV or short document with no customer data.",
        }
        job.save(update_fields=["work_sample_configuration"])
        application = self._apply_as_guest(
            job,
            email="driver-sample@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
            work_sample=SimpleUploadedFile("route-plan.csv", b"route,minutes\nA,20\n", content_type="text/csv"),
        )
        sample = application.work_samples.get()
        self.assertEqual(sample.status, "SUBMITTED")

        for check in application.eligibility_checks.all():
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/eligibility/{check.id}/",
                {"status": ApplicationEligibilityCheck.Status.PASS},
                format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/",
            {"status": JobApplication.JobApplicationStatus.REVIEWED},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("work sample", response.data["detail"])

        response = self.client.get(
            f"/api/jobs/job-applications/{application.id}/work-samples/{sample.id}/download/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get("Content-Disposition"), 'attachment; filename="route-plan.csv"')

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/work-samples/{sample.id}/",
            {"status": "PASS", "reviewer_reason": "Redacted route plan reviewed."},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

        with patch("jobs.views.send_assessment_link.apply_async"):
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/",
                {"status": JobApplication.JobApplicationStatus.REVIEWED},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)

    def test_work_sample_scorecard_snapshots_reviews_and_enforces_its_passing_score(self):
        job = self._publish_job(
            work_sample_configuration={
                "enabled": True,
                "required": True,
                "prompt": "Upload a redacted delivery-route improvement proposal.",
                "instructions": "Use a CSV or short document with no customer data.",
                "rubric": {
                    "version": 1,
                    "passing_score": 70,
                    "criteria": [
                        {"label": "Route accuracy", "description": "Routes are practical and correctly calculated.", "weight": 60},
                        {"label": "Written clarity", "description": "The recommendation is clear and actionable.", "weight": 40},
                    ],
                },
            }
        )
        criteria = job.get_work_sample_configuration()["rubric"]["criteria"]
        self.assertEqual([criterion["code"] for criterion in criteria], ["criterion-1", "criterion-2"])

        application = self._apply_as_guest(
            job,
            email="driver-scorecard@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
            work_sample=SimpleUploadedFile("route-plan.csv", b"route,minutes\nA,20\n", content_type="text/csv"),
        )
        sample = application.work_samples.get()

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/work-samples/{sample.id}/",
            {
                "status": "PASS",
                "scores": {"criterion-1": 3, "criterion-2": 3},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("below", str(response.data))

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/work-samples/{sample.id}/",
            {
                "status": "PASS",
                "scores": {"criterion-1": 4, "criterion-2": 3},
                "score_notes": {"criterion-1": "All route estimates are consistent."},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["weighted_score"], 72.0)
        self.assertEqual(len(response.data["scores"]), 2)
        self.assertEqual(response.data["scores"][0]["criterion_label"], "Route accuracy")
        self.assertEqual(response.data["scores"][0]["reviewer_note"], "All route estimates are consistent.")

        for check in application.eligibility_checks.all():
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/eligibility/{check.id}/",
                {"status": ApplicationEligibilityCheck.Status.PASS},
                format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)
        with patch("jobs.views.send_assessment_link.apply_async"):
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/",
                {"status": JobApplication.JobApplicationStatus.REVIEWED},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)

    def test_required_scenario_response_is_scoreable_and_blocks_progression(self):
        job = self._publish_job(
            scenario_configuration={
                "enabled": True,
                "required": True,
                "prompt": "A customer reports a delayed delivery. What would you do first?",
                "instructions": "Keep the response practical and concise.",
                "response_label": "Your response",
                "rubric": {
                    "version": 1,
                    "passing_score": 70,
                    "criteria": [
                        {"label": "Customer judgement", "description": "Responds safely and professionally.", "weight": 60},
                        {"label": "Operational follow-through", "description": "Sets out a clear next action.", "weight": 40},
                    ],
                },
            }
        )
        application = self._apply_as_guest(
            job,
            email="driver-scenario@example.com",
            declarations={"right-to-work": True, "driving-licence": True},
            scenario_response="I would confirm the delivery status, update the customer with a realistic ETA, and escalate the delay to dispatch.",
        )
        scenario_response = application.scenario_response
        self.assertEqual(scenario_response.status, "SUBMITTED")

        for check in application.eligibility_checks.all():
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/eligibility/{check.id}/",
                {"status": ApplicationEligibilityCheck.Status.PASS},
                format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)
        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/",
            {"status": JobApplication.JobApplicationStatus.REVIEWED},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("scenario response", response.data["detail"])

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/scenario-responses/{scenario_response.id}/",
            {"status": "PASS", "scores": {"criterion-1": 3, "criterion-2": 3}},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/scenario-responses/{scenario_response.id}/",
            {
                "status": "PASS",
                "scores": {"criterion-1": 4, "criterion-2": 3},
                "score_notes": {"criterion-1": "Clear customer update and escalation path."},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["weighted_score"], 72.0)
        self.assertEqual(len(response.data["scores"]), 2)

        with patch("jobs.views.send_assessment_link.apply_async"):
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/",
                {"status": JobApplication.JobApplicationStatus.REVIEWED},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)


class PracticalAssessmentFoundationTests(TestCase):
    """Observed field assessments retain capacity, safety and scorecard context."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.rep = CustomUser.objects.create_company_user(
            username="practical-rep", email="practical-rep@example.com", password="x"
        )
        self.rep.verified = True
        self.rep.save(update_fields=["verified"])
        self.company = Company.objects.create(
            company_name="Practical Co",
            company_rep=self.rep,
            hiring_profiles_enabled=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.rep)
        self.profile = HiringProfile.objects.create(
            code="practical-driver-test",
            name="Practical driver",
            summary="Observed frontline driving assessment.",
            role_family=HiringProfile.RoleFamily.FRONTLINE,
            industry_context="Transport",
            work_setting="Depot and road",
            evaluation_defaults={"methods": ["practical_assessment", "structured_interview"]},
            workflow_defaults={
                "stages": ["application", "eligibility", "screen", "practical", "assessment", "interview", "decision"]
            },
        )

    def _publish_practical_job(self):
        payload = {
            "role": "Delivery Driver",
            "job_type": Job.JobType.FULL_TIME,
            "job_level": Job.JobLevel.JUNIOR,
            "experience": 1,
            "salary_duration": Job.SalaryDuration.PER_MONTH,
            "payment_currency": Job.PaymentCurrency.USD,
            "payment_range_usd": Job.DollarPaymentRange.RANGE_600_1000,
            "hiring_profile_code": self.profile.code,
            "workflow_configuration": {
                "version": 1,
                "stages": ["application", "eligibility", "screen", "practical", "assessment", "interview", "decision"],
            },
            "practical_assessment_configuration": {
                "enabled": True,
                "required": True,
                "title": "Safe road assessment",
                "instructions": "Complete the observed route and vehicle checks with the assessor.",
                "rubric": {
                    "version": 1,
                    "passing_score": 70,
                    "criteria": [
                        {"label": "Vehicle safety", "description": "Completes all critical safety checks.", "weight": 60},
                        {"label": "Route judgement", "description": "Makes safe, lawful decisions on the route.", "weight": 40},
                    ],
                },
            },
        }
        with patch("talent_network.tasks.run_talent_network_matching.delay"):
            response = self.client.post("/api/jobs/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return Job.objects.get(public_id=response.data["public_id"])

    def _application(self, job, email):
        return JobApplication.objects.create(
            applicant=None,
            job=job,
            guest_full_name="Practical Candidate",
            guest_email=email,
            guest_phone_number="+2348000000000",
        )

    def _create_slot(self, job, starts_at, *, capacity=1):
        response = self.client.post(
            f"/api/jobs/{job.public_id}/practical-assessment-slots/",
            {
                "starts_at": starts_at.isoformat(),
                "ends_at": (starts_at + timedelta(hours=1)).isoformat(),
                "location": "Lagos depot, bay 2",
                "capacity": capacity,
                "instructions": "Bring photo ID and protective footwear.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_practical_assessment_capacity_scorecard_and_required_pass_gate(self):
        job = self._publish_practical_job()
        application = self._application(job, "practical-primary@example.com")
        slot = self._create_slot(job, timezone.now() + timedelta(days=2))
        self.assertEqual(slot["scheduled_count"], 0)

        response = self.client.post(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/",
            {"slot_id": slot["id"]},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        assessment_id = response.data["id"]
        self.assertEqual(response.data["status"], ApplicationPracticalAssessment.Status.SCHEDULED)
        self.assertEqual(response.data["rubric_snapshot"]["passing_score"], 70)

        queue = self.client.get("/api/jobs/job-applications/practical-assessment-review/")
        self.assertEqual(queue.status_code, 200, queue.data)
        self.assertEqual(queue.data["count"], 1)
        self.assertEqual(queue.data["results"][0]["practical_assessments"][0]["id"], assessment_id)

        another_application = self._application(job, "practical-capacity@example.com")
        response = self.client.post(
            f"/api/jobs/job-applications/{another_application.id}/practical-assessments/",
            {"slot_id": slot["id"]},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("full", str(response.data).lower())

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/",
            {"status": JobApplication.JobApplicationStatus.REVIEWED},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("practical assessment", response.data["detail"])

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/{assessment_id}/",
            {
                "outcome": "PASS",
                "critical_failure": True,
                "critical_failure_reason": "Unsafe reversing manoeuvre.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("critical failure", str(response.data).lower())

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/{assessment_id}/",
            {
                "outcome": "FAIL",
                "critical_failure": True,
                "critical_failure_reason": "Unsafe reversing manoeuvre.",
                "observations": "Assessor stopped the route assessment immediately.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], ApplicationPracticalAssessment.Status.COMPLETED)
        self.assertEqual(response.data["outcome"], ApplicationPracticalAssessment.Outcome.FAIL)
        self.assertTrue(response.data["critical_failure"])
        self.assertIsNone(response.data["weighted_score"])

        retry_slot = self._create_slot(job, timezone.now() + timedelta(days=3))
        # A critical safety failure needs a documented decision to retest.
        response = self.client.post(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/",
            {"slot_id": retry_slot["id"]},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("critical safety failure", str(response.data))
        response = self.client.post(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/",
            {"slot_id": retry_slot["id"], "override_reason": "Safety retraining completed."},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["policy_override_reason"], "Safety retraining completed.")
        retry_id = response.data["id"]
        self.assertEqual(response.data["attempt_number"], 2)

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/{retry_id}/",
            {
                "outcome": "PASS",
                "scores": {"criterion-1": 3, "criterion-2": 3},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("below", str(response.data))

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/{retry_id}/",
            {
                "outcome": "PASS",
                "scores": {"criterion-1": 4, "criterion-2": 3},
                "score_notes": {"criterion-1": "Completed all vehicle checks correctly."},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["weighted_score"], 72.0)
        self.assertEqual(response.data["assessor_name"], self.rep.email)
        self.assertEqual(response.data["scorecard"][0]["label"], "Vehicle safety")

        with patch("jobs.views.send_assessment_link.apply_async"):
            response = self.client.patch(
                f"/api/jobs/job-applications/{application.id}/",
                {"status": JobApplication.JobApplicationStatus.REVIEWED},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)

    def test_practical_assessment_requires_a_supported_profile_and_workflow_stage(self):
        payload = {
            "role": "Delivery Driver",
            "job_type": Job.JobType.FULL_TIME,
            "job_level": Job.JobLevel.JUNIOR,
            "experience": 1,
            "salary_duration": Job.SalaryDuration.PER_MONTH,
            "payment_currency": Job.PaymentCurrency.USD,
            "payment_range_usd": Job.DollarPaymentRange.RANGE_600_1000,
            "hiring_profile_code": self.profile.code,
            "workflow_configuration": {"version": 1, "stages": ["application", "screen", "assessment", "interview", "decision"]},
            "practical_assessment_configuration": {
                "enabled": True,
                "required": False,
                "title": "Road assessment",
                "rubric": {"criteria": [{"label": "Safety", "description": "Uses safe operating practice.", "weight": 100}]},
            },
        }
        response = self.client.post("/api/jobs/", payload, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("workflow_configuration", response.data["errors"])


class ReadinessFoundationTests(TestCase):
    """An accepted offer only becomes a start after an auditable readiness gate."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.rep = CustomUser.objects.create_company_user(
            username="readiness-rep", email="readiness-rep@example.com", password="x"
        )
        self.company = Company.objects.create(company_name="Readiness Co", company_rep=self.rep)
        self.talent_user = CustomUser.objects.create_talent_user(
            username="readiness-talent", email="readiness-talent@example.com", password="x"
        )
        self.talent = TalentProfile.objects.create(user=self.talent_user, full_name="Ready Candidate")
        self.client = APIClient()
        self.client.force_authenticate(user=self.rep)

    def _application(self, *, requirements=None, status=JobApplication.JobApplicationStatus.OFFER_ACCEPTED):
        job = _make_job(self.company, eligibility_requirements=requirements or [])
        return JobApplication.objects.create(applicant=self.talent, job=job, status=status)

    def test_readiness_requires_cleared_requirements_before_ready_and_started(self):
        application = self._application(requirements=[{
            "code": "right-to-work",
            "label": "Right to work",
            "description": "I am authorised to work in the role's stated location.",
            "required": True,
        }])

        queue = self.client.get("/api/jobs/job-applications/readiness/")
        self.assertEqual(queue.status_code, 200, queue.data)
        self.assertEqual(queue.data["count"], 1)
        self.assertIn("eligibility reviews", queue.data["results"][0]["blocker_detail"])

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/readiness/",
            {
                "readiness_status": "CHECKS_OUTSTANDING",
                "readiness_note": "Awaiting manual right-to-work review.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["readiness_status"], "CHECKS_OUTSTANDING")

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/readiness/",
            {
                "readiness_status": "READY_TO_START",
                "readiness_target_start_date": date.today().isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("eligibility", str(response.data).lower())

        check = application.eligibility_checks.get(requirement_code="right-to-work")
        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/eligibility/{check.id}/",
            {"status": "PASS"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/readiness/",
            {
                "readiness_status": "READY_TO_START",
                "readiness_target_start_date": date.today().isoformat(),
                "readiness_note": "All current hiring checks are complete.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["readiness_status"], "READY_TO_START")
        self.assertEqual(response.data["updated_by_name"], self.rep.email)

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/readiness/",
            {"readiness_status": "STARTED"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["readiness_status"], "STARTED")
        self.assertIsNotNone(response.data["readiness_started_at"])

        response = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/readiness/",
            {"readiness_status": "CHECKS_OUTSTANDING", "readiness_note": "Attempt to reopen."},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("final", str(response.data).lower())

    def test_candidate_offer_acceptance_enters_readiness_without_bypassing_the_gate(self):
        from rest_framework.test import APIClient

        application = self._application(status=JobApplication.JobApplicationStatus.OFFER_EXTENDED)
        application.job.hiring_engine = Job.HiringEngine.CONFIGURABLE
        application.job.workflow_configuration = {
            "version": 1,
            "stages": ["application", "screen", "interview", "decision", "readiness"],
        }
        application.job.save(update_fields=["hiring_engine", "workflow_configuration"])
        talent_client = APIClient()
        talent_client.force_authenticate(user=self.talent_user)
        not_offered = self._application(status=JobApplication.JobApplicationStatus.APPLIED)
        blocked = talent_client.patch(
            f"/api/jobs/job-applications/{not_offered.id}/",
            {"status": "OFFER_ACCEPTED"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400, blocked.data)

        response = talent_client.patch(
            f"/api/jobs/job-applications/{application.id}/",
            {"status": "OFFER_ACCEPTED"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        application.refresh_from_db()
        self.assertEqual(application.status, JobApplication.JobApplicationStatus.OFFER_ACCEPTED)
        self.assertEqual(application.readiness_status, JobApplication.ReadinessStatus.CHECKS_OUTSTANDING)
        self.assertEqual(current_workflow_stage(application), "readiness")



class WorkSampleMalwareScanTests(TestCase):
    """Uploads are untrusted until scanned; the gate must fail closed."""

    # Reuse the profile/job/client fixtures without re-running that suite.
    setUp = EligibilityReviewFoundationTests.setUp
    _job_data = EligibilityReviewFoundationTests._job_data
    _publish_job = EligibilityReviewFoundationTests._publish_job

    def _sample_job(self):
        job = self._publish_job()
        job.work_sample_configuration = {
            "enabled": True, "required": False,
            "prompt": "Upload a redacted route plan.", "instructions": "CSV only.",
        }
        job.save(update_fields=["work_sample_configuration"])
        return job

    def _apply_unscanned(self, job, email, upload):
        with patch("jobs.tasks.scan_application_work_sample.delay"), self.captureOnCommitCallbacks(execute=True), patch(
            "jobs.views.emails.application_received_mail"
        ), patch("jobs.views.carry_out_resume_analysis.delay"):
            response = self.client.post(
                f"/api/jobs/apply/{job.apply_token}/guest/",
                {
                    "full_name": "Eligible Driver", "email": email,
                    "phone_number": "+2348000000000",
                    "additional_info": "Three years of last-mile delivery experience.",
                    "eligibility_declarations": json.dumps({"right-to-work": True, "driving-licence": True}),
                    "terms_accepted": True, "work_sample": upload,
                },
                format="multipart",
            )
        return response

    def _csv(self):
        return SimpleUploadedFile("route-plan.csv", b"route,minutes\nA,20\n", content_type="text/csv")

    def test_unscanned_sample_is_blocked_from_download_and_acceptance(self):
        job = self._sample_job()
        response = self._apply_unscanned(job, "pending-scan@example.com", self._csv())
        self.assertEqual(response.status_code, 201, response.data)
        application = JobApplication.objects.get(id=response.data["id"])
        sample = application.work_samples.get()
        self.assertEqual(sample.scan_status, "PENDING")

        base = f"/api/jobs/job-applications/{application.id}/work-samples/{sample.id}/"
        self.assertEqual(self.client.get(base + "download/").status_code, 409)
        accepted = self.client.patch(
            base, {"status": "PASS", "reviewer_reason": "Looks fine."}, format="json"
        )
        self.assertEqual(accepted.status_code, 400, accepted.data)
        self.assertIn("malware scan", str(accepted.data))

    def test_clean_verdict_unlocks_download(self):
        from jobs.tasks import scan_application_work_sample

        job = self._sample_job()
        application = JobApplication.objects.get(
            id=self._apply_unscanned(job, "clean@example.com", self._csv()).data["id"]
        )
        sample = application.work_samples.get()
        with patch("jobs.malware.scan_stream", return_value=("CLEAN", "")):
            scan_application_work_sample(sample.id)
        sample.refresh_from_db()
        self.assertEqual(sample.scan_status, "CLEAN")
        response = self.client.get(
            f"/api/jobs/job-applications/{application.id}/work-samples/{sample.id}/download/"
        )
        self.assertEqual(response.status_code, 200)

    def test_infected_sample_is_quarantined_and_file_removed(self):
        from jobs.tasks import scan_application_work_sample

        job = self._sample_job()
        application = JobApplication.objects.get(
            id=self._apply_unscanned(job, "bad@example.com", self._csv()).data["id"]
        )
        sample = application.work_samples.get()
        stored = sample.file.name
        with patch("jobs.malware.scan_stream", return_value=("INFECTED", "Eicar-Test-Signature")):
            scan_application_work_sample(sample.id)
        sample.refresh_from_db()
        self.assertEqual(sample.scan_status, "INFECTED")
        self.assertFalse(sample.file)
        self.assertFalse(sample.file.storage.exists(stored))
        response = self.client.get(
            f"/api/jobs/job-applications/{application.id}/work-samples/{sample.id}/download/"
        )
        self.assertEqual(response.status_code, 403)

    def test_scanner_outage_retries_then_errors_but_never_clears(self):
        from jobs.malware import ScannerUnavailable
        from jobs.tasks import WORK_SAMPLE_MAX_SCAN_ATTEMPTS, scan_application_work_sample

        job = self._sample_job()
        application = JobApplication.objects.get(
            id=self._apply_unscanned(job, "outage@example.com", self._csv()).data["id"]
        )
        sample = application.work_samples.get()
        with patch("jobs.malware.scan_stream", side_effect=ScannerUnavailable("down")):
            scan_application_work_sample(sample.id)
            sample.refresh_from_db()
            self.assertEqual(sample.scan_status, "PENDING")
            for _ in range(WORK_SAMPLE_MAX_SCAN_ATTEMPTS):
                scan_application_work_sample(sample.id)
        sample.refresh_from_db()
        self.assertEqual(sample.scan_status, "ERROR")

    def test_sweeper_requeues_stale_pending_samples(self):
        from jobs.models import ApplicationWorkSample
        from jobs.tasks import sweep_unscanned_work_samples

        job = self._sample_job()
        application = JobApplication.objects.get(
            id=self._apply_unscanned(job, "sweep@example.com", self._csv()).data["id"]
        )
        sample = application.work_samples.get()
        ApplicationWorkSample.objects.filter(id=sample.id).update(
            updated_at=timezone.now() - timedelta(minutes=10)
        )
        with patch("jobs.tasks.scan_application_work_sample.delay") as delay:
            self.assertEqual(sweep_unscanned_work_samples(), 1)
        delay.assert_called_once_with(sample.id)

    def test_mislabelled_and_macro_uploads_are_rejected(self):
        import io
        import zipfile

        job = self._sample_job()
        fake_pdf = SimpleUploadedFile("plan.pdf", b"MZ\x90\x00 not a pdf", content_type="application/pdf")
        response = self._apply_unscanned(job, "fake@example.com", fake_pdf)
        self.assertEqual(response.status_code, 400, response.data)

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("[Content_Types].xml", "<x/>")
            archive.writestr("word/vbaProject.bin", b"macro")
        macro_doc = SimpleUploadedFile("plan.docx", buffer.getvalue(), content_type="application/octet-stream")
        response = self._apply_unscanned(job, "macro@example.com", macro_doc)
        self.assertEqual(response.status_code, 400, response.data)

    def test_clamd_instream_protocol_parses_verdicts(self):
        import io
        from jobs import malware

        class FakeSocket:
            def __init__(self, reply):
                self.reply, self.sent = reply, b""
            def __enter__(self): return self
            def __exit__(self, *a): return False
            def settimeout(self, t): pass
            def sendall(self, data): self.sent += data
            def recv(self, n):
                reply, self.reply = self.reply, b""
                return reply

        for reply, expected in (
            (b"stream: OK\0", ("CLEAN", "")),
            (b"stream: Eicar-Test-Signature FOUND\0", ("INFECTED", "Eicar-Test-Signature")),
        ):
            sock = FakeSocket(reply)
            with patch("jobs.malware.socket.create_connection", return_value=sock):
                self.assertEqual(malware._clamd_scan(io.BytesIO(b"abc")), expected)
            self.assertTrue(sock.sent.startswith(b"zINSTREAM\0"))
            self.assertTrue(sock.sent.endswith(b"\x00\x00\x00\x00"))
        with patch("jobs.malware.socket.create_connection", side_effect=OSError("refused")):
            with self.assertRaises(malware.ScannerUnavailable):
                malware._clamd_scan(io.BytesIO(b"abc"))


class PracticalBookingPolicyTests(TestCase):
    """Self-booking, attempt limits, retest waits, no-shows and late cancels."""

    setUp = PracticalAssessmentFoundationTests.setUp
    _publish_practical_job = PracticalAssessmentFoundationTests._publish_practical_job
    _application = PracticalAssessmentFoundationTests._application
    _create_slot = PracticalAssessmentFoundationTests._create_slot

    def _job(self, **policy):
        job = self._publish_practical_job()
        configuration = job.get_practical_assessment_configuration()
        configuration["policy"] = {"self_booking": True, **policy}
        job.practical_assessment_configuration = configuration
        job.save(update_fields=["practical_assessment_configuration"])
        return job

    def _link(self, application):
        response = self.client.post(f"/api/jobs/job-applications/{application.id}/practical-booking-link/")
        self.assertEqual(response.status_code, 200, response.data)
        return response.data["token"]

    def _guest(self):
        from rest_framework.test import APIClient

        return APIClient()  # unauthenticated: a guest holding only the signed link

    def _clear_eligibility(self, application):
        application.eligibility_checks.update(status="PASS", reviewed_at=timezone.now())

    def test_policy_is_validated_and_link_requires_self_booking(self):
        job = self._publish_practical_job()
        application = self._application(job, "no-selfbook@example.com")
        response = self.client.post(f"/api/jobs/job-applications/{application.id}/practical-booking-link/")
        self.assertEqual(response.status_code, 400, response.data)

        from jobs.practical import normalise_policy
        from rest_framework.exceptions import ValidationError

        for bad in ({"max_attempts": 0}, {"retest_wait_days": 400}, {"unknown": 1}, {"self_booking": "yes"}):
            with self.assertRaises(ValidationError):
                normalise_policy(bad)
        self.assertEqual(normalise_policy(None)["max_attempts"], 2)

    def test_guest_books_cancels_and_late_cancel_is_refused(self):
        job = self._job(cancellation_cutoff_hours=24)
        application = self._application(job, "guest-book@example.com")
        token = self._link(application)
        near = self._create_slot(job, timezone.now() + timedelta(hours=5))
        far = self._create_slot(job, timezone.now() + timedelta(days=3))
        guest = self._guest()

        state = guest.get(f"/api/jobs/practical-booking/{token}/")
        self.assertEqual(state.status_code, 200, state.data)
        self.assertTrue(state.data["can_book"], state.data)
        # Only slots beyond the cancellation cutoff are offered for self-booking.
        self.assertEqual([slot["id"] for slot in state.data["slots"]], [far["id"]])

        refused = guest.post(f"/api/jobs/practical-booking/{token}/slots/{near['id']}/book/")
        self.assertEqual(refused.status_code, 400, refused.data)
        booked = guest.post(f"/api/jobs/practical-booking/{token}/slots/{far['id']}/book/")
        self.assertEqual(booked.status_code, 201, booked.data)
        self.assertEqual(booked.data["booked_by"], "CANDIDATE")
        # One active appointment at a time.
        again = guest.post(f"/api/jobs/practical-booking/{token}/slots/{far['id']}/book/")
        self.assertEqual(again.status_code, 400, again.data)

        cancelled = guest.post(f"/api/jobs/practical-booking/{token}/cancel/", {"reason": "Illness"}, format="json")
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        self.assertEqual(cancelled.data["status"], "CANCELLED")
        self.assertEqual(cancelled.data["status_changed_by"], "CANDIDATE")

        # Late cancellation: move the booked slot inside the cutoff.
        rebooked = guest.post(f"/api/jobs/practical-booking/{token}/slots/{far['id']}/book/")
        self.assertEqual(rebooked.status_code, 201, rebooked.data)
        ApplicationPracticalAssessment.objects.filter(id=rebooked.data["id"]).update()
        from jobs.models import JobPracticalAssessmentSlot

        JobPracticalAssessmentSlot.objects.filter(id=far["id"]).update(starts_at=timezone.now() + timedelta(hours=2))
        late = guest.post(f"/api/jobs/practical-booking/{token}/cancel/")
        self.assertEqual(late.status_code, 400, late.data)
        self.assertIn("too late", str(late.data))

    def test_booking_cancel_and_no_show_queue_durable_messages(self):
        from jobs.models import ApplicationNotification as N, JobPracticalAssessmentSlot

        job = self._job()
        application = self._application(job, "notify@example.com")
        slot = self._create_slot(job, timezone.now() + timedelta(days=3))
        with patch("jobs.tasks.deliver_application_notification.delay"), self.captureOnCommitCallbacks(execute=True):
            booked = self.client.post(
                f"/api/jobs/job-applications/{application.id}/practical-assessments/", {"slot_id": slot["id"]}, format="json"
            )
            self.assertEqual(booked.status_code, 201, booked.data)
            link = self.client.post(f"/api/jobs/job-applications/{application.id}/practical-booking-link/")
            self.assertEqual(link.data["notification_status"], "PENDING")
            url = f"/api/jobs/job-applications/{application.id}/practical-assessments/{booked.data['id']}/attendance/"
            JobPracticalAssessmentSlot.objects.filter(id=slot["id"]).update(
                starts_at=timezone.now() - timedelta(hours=2), ends_at=timezone.now() - timedelta(hours=1)
            )
            self.assertEqual(self.client.patch(url, {"status": "NO_SHOW"}, format="json").status_code, 200)
        kinds = set(N.objects.filter(application=application).values_list("kind", flat=True))
        self.assertEqual(kinds, {"practical_booked", "practical_booking_invite", "practical_no_show"})

    def test_invalid_or_foreign_token_is_rejected(self):
        job = self._job()
        application = self._application(job, "tok@example.com")
        guest = self._guest()
        self.assertEqual(guest.get("/api/jobs/practical-booking/not-a-token/").status_code, 403)
        self.assertEqual(guest.get(f"/api/jobs/job-applications/{application.id}/practical-booking/").status_code, 403)

    def test_attempt_limit_no_show_and_retest_wait(self):
        job = self._job(max_attempts=2, retest_wait_days=3, no_show_counts_as_attempt=True)
        application = self._application(job, "noshow@example.com")
        token = self._link(application)
        guest = self._guest()
        slot_one = self._create_slot(job, timezone.now() + timedelta(days=3))
        booked = guest.post(f"/api/jobs/practical-booking/{token}/slots/{slot_one['id']}/book/")
        self.assertEqual(booked.status_code, 201, booked.data)
        appointment_id = booked.data["id"]

        # A no-show cannot be recorded before the appointment starts.
        url = f"/api/jobs/job-applications/{application.id}/practical-assessments/{appointment_id}/attendance/"
        early = self.client.patch(url, {"status": "NO_SHOW", "reason": "x"}, format="json")
        self.assertEqual(early.status_code, 400, early.data)

        from jobs.models import JobPracticalAssessmentSlot

        JobPracticalAssessmentSlot.objects.filter(id=slot_one["id"]).update(
            starts_at=timezone.now() - timedelta(hours=2), ends_at=timezone.now() - timedelta(hours=1)
        )
        marked = self.client.patch(url, {"status": "NO_SHOW", "reason": "Did not arrive"}, format="json")
        self.assertEqual(marked.status_code, 200, marked.data)
        self.assertEqual(marked.data["status"], "NO_SHOW")
        # Candidates cannot record attendance.
        self.assertEqual(guest.patch(url, {"status": "NO_SHOW"}, format="json").status_code, 401)

        slot_two = self._create_slot(job, timezone.now() + timedelta(days=5))
        waiting = guest.get(f"/api/jobs/practical-booking/{token}/")
        self.assertFalse(waiting.data["can_book"])
        self.assertIn("wait", waiting.data["blocked_reason"])
        self.assertEqual(
            guest.post(f"/api/jobs/practical-booking/{token}/slots/{slot_two['id']}/book/").status_code, 400
        )

        # Once the wait has passed the no-show counts as attempt 1 of 2 and a retest opens.
        JobPracticalAssessmentSlot.objects.filter(id=slot_one["id"]).update(
            ends_at=timezone.now() - timedelta(days=4)
        )
        retest = guest.post(f"/api/jobs/practical-booking/{token}/slots/{slot_two['id']}/book/")
        self.assertEqual(retest.status_code, 201, retest.data)
        self.assertEqual(retest.data["attempt_number"], 2)

        # Fail attempt 2: the limit is used up; self-booking stays closed.
        complete = self.client.patch(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/{retest.data['id']}/",
            {"outcome": "FAIL", "observations": "Did not meet the standard.", "scores": {"criterion-1": 1, "criterion-2": 1}},
            format="json",
        )
        self.assertEqual(complete.status_code, 200, complete.data)
        ApplicationPracticalAssessment.objects.filter(id=retest.data["id"]).update(
            completed_at=timezone.now() - timedelta(days=10)
        )
        slot_three = self._create_slot(job, timezone.now() + timedelta(days=9))
        state = guest.get(f"/api/jobs/practical-booking/{token}/")
        self.assertFalse(state.data["can_book"])
        self.assertIn("maximum of 2", state.data["blocked_reason"])
        # The hiring team can exceed the limit only with a recorded reason.
        no_reason = self.client.post(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/",
            {"slot_id": slot_three["id"]},
            format="json",
        )
        self.assertEqual(no_reason.status_code, 400, no_reason.data)
        overridden = self.client.post(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/",
            {"slot_id": slot_three["id"], "override_reason": "Manager approved a third attempt."},
            format="json",
        )
        self.assertEqual(overridden.status_code, 201, overridden.data)
        self.assertEqual(overridden.data["attempt_number"], 3)

    def test_no_show_can_be_excluded_from_attempts(self):
        job = self._job(max_attempts=1, no_show_counts_as_attempt=False)
        application = self._application(job, "free-noshow@example.com")
        slot = self._create_slot(job, timezone.now() + timedelta(days=3))
        booked = self.client.post(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/",
            {"slot_id": slot["id"]}, format="json",
        )
        from jobs.models import JobPracticalAssessmentSlot

        JobPracticalAssessmentSlot.objects.filter(id=slot["id"]).update(
            starts_at=timezone.now() - timedelta(hours=2), ends_at=timezone.now() - timedelta(hours=1)
        )
        self.client.patch(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/{booked.data['id']}/attendance/",
            {"status": "NO_SHOW"}, format="json",
        )
        from jobs.practical import booking_block

        application.refresh_from_db()
        self.assertEqual(booking_block(application, candidate_facing=True), ("", False))

    def test_account_holder_can_book_only_their_own_application(self):
        job = self._job()
        talent_user = CustomUser.objects.create_talent_user(
            username="own-talent", email="own-talent@example.com", password="x"
        )
        profile = TalentProfile.objects.create(user=talent_user, full_name="Own Talent")
        application = self._application(job, "owned@example.com")
        JobApplication.objects.filter(id=application.id).update(applicant=profile)
        slot = self._create_slot(job, timezone.now() + timedelta(days=4))

        from rest_framework.test import APIClient

        owner = APIClient()
        owner.force_authenticate(user=talent_user)
        response = owner.post(f"/api/jobs/job-applications/{application.id}/practical-booking/slots/{slot['id']}/book/")
        self.assertEqual(response.status_code, 201, response.data)

        stranger_user = CustomUser.objects.create_talent_user(
            username="stranger", email="stranger@example.com", password="x"
        )
        stranger = APIClient()
        stranger.force_authenticate(user=stranger_user)
        self.assertEqual(
            stranger.get(f"/api/jobs/job-applications/{application.id}/practical-booking/").status_code, 403
        )


class DurableNotificationAndRecoveryTests(TestCase):
    """Failed messages are retried and surfaced; held progressions are released."""

    setUp = EligibilityReviewFoundationTests.setUp
    _job_data = EligibilityReviewFoundationTests._job_data
    _publish_job = EligibilityReviewFoundationTests._publish_job
    _apply_as_guest = EligibilityReviewFoundationTests._apply_as_guest

    def _application(self, email="recover@example.com"):
        job = self._publish_job()
        return self._apply_as_guest(
            job, email=email, declarations={"right-to-work": True, "driving-licence": True}
        )

    def test_delivery_retries_with_backoff_then_dies_and_can_be_retried(self):
        from jobs.models import ApplicationNotification as N
        from jobs.notifications import HANDLERS, MAX_ATTEMPTS, deliver, queue_notification, retry_dead

        application = self._application()
        with patch("jobs.tasks.deliver_application_notification.delay"):
            notification = queue_notification(application, "manual_rejection", dedupe_key="t:1", payload={"reason": "x"})
            # Idempotent on the dedupe key.
            self.assertEqual(queue_notification(application, "manual_rejection", dedupe_key="t:1").id, notification.id)
        self.assertEqual(N.objects.filter(application=application).count(), 1)

        calls = {"n": 0}

        def flaky(app, payload):
            calls["n"] += 1
            raise RuntimeError("smtp down")

        with patch.dict(HANDLERS, {"manual_rejection": flaky}):
            first = deliver(notification.id)
            self.assertEqual(first.status, "PENDING")
            self.assertEqual(first.attempts, 1)
            self.assertGreater(first.next_attempt_at, timezone.now())
            for _ in range(MAX_ATTEMPTS):
                deliver(notification.id)
        notification.refresh_from_db()
        self.assertEqual(notification.status, "DEAD")
        self.assertIn("smtp down", notification.last_error)
        self.assertEqual(calls["n"], MAX_ATTEMPTS)

        with patch("jobs.tasks.deliver_application_notification.delay"), patch.dict(HANDLERS, {"manual_rejection": lambda a, p: None}):
            retry_dead(notification)
            notification.refresh_from_db()
            self.assertEqual(notification.status, "PENDING")
            deliver(notification.id)
        notification.refresh_from_db()
        self.assertEqual(notification.status, "SENT")

    def test_candidate_without_email_is_skipped_not_retried(self):
        from jobs.models import ApplicationNotification as N
        from jobs.notifications import deliver, queue_notification

        application = self._application("phone-only@example.com")
        JobApplication.objects.filter(id=application.id).update(guest_email="")
        application.refresh_from_db()
        with patch("jobs.tasks.deliver_application_notification.delay"):
            notification = queue_notification(application, "practical_booked", dedupe_key="t:phone", payload={})
        deliver(notification.id)
        notification.refresh_from_db()
        self.assertEqual(notification.status, N.Status.SKIPPED)
        self.assertIn("phone", notification.last_error)

    def test_held_transition_is_recorded_released_and_not_duplicated(self):
        from jobs.models import HeldTransition
        from jobs.tasks import retry_held_transitions
        from jobs.transitions import record_held_transition

        application = self._application("held@example.com")
        hold = record_held_transition(
            application, source="resume_screening", target_status="REVIEWED", reason="Eligibility review pending",
        )
        again = record_held_transition(
            application, source="resume_screening", target_status="REVIEWED", reason="Still pending",
        )
        self.assertEqual(hold.id, again.id)
        self.assertEqual(HeldTransition.objects.filter(application=application).count(), 1)

        # Still blocked: eligibility not reviewed.
        with patch("jobs.tasks.send_assessment_link.apply_async"):
            self.assertEqual(retry_held_transitions(), 0)
        application.refresh_from_db()
        self.assertEqual(application.status, "APPLIED")

        application.eligibility_checks.update(status="PASS", reviewed_at=timezone.now())
        with patch("jobs.tasks.send_assessment_link.apply_async") as invite, self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(retry_held_transitions(), 1)
        application.refresh_from_db()
        hold.refresh_from_db()
        self.assertEqual(application.status, "REVIEWED")
        self.assertEqual(hold.status, "RESOLVED")
        invite.assert_called_once()

    def test_hold_is_superseded_when_application_already_moved(self):
        from jobs.transitions import record_held_transition, retry_hold

        application = self._application("moved@example.com")
        hold = record_held_transition(application, source="assessment", target_status="INTERVIEW_SCHEDULED", reason="x")
        JobApplication.objects.filter(id=application.id).update(status="REJECTED")
        self.assertEqual(retry_hold(hold), "superseded")
        application.refresh_from_db()
        self.assertEqual(application.status, "REJECTED")

    def test_recovery_queue_lists_scopes_and_acts(self):
        from jobs.models import ApplicationNotification as N, HeldTransition
        from jobs.transitions import record_held_transition

        application = self._application("queue@example.com")
        hold = record_held_transition(application, source="resume_screening", target_status="REVIEWED", reason="Awaiting review")
        dead = N.objects.create(application=application, kind="practical_booked", dedupe_key="q:1", status=N.Status.DEAD, last_error="boom")

        response = self.client.get("/api/jobs/recovery-queue/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([item["id"] for item in response.data["holds"]], [hold.id])
        self.assertEqual([item["id"] for item in response.data["notifications"]], [dead.id])

        # Another company's rep sees nothing and cannot act.
        from rest_framework.test import APIClient

        other_rep = CustomUser.objects.create_company_user(username="other-rep", email="other-rep@example.com", password="x")
        other_rep.verified = True
        other_rep.save(update_fields=["verified"])
        Company.objects.create(company_name="Other Co", company_rep=other_rep)
        other = APIClient()
        other.force_authenticate(user=other_rep)
        self.assertEqual(other.get("/api/jobs/recovery-queue/").data["holds"], [])
        self.assertEqual(other.post(f"/api/jobs/recovery-queue/holds/{hold.id}/dismiss/").status_code, 404)

        self.assertEqual(self.client.post(f"/api/jobs/recovery-queue/holds/{hold.id}/retry/").data["result"], "blocked")
        with patch("jobs.tasks.deliver_application_notification.delay"), self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.post(f"/api/jobs/recovery-queue/notifications/{dead.id}/retry/").data["result"], "queued")
        dead.refresh_from_db()
        self.assertEqual(dead.status, "PENDING")
        self.assertEqual(self.client.post(f"/api/jobs/recovery-queue/holds/{hold.id}/dismiss/", {"note": "handled by phone"}, format="json").data["result"], "dismissed")
        self.assertEqual(HeldTransition.objects.get(id=hold.id).status, "DISMISSED")


class SignedInAndAssistedIntakeTests(TestCase):
    """Every entry route enforces the same published journey (UPG-04)."""

    setUp = EligibilityReviewFoundationTests.setUp
    _job_data = EligibilityReviewFoundationTests._job_data
    _publish_job = EligibilityReviewFoundationTests._publish_job

    def _talent_client(self, name="signed-in", *, resume=False, linkedin=""):
        from rest_framework.test import APIClient

        user = CustomUser.objects.create_talent_user(
            username=name, email=f"{name}@example.com", password="x"
        )
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        profile = TalentProfile.objects.create(user=user, full_name=name.title(), linkedin_url=linkedin)
        client = APIClient()
        client.force_authenticate(user=user)
        return client, profile

    def _job(self, *, assisted=False, **overrides):
        job = self._publish_job(**overrides)
        configuration = job.get_application_configuration()
        configuration["intake"] = {"assisted": assisted}
        job.application_configuration = configuration
        job.save(update_fields=["application_configuration"])
        return job

    def _declarations(self):
        return json.dumps({"right-to-work": True, "driving-licence": True})

    # ---------------- signed-in parity

    def test_signed_in_application_enforces_extra_answer_and_records_eligibility(self):
        job = self._publish_job()
        configuration = job.get_application_configuration()
        configuration["additional_info"]["required"] = True
        job.application_configuration = configuration
        job.save(update_fields=["application_configuration"])
        client, profile = self._talent_client("parity")

        missing = client.post(f"/api/jobs/apply/{job.apply_token}/apply/", {"eligibility_declarations": self._declarations()}, format="multipart")
        self.assertEqual(missing.status_code, 400, missing.data)
        self.assertIn("additional_info", str(missing.data))

        with patch("jobs.views.carry_out_resume_analysis.delay"):
            ok = client.post(
                f"/api/jobs/apply/{job.apply_token}/apply/",
                {"additional_info": "Three years delivering.", "eligibility_declarations": self._declarations()},
                format="multipart",
            )
        self.assertEqual(ok.status_code, 201, ok.data)
        application = JobApplication.objects.get(applicant=profile, job=job)
        self.assertEqual(application.additional_info, "Three years delivering.")
        self.assertEqual(application.eligibility_checks.count(), 2)  # declarations are not dropped

    def test_signed_in_application_requires_published_work_sample_and_scenario(self):
        job = self._publish_job()
        job.work_sample_configuration = {"enabled": True, "required": True, "prompt": "Upload a plan.", "instructions": ""}
        job.scenario_configuration = {"enabled": True, "required": True, "prompt": "What would you do?", "instructions": "", "response_label": "Answer"}
        job.save(update_fields=["work_sample_configuration", "scenario_configuration"])
        client, profile = self._talent_client("journey")
        base = {"additional_info": "Experienced.", "eligibility_declarations": self._declarations()}

        response = client.post(f"/api/jobs/apply/{job.apply_token}/apply/", base, format="multipart")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("work_sample", str(response.data))

        sample = SimpleUploadedFile("plan.csv", b"a,b\n1,2\n", content_type="text/csv")
        response = client.post(f"/api/jobs/apply/{job.apply_token}/apply/", {**base, "work_sample": sample}, format="multipart")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("scenario_response", str(response.data))

        sample = SimpleUploadedFile("plan.csv", b"a,b\n1,2\n", content_type="text/csv")
        with patch("jobs.tasks.scan_application_work_sample.delay"), self.captureOnCommitCallbacks(execute=True), patch(
            "jobs.views.carry_out_resume_analysis.delay"
        ):
            response = client.post(
                f"/api/jobs/apply/{job.apply_token}/apply/",
                {**base, "work_sample": sample, "scenario_response_text": "I would call dispatch first."},
                format="multipart",
            )
        self.assertEqual(response.status_code, 201, response.data)
        application = JobApplication.objects.get(applicant=profile, job=job)
        self.assertEqual(application.work_samples.get().scan_status, "PENDING")
        self.assertEqual(application.scenario_response.response, "I would call dispatch first.")

    def test_token_application_route_cannot_sidestep_requirements(self):
        job = self._publish_job()
        client, profile = self._talent_client("token-route")
        # No eligibility declarations / extra answers were possible before; the
        # token route now runs the same journey validation.
        response = client.post(f"/api/jobs/apply/{job.apply_token}/apply/", {}, format="multipart")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("error", response.data)

        with patch("jobs.views.carry_out_resume_analysis.delay"):
            response = client.post(
                f"/api/jobs/apply/{job.apply_token}/apply/",
                {"additional_info": "Experienced.", "eligibility_declarations": self._declarations()},
                format="multipart",
            )
        self.assertEqual(response.status_code, 201, response.data)
        application = JobApplication.objects.get(applicant=profile, job=job)
        self.assertTrue(application.is_external_application)
        self.assertEqual(application.eligibility_checks.count(), 2)

    # ---------------- assisted / phone intake

    def _assisted(self, client, job, **overrides):
        data = {
            "full_name": "Phone Candidate",
            "phone_number": "+234 801 234 5678",
            "channel": "PHONE",
            "consent_confirmed": True,
            "additional_info": "Ten years driving.",
            "eligibility_declarations": self._declarations(),
        }
        data.update(overrides)
        with patch("jobs.views.carry_out_resume_analysis.delay"), patch("jobs.views.emails.application_received_mail"):
            return client.post(f"/api/jobs/{job.public_id}/assisted-applications/", data, format="multipart")

    def test_assisted_intake_is_off_by_default_and_requires_consent_and_role(self):
        job = self._job(assisted=False)
        response = self._assisted(self.client, job)
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("not enabled", str(response.data))

        job = self._job(assisted=True)
        self.assertEqual(self._assisted(self.client, job, consent_confirmed=False).status_code, 400)
        self.assertEqual(self._assisted(self.client, job, phone_number="0801234567").status_code, 400)
        stranger, _profile = self._talent_client("outsider")
        self.assertEqual(self._assisted(stranger, job).status_code, 403)

    def test_phone_only_candidate_is_recorded_deduped_and_flagged_for_phone_follow_up(self):
        from jobs.models import ApplicationNotification as N

        job = self._job(assisted=True)
        response = self._assisted(self.client, job)
        self.assertEqual(response.status_code, 201, response.data)
        application = JobApplication.objects.get(job=job)
        self.assertEqual(application.guest_phone_number, "+2348012345678")
        self.assertEqual(application.guest_email, "")
        self.assertEqual(application.intake_channel, "PHONE")
        self.assertEqual(application.intake_by_id, self.rep.id)
        self.assertIsNotNone(application.intake_consent_at)
        self.assertEqual(application.eligibility_checks.count(), 2)

        with self.captureOnCommitCallbacks(execute=True):
            pass
        note = N.objects.get(application=application, kind="contact_by_phone")
        from jobs.notifications import deliver

        with patch("jobs.tasks.deliver_application_notification.delay"):
            deliver(note.id)
        note.refresh_from_db()
        self.assertEqual(note.status, "SKIPPED")
        queue = self.client.get("/api/jobs/recovery-queue/")
        self.assertEqual([item["id"] for item in queue.data["notifications"]], [note.id])

        # Same phone again, in a different format: rejected.
        duplicate = self._assisted(self.client, job, phone_number="+2348012345678")
        self.assertEqual(duplicate.status_code, 400, duplicate.data)
        # A second phone-only candidate (blank email) must not collide on email.
        second = self._assisted(self.client, job, full_name="Second Person", phone_number="+2348099999999")
        self.assertEqual(second.status_code, 201, second.data)

    def test_assisted_intake_enforces_published_requirements_and_daily_cap(self):
        job = self._job(assisted=True)
        job.scenario_configuration = {"enabled": True, "required": True, "prompt": "Scenario?", "instructions": "", "response_label": "Answer"}
        job.save(update_fields=["scenario_configuration"])
        response = self._assisted(self.client, job)
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("scenario_response", str(response.data))

        job.scenario_configuration = {}
        job.save(update_fields=["scenario_configuration"])
        with self.settings(ASSISTED_INTAKE_DAILY_LIMIT=1):
            self.assertEqual(self._assisted(self.client, job).status_code, 201)
            capped = self._assisted(self.client, job, full_name="Another", phone_number="+2348077777777")
            self.assertEqual(capped.status_code, 400, capped.data)
            self.assertIn("limit", str(capped.data))

    def test_email_dependent_invitations_are_flagged_not_sent_for_phone_only(self):
        from jobs.models import ApplicationNotification as N
        from jobs.tasks import send_assessment_link

        job = self._job(assisted=True)
        self._assisted(self.client, job)
        application = JobApplication.objects.get(job=job)
        application.eligibility_checks.update(status="PASS", reviewed_at=timezone.now())
        with patch("jobs.tasks.deliver_application_notification.delay"):
            result = send_assessment_link(application.id)
        self.assertIn("phone follow-up", result)
        self.assertTrue(N.objects.filter(application=application, dedupe_key__startswith="contact_by_phone:assessment").exists())
