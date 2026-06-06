from django.core.management.base import BaseCommand
import json
from utils.ai_service import AIService
from jobs.models import Job


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        data = {}

        for job in Job.objects.filter(role__is_technical=True).select_related('role'):
            job_id = job.id
            data[job_id] = []

            questions = []

            multistage_assessment = AIService.get_multistage_technical_assessment(
                job_description=job.description,
                mcq_questions=15,
                coding_questions=3
            )
            if multistage_assessment:
                mcq_questions = multistage_assessment.get("mcq_questions", [])
                if mcq_questions:
                    questions.extend(mcq_questions)

                coding_questions = multistage_assessment.get("coding_questions", [])
                if coding_questions:
                    questions.extend(coding_questions)

                data[job_id].extend(questions)

        for job in Job.objects.filter(role__is_technical=False):
            job_id = job.id
            data[job_id] = []

            non_technical_mcq_questions = AIService.get_non_technical_mcq_questions(
                job_description=job.description,
                num_questions=15
            )
            if non_technical_mcq_questions:
                data[job_id].extend(non_technical_mcq_questions)

        with open('tqb.json', 'w') as file:
            json.dump(data, file, indent=2)

        self.stdout.write(self.style.SUCCESS("Completed"))
