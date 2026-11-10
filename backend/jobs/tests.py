"""Pipeline stage transition tests.

Covers the split of the single "interview" stage into separate AI_INTERVIEW
and HUMAN_INTERVIEW stages: the AI interview gates the human one on the job's
ai_interview_pass_mark, and "Interview scheduled" only means something is
actually booked.
"""

import json
from datetime import timedelta
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
        with patch("jobs.views.emails.application_received_mail"), patch(
            "jobs.views.carry_out_resume_analysis.delay"
        ):
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
        response = self.client.post(
            f"/api/jobs/job-applications/{application.id}/practical-assessments/",
            {"slot_id": retry_slot["id"]},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
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
