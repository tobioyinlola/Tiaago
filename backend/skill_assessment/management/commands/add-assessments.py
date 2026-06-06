import csv
import uuid
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from skill_assessment.models import (
    GeneralSkillAssessment,
    GeneralSkillAssessmentMCQQuestion,
    GeneralSkillAssessmentSection,
)
from skill_assessment.constants import (
    QuestionBankDifficultyLevels,
    SkillAssessmentTypes,
    SkillAssessmentDifficultyLevels
)
from roles.models import Role

logger = logging.getLogger("__assessment__")

assessment_csv_files = [
    {
        "file": "skill_assessment/assessments/Community_Management_Intermediate-level_Assessment_1_.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.INTERMEDIATE,
        "assessment_name": "Community Management Intermediate Level (Intermediate)",
        "skillsets": "Community Management",
    },
    {
        "file": "skill_assessment/assessments/Community_Management_Junior_Assessment.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "Community Management Junior Level (Junior)",
        "skillsets": "Community Management",
    },
    {
        "file": "skill_assessment/assessments/Content_Writer_Junior_Assessment.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "Content Writer Junior Level (Junior)",
        "skillsets": "Content Writing",
    },
    {
        "file": "skill_assessment/assessments/Customer_Support_Intermediate_Assessment_.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.INTERMEDIATE,
        "assessment_name": "Customer Support Intermediate Level (Intermediate)",
        "skillsets": "Customer Support",
    },
    {
        "file": "skill_assessment/assessments/Customer_Support_Junior-Assessment_.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "Customer Support Junior Level (Junior)",
        "skillsets": "Customer Support",
    },
    {
        "file": "skill_assessment/assessments/Customer_Support_Senior_Assessment_.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.SENIOR,
        "assessment_name": "Customer Support Senior Level (Senior)",
        "skillsets": "Customer Support",
    },
    {
        "file": "skill_assessment/assessments/Django Intermediate level.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.INTERMEDIATE,
        "assessment_name": "Django Intermediate Level (Intermediate)",
        "skillsets": "Django",
    },
    {
        "file": "skill_assessment/assessments/Django Junior Level.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "Django Junior Level (Junior)",
        "skillsets": "Django",
    },
    {
        "file": "skill_assessment/assessments/Django Senior Level.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.SENIOR,
        "assessment_name": "Django Senior Level (Senior)",
        "skillsets": "Django",
    },
    {
        "file": "skill_assessment/assessments/FastApi Intermediate level.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.INTERMEDIATE,
        "assessment_name": "FastAPI Intermediate Level (Intermediate)",
        "skillsets": "FastAPI",
    },
    {
        "file": "skill_assessment/assessments/Fastapi Junior.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "FastAPI Junior Level (Junior)",
        "skillsets": "FastAPI",
    },
    {
        "file": "skill_assessment/assessments/FastAPI Senior.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.SENIOR,
        "assessment_name": "FastAPI Senior Level (Senior)",
        "skillsets": "FastAPI",
    },
    {
        "file": "skill_assessment/assessments/NodeJs Intermediate level.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.INTERMEDIATE,
        "assessment_name": "NodeJS Intermediate Level (Intermediate)",
        "skillsets": "NodeJS",
    },
    {
        "file": "skill_assessment/assessments/NodeJs Junior level.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "NodeJS Junior Level (Junior)",
        "skillsets": "NodeJS",
    },
    {
        "file": "skill_assessment/assessments/NodeJs Senior.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.SENIOR,
        "assessment_name": "NodeJS Senior Level (Senior)",
        "skillsets": "NodeJS",
    },
    {
        "file": "skill_assessment/assessments/PM intermediate mcq.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.INTERMEDIATE,
        "assessment_name": "Product Management Intermediate MCQ (Intermediate)",
        "skillsets": "Product Management",
    },
    {
        "file": "skill_assessment/assessments/Product Management Junior Level (1).csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "Product Management Junior Level (Junior)",
        "skillsets": "Product Management",
    },
    {
        "file": "skill_assessment/assessments/Product Management Senior (1).csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.SENIOR,
        "assessment_name": "Product Management Senior Level (Senior)",
        "skillsets": "Product Management",
    },
    {
        "file": "skill_assessment/assessments/Product_Design_Intermediate.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.INTERMEDIATE,
        "assessment_name": "Product Design Intermediate Level (Intermediate)",
        "skillsets": "Product Design",
    },
    {
        "file": "skill_assessment/assessments/Product_Design_Senior.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.SENIOR,
        "assessment_name": "Product Design Senior Level (Senior)",
        "skillsets": "Product Design",
    },
    {
        "file": "skill_assessment/assessments/Product_Designer_Junior.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "Product Design Junior Level (Junior)",
        "skillsets": "Product Design",
    },
    {
        "file": "skill_assessment/react_mcq_assessment_intermediate.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.INTERMEDIATE,
        "assessment_name": "React Intermediate Level (Intermediate)",
        "skillsets": "React",
    },
    {
        "file": "skill_assessment/react_mcq_assessment_junior.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.JUNIOR,
        "assessment_name": "React Junior Level (Junior)",
        "skillsets": "React",
    },
    {
        "file": "skill_assessment/react_mcq_assessment_senior.csv",
        "difficulty_level": SkillAssessmentDifficultyLevels.SENIOR,
        "assessment_name": "React Senior Level (Senior)",
        "skillsets": "React",
    },
]


