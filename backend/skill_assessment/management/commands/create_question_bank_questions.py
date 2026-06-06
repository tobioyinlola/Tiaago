from django.core.management.base import BaseCommand
from skill_assessment.constants import QuestionBankDifficultyLevels
import random
import json
from utils.ai_service import AIService
from roles.models import Role
from jobs.models import Job


valid_difficulty_levels = [
    QuestionBankDifficultyLevels.BEGINNER,
    QuestionBankDifficultyLevels.INTERMEDIATE,
    QuestionBankDifficultyLevels.ADVANCED,
]


class Command(BaseCommand):
    help = "Create Questions for the question bank"

    def handle(self, *args, **kwargs):
        data = {}
        for role in Role.objects.filter(is_technical=True):
            data[role.title] = []
        for role_name in data:
            mcq_questions = AIService.get_mcq_questions(
                job_field=role_name,
                difficulty=random.choice(valid_difficulty_levels),
                num_questions=15,
            )
            if mcq_questions:
                data[role_name].extend(mcq_questions)
            coding_questions = AIService.get_coding_questions(
                role_name, random.choice(valid_difficulty_levels), num_questions=2
            )
            if coding_questions:
                data[role_name].extend(coding_questions)
        file = open("qb.json", "w")
        json.dump(data, file)
        file.close()
        self.stdout.write(self.style.SUCCESS("Completed"))
