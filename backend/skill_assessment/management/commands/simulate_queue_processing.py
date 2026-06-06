from django.core.management.base import BaseCommand
from time import sleep
from skill_assessment.models import InterviewSessionQueue

MAX_CONCURRENT_SESSIONS = 5
PROCESSING_BATCH_TIME = 10  # Seconds to simulate a session run


class Command(BaseCommand):
    help = "Simulates ElevenLabs queue with 5 concurrent sessions"

    def handle(self, *args, **kwargs):
        self.stdout.write("🎬 Starting queue simulation...")

        while True:
            in_progress_count = InterviewSessionQueue.objects.filter(status="in_progress").count()
            available_slots = MAX_CONCURRENT_SESSIONS - in_progress_count

            if available_slots > 0:
                next_batch = InterviewSessionQueue.objects.filter(status="queued").order_by("position")[:available_slots]
                if not next_batch.exists():
                    self.stdout.write("✅ No more queued sessions. All processed.")
                    break

                for queue_entry in next_batch:
                    queue_entry.status = "in_progress"
                    queue_entry.save()
                    self.stdout.write(f"🟢 Started session {queue_entry.session.id} at position {queue_entry.position}")

            else:
                self.stdout.write("⏳ Max sessions in progress. Waiting...")

            # Simulate processing time
            sleep(PROCESSING_BATCH_TIME)

            # Simulate completing the first batch (you can randomize this if needed)
            to_complete = InterviewSessionQueue.objects.filter(status="in_progress")[:available_slots]
            for session in to_complete:
                session.status = "completed"
                session.save()
                self.stdout.write(f"✅ Completed session {session.session.id}")

        self.stdout.write(self.style.SUCCESS("🎉 Queue processing simulation completed."))
