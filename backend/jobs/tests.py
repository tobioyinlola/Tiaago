"""Pipeline stage transition tests.

Covers the split of the single "interview" stage into separate AI_INTERVIEW
and HUMAN_INTERVIEW stages: the AI interview gates the human one on the job's
ai_interview_pass_mark, and "Interview scheduled" only means something is
actually booked.
"""

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from ai_interviews.models import AIInterview
from ai_interviews.tasks import _advance_on_ai_interview_result
from create_user.models import Company, CustomUser, TalentProfile
from jobs.models import Job, JobApplication
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
