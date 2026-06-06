from django.test import TestCase
from .models import PreScreeningInterviewSession, InterviewSessionQueue
from .services import queue_or_start_session, complete_session


# Create your tests here.
class InterviewQueueTestCase(TestCase):
    def setUp(self):
        self.candidate_id = 1  # Setup a TalentProfile object and use its ID
        self.job_application_id = 1
        self.assessment_id = 1

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