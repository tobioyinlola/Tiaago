from django.test import TestCase
from create_user.models import Company, CustomUser, TalentProfile
from jobs.models import Job, JobApplication
from .models import GeneralSkillAssessment, PreScreeningInterviewSession, InterviewSessionQueue
from .services import queue_or_start_session, complete_session, activate_next_queued_session


# Create your tests here.
class InterviewQueueTestCase(TestCase):
    def setUp(self):
        rep = CustomUser.objects.create_company_user(username="queue-recruiter", email="queue-recruiter@example.com")
        company = Company.objects.create(company_rep=rep, company_name="Queue Test")
        user = CustomUser.objects.create_talent_user(username="queue-talent", email="queue-talent@example.com")
        candidate = TalentProfile.objects.create(user=user)
        job = Job.objects.create(company=company, role="Engineer", job_type="FT")
        application = JobApplication.objects.create(job=job, applicant=candidate)
        assessment = GeneralSkillAssessment.objects.create(
            company=company, title="Queue Test", difficulty_level="beginner",
            description="Queue fixture", duration_minutes=10, passing_grade=70,
        )
        self.candidate_id = candidate.pk
        self.job_application_id = application.pk
        self.assessment_id = assessment.pk

    def create_session(self):
        return PreScreeningInterviewSession.objects.create(
            candidate_id=self.candidate_id,
            job_application_id=self.job_application_id,
            assessment_id=self.assessment_id,
            conversation_id="cid",
            total_points=0,
            final_evaluation="pending"
        )
    def test_queuing_logic(self):
        sessions = [self.create_session() for _ in range(7)]
        queue_entries = [queue_or_start_session(session) for session in sessions]

        in_progress = InterviewSessionQueue.objects.filter(status="in_progress")
        queued = InterviewSessionQueue.objects.filter(status="queued")

        self.assertEqual(in_progress.count(), 5)
        self.assertEqual(queued.count(), 2)

        # Validate queue positions
        positions = list(queued.values_list("position", flat=True))
        self.assertEqual(positions, [1, 2])

        # Complete one and verify one queued becomes active
        complete_session(in_progress.first())
        # The completion endpoint explicitly activates the next entry.
        activate_next_queued_session()

        self.assertEqual(
            InterviewSessionQueue.objects.filter(status="in_progress").count(), 5
        )
        self.assertEqual(
            InterviewSessionQueue.objects.filter(status="queued").count(), 1
        )

        # Validate position reindexing
        positions = list(
            InterviewSessionQueue.objects.filter(status="queued").values_list("position", flat=True)
        )
        self.assertEqual(positions, [1])