class Command(BaseCommand):
    help = "Create Talent Assessments"

    def _load_roles_cache(self):
        """
        Preload all roles into a dictionary for faster lookup.
        """
        return {role.title.lower(): role for role in Role.objects.all()}

    def _get_or_create_role(self, title, roles_cache):
        key = title.lower()
        if key not in roles_cache:
            role = Role.objects.create(title=title)
            roles_cache[key] = role
        return roles_cache[key]

    def get_mcq_questions_from_file(self, file_name, roles_cache):
        """
        Read MCQ questions from CSV and prepare them for bulk creation.
        Returns a list of GeneralSkillAssessmentMCQQuestion (not saved yet).
        """
        questions_to_create = []
        try:
            logger.info(f"Attempting to open file: {file_name}")
            with open(file_name, newline="", encoding="utf-8") as file:
                logger.info(f"Successfully opened file: {file_name}")
                reader = csv.reader(file)
                next(reader, None)  # skip header
                for row in reader:
                    if len(row) < 8:
                        continue  # skip malformed rows
                    (
                        category,
                        question_text,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        answer,
                        _difficulty,
                    ) = row

                    # Ensure role exists
                    self._get_or_create_role(category, roles_cache)

                    # Determine correct option index
                    answer_lower = answer.lower().strip()
                    options = [
                        {"index": 1, "value": option_a},
                        {"index": 2, "value": option_b},
                        {"index": 3, "value": option_c},
                        {"index": 4, "value": option_d},
                    ]
                    correct_option_index = None
                    if answer_lower == option_a.lower():
                        correct_option_index = 1
                    elif answer_lower == option_b.lower():
                        correct_option_index = 2
                    elif answer_lower == option_c.lower():
                        correct_option_index = 3
                    elif answer_lower == option_d.lower():
                        correct_option_index = 4
                    elif "all of the above" in answer_lower:
                        correct_option_index = 1000

                    if correct_option_index:
                        questions_to_create.append(
                            GeneralSkillAssessmentMCQQuestion(
                                question=question_text,
                                options=options,
                                correct_option_index=correct_option_index,
                            )
                        )
        except Exception as e:
            logger.error(f"Error reading file {file_name}: {str(e)}")
            self.stdout.write(
                self.style.ERROR(f"Error reading file {file_name}: {str(e)}")
            )
        return questions_to_create

    def handle(self, *args, **kwargs):
        roles_cache = self._load_roles_cache()
        for assessment in assessment_csv_files:
            file_path = assessment.get("file")
            difficulty_level = assessment.get("difficulty_level")
            assessment_name = assessment.get("assessment_name")
            skillsets_name = assessment.get("skillsets")
            if not file_path or not difficulty_level or not assessment_name or not skillsets_name:
                self.stdout.write(
                    self.style.ERROR(
                        f"Missing required fields in assessment configuration: {assessment}"
                    )
                )
                continue
            try:
                # Prepare questions
                questions_to_create = self.get_mcq_questions_from_file(
                    file_path, roles_cache
                )
                print(f"Processing {assessment_name} with {len(questions_to_create)} questions.")

                if not questions_to_create:
                    self.stdout.write(
                        self.style.WARNING(
                            f"No valid questions in {file_path}, skipping."
                        )
                    )
                    continue

                # Bulk create MCQ questions
                try:
                    GeneralSkillAssessmentMCQQuestion.objects.bulk_create(
                        questions_to_create, ignore_conflicts=True
                    )
                    mcq_questions = GeneralSkillAssessmentMCQQuestion.objects.filter(
                        question__in=[q.question for q in questions_to_create]
                    )
                except Exception as e:
                    logger.error(f"Bulk create failed for {assessment_name}: {e}")
                    self.stdout.write(
                        self.style.ERROR(
                            f"Bulk create failed for {assessment_name}: {e}"
                        )
                    )
                    continue

                # Create assessment and sections
                with transaction.atomic():
                    skill_assessment = GeneralSkillAssessment.objects.create(
                        title=assessment_name,
                        published=True,
                        difficulty_level=difficulty_level,
                        description=assessment_name,
                        duration_minutes=20,
                        passing_grade=70,
                        reference=str(uuid.uuid4().hex)[:15],
                        assessment_type=SkillAssessmentTypes.MCQ,
                    )

                    mcq_section = GeneralSkillAssessmentSection.objects.create(
                        name="Section 1",
                        company_skill_assessment=skill_assessment,
                        type=SkillAssessmentTypes.MCQ,
                    )
                    mcq_section.mcq_questions.set(mcq_questions)

                    # Set skillsets
                    skillsets = Role.objects.filter(title__icontains=skillsets_name)
                    skill_assessment.skillsets.set(skillsets)

                self.stdout.write(
                    self.style.SUCCESS(f"Created assessment {assessment_name}")
                )

            except Exception as e:
                logger.error(f"Error creating assessment {assessment_name}: {str(e)}")
                self.stdout.write(
                    self.style.ERROR(
                        f"Error creating assessment {assessment_name}: {str(e)}"
                    )
                )
                continue

        self.stdout.write(self.style.SUCCESS("All assessments processed."))
# This code is a Django management command to create skill assessments from CSV files.
# It reads MCQ questions, creates roles if they don't exist, and bulk creates assessments and
