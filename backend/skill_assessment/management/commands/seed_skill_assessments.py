from uuid import uuid4
from django.core.management.base import BaseCommand
from django.utils import timezone
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

from create_user.models import TalentProfile, Company
from roles.models import Role
from jobs.models import Job, JobApplication
from skill_assessment.models import (
    GeneralSkillAssessment,
    GeneralSkillAssessmentSection,
    GeneralSkillAssessmentMCQQuestion,
    PreScreeningInterviewSession,
    InterviewSessionQueue,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seed data for 7 talents with interview sessions and queues"

    def handle(self, *args, **kwargs):
        role, _ = Role.objects.get_or_create(title="Backend Developer")

        company_user, _ = User.objects.get_or_create(
            email="rep@company.com",
            defaults={
                "username": "companyrep",
                "first_name": "Rep",
                "last_name": "Company",
                "user_type": User.USER_TYPE.COMPANY_REP,
                "phone_number": "+2348100000000",
                "country": "Nigeria",
                "bio": "Company Rep",
                "is_active": True,
                "is_verified": True,
            },
        )
        EmailAddress.objects.get_or_create(
            user=company_user, email=company_user.email, verified=True, primary=True
        )

        company, _ = Company.objects.get_or_create(
            company_rep=company_user,
            defaults={"company_name": "TestCorp", "country": "Nigeria", "role": "HR"},
        )

        job, _ = Job.objects.get_or_create(
            title="Backend Engineer",
            company=company,
            role=role,
            defaults={
                "tags": ["Python", "Django"],
                "salary_duration": "M",
                "min_salary": 4000,
                "max_salary": 7000,
                "currency": "USD",
                "experience": 3,
                "job_type": "FT",
                "job_level": "JUNIOR",
                "job_status": "ACTIVE",
                "hiring_type": "WITH_AI",
                "country": "Nigeria",
                "city": "Lagos",
                "description": "A backend job using Django",
            },
        )

        assessment = GeneralSkillAssessment.objects.create(
            company=company,
            title="Backend Assessment",
            difficulty_level="Intermediate",
            description="Test backend knowledge",
            duration_minutes=45,
            passing_grade=70.0,
            reference=str(uuid4()),
            assessment_type="MCQ",
            published=True,
        )
        assessment.skillsets.add(role)

        question = GeneralSkillAssessmentMCQQuestion.objects.create(
            question="What is ORM in Django?",
            options=[
                {"value": "Object Relational Mapper", "index": 1},
                {"value": "Optional Rendering Mode", "index": 2},
                {"value": "Object Rendering Model", "index": 3},
                {"value": "Online Record Model", "index": 4},
            ],
            correct_option_index=1,
        )

        section = GeneralSkillAssessmentSection.objects.create(
            name="Backend Basics",
            company_skill_assessment=assessment,
            type="MCQ",
        )
        section.mcq_questions.add(question)

        for i in range(1, 8):
            email = f"talent{i}@test.com"
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": f"talent{i}",
                    "first_name": f"Talent{i}",
                    "last_name": "User",
                    "user_type": User.USER_TYPE.TALENT,
                    "phone_number": f"+234801000000{i}",
                    "country": "Nigeria",
                    "bio": "Backend Developer",
                    "is_active": True,
                    "is_verified": True,
                },
            )
            EmailAddress.objects.get_or_create(user=user, email=email, verified=True, primary=True)

            profile, _ = TalentProfile.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": f"Talent {i}",
                    "country": "Nigeria",
                    "experience_level": "Intermediate",
                    "role": role,
                },
            )

            application, _ = JobApplication.objects.get_or_create(
                applicant=profile,
                job=job,
                defaults={"cover_letter": f"I'm talent{i} applying for the backend role"}
            )

            session = PreScreeningInterviewSession.objects.create(
                candidate=profile,
                job_application=application,
                assessment=assessment,
                conversation_id=str(uuid4()),
                total_points=0,
                final_evaluation="pending",
                agent_comment="",
            )

            InterviewSessionQueue.objects.create(
                session=session,
                position=i,
                status="queued",
            )

        self.stdout.write(self.style.SUCCESS("✅ Seeded 7 talents and their interview queues."))
