"""Tests for the proctoring-triggered forced end of an assessment attempt.

The bug these cover: useProctoring used to complete the proctoring session
(which force-completes AND grades the attempt server-side) *before* the
frontend had submitted the candidate's in-progress answers. force_complete_
submission then backfilled blank rows for the section they were mid-way
through, and grading scored the blanks. See useProctoring.forceSubmit.
"""

from unittest.mock import patch

from django.test import TestCase

from create_user.models import CustomUser, TalentProfile
from skill_assessment.models import (
    CandidateAssessmentSectionSubmission,
    CandidateAssessmentSubmission,
    GeneralSkillAssessment,
    GeneralSkillAssessmentSection,
)
from skill_assessment.views import force_complete_submission


class ForceCompleteSubmissionTests(TestCase):
    def setUp(self):
        user = CustomUser.objects.create_talent_user(
            username="proctor-candidate",
            email="proctor-candidate@example.com",
            password="x",
        )
        self.talent = TalentProfile.objects.create(user=user, full_name="Test Candidate")
        self.assessment = GeneralSkillAssessment.objects.create(
            title="Proctoring test", duration_minutes=30, passing_grade=70
        )
        self.section_reached = GeneralSkillAssessmentSection.objects.create(
            name="Reached", company_skill_assessment=self.assessment, type="MCQ"
        )
        self.section_unreached = GeneralSkillAssessmentSection.objects.create(
            name="Never reached", company_skill_assessment=self.assessment, type="MCQ"
        )
        self.submission = CandidateAssessmentSubmission.objects.create(
            candidate=self.talent, skill_assessment=self.assessment
        )

    def _force(self, reason="Exceeded maximum tab switches (5)."):
        with patch(
            "skill_assessment.views.mark_skill_assessment_submission.delay"
        ) as delay:
            force_complete_submission(self.submission, reason)
        self.submission.refresh_from_db()
        return delay

    def test_records_auto_submission_and_reason(self):
        self._force()
        self.assertTrue(self.submission.is_completed)
        self.assertTrue(self.submission.auto_submitted)
        self.assertEqual(
            self.submission.auto_submit_reason, "Exceeded maximum tab switches (5)."
        )

    def test_grading_is_dispatched(self):
        """A forced end must still produce a real, scored result."""
        delay = self._force()
        delay.assert_called_once_with(skill_assessment_submission_id=self.submission.id)

    def test_answered_section_is_not_overwritten_with_a_blank(self):
        """The ordering fix's payload: a section the candidate already
        submitted must survive the forced completion untouched, and only the
        genuinely unreached section gets a blank row."""
        answered = CandidateAssessmentSectionSubmission.objects.create(
            skill_assessment_section=self.section_reached
        )
        self.submission.skill_assessment_section_submissions.add(answered)

        self._force()

        rows = self.submission.skill_assessment_section_submissions.all()
        self.assertEqual(rows.count(), 2, "expected one row per section, no duplicates")
        for section in (self.section_reached, self.section_unreached):
            self.assertEqual(
                rows.filter(skill_assessment_section=section).count(),
                1,
                f"section {section.name} should have exactly one submission row",
            )
        self.assertEqual(
            rows.filter(skill_assessment_section=self.section_reached).first().id,
            answered.id,
            "the candidate's own section submission was replaced by a blank",
        )

    def test_is_idempotent_once_completed(self):
        self._force()
        self.submission.auto_submit_reason = "first reason"
        self.submission.save(update_fields=["auto_submit_reason"])

        delay = self._force(reason="second reason")
        delay.assert_not_called()
        self.assertEqual(self.submission.auto_submit_reason, "first reason")
