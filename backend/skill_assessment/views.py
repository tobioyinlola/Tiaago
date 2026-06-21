import uuid
from django.forms import ValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.http import FileResponse
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView, GenericAPIView
from rest_framework import generics
from asgiref.sync import async_to_sync
from django.db.models import Q
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotFound
from django.core.files.uploadhandler import TemporaryFileUploadHandler

from base.mixins.pagination import PaginationHandlerMixin
from rest_framework.permissions import IsAuthenticated
from base.permissions import (
    IsCompanyRepOrTalentUser,
    IsCompanyRepOrStaffUser,
    IsStaffUser,
)
from create_user.utils import User
from create_user.permissions import user_is_company_role, get_company_membership
from create_user.models import CompanyTeamMember
from skill_assessment.constants import SkillAssessmentTypes
from create_user.models import TalentProfile

from skill_assessment.tasks import mark_skill_assessment_submission
from .filters import GeneralSkillAssessmentFilter
from .models import (
    CandidateAssessmentMCQAnswer,
    CandidateAssessmentCodingAnswer,
    CandidateAssessmentSectionSubmission,
    CandidateAssessmentSubmission,
    Certificate,
    GeneralSkillAssessment,
    GeneralSkillAssessmentSection,
    GeneralSkillAssessmentSectionMCQ,
    QuestionBankQuestion,
    SkillAssessment,
    GeneralSkillAssessmentMCQQuestion,
    PreScreeningInterviewSession,
    CodingTask,
    TestCase,
    ResumeAnalysis,
    InterviewSessionQueue,
    SkillAssessmentPayment,
    TechStack,
    TalentQuestionBank,
    AssessmentCooldown,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction, IntegrityError
from .permissions import IsTalentOwnerOrStaffUser
from .serializers import (
    CertificatePublicSerializer,
    CertificateRenderInitSerializer,
    CertificateUploadSerializer,
    GeneralSkillAssessmentAnswerSerializer,
    GeneralSkillAssessmentListSerializer,
    GeneralSkillAssessmentSectionSerializer,
    QuestionBankQuestionSerializer,
    SkillAssessmentSerializer,
    GeneralSkillAssessmentCreateSerializer,
    QuestionBankSerializer,
    PreScreeningInterviewResultSerializer,
    SubmissionSerializer,
    AddMCQAssessmentSerializer,
    PreScreeningInterviewSessionSerializer,
    AddCodingAssessmentSerializer,
    AddCodingAssessmentSerializer_V2,
    StartVerificationAssessmentSerializer,
    AIFeedbackSerializer,
    InitiateAssessmentPaymentSerializer,
    TechStackSerializer,
    CertificateWriteSerializer,
    CertificateReadSerializer,
    AssessmentCooldownSerializer,
)
from subscriptions.permissions import (
    IsTalentOrStaffUser,
    IsCompanyRepUser,
    IsTalentUser,
    IsStaffUserOrCompanyRepOrTalentUser
)
from utils.ai_service import AIService
from utils.elevenlabs_handler import elevenlabs_handler
from .services import queue_or_start_session, complete_session, activate_next_queued_session
from jobs.models import JobApplication, Portfolio, Job
from payments.utils import initiate_stripe_payment,initiate_paystack_payment
from loguru import logger
from payments.models import Coupon,CouponUsage
from decimal import Decimal,ROUND_HALF_UP
import json

USD_PRICE = int(settings.USD_PRICE)
NAIRA_EXCHANGE_RATE = int(settings.NAIRA_EXCHANGE_RATE)


base_url = "https://api.daily.co/v1"
base_headers = {
    "Authorization": f"Bearer {settings.DAILY_API_TOKEN}",
    "Content-Type": "application/json",
}


class SkillAssessmentView(ListCreateAPIView):
    """This endpoint was built by the initial Dev. Unsure if it's still functional"""

    queryset = SkillAssessment.objects.all()
    serializer_class = SkillAssessmentSerializer
    permission_classes = (IsTalentOrStaffUser,)

    def get_queryset(self):
        user = self.request.user
        queryset = SkillAssessment.objects.select_related(
            "talent", "talent__user",
        )
        if user.is_talent():
            queryset = queryset.filter(talent=user.profile)

        return queryset


class SkillAssessmentDetailView(RetrieveAPIView):
    """This endpoint was built by the initial Dev. Unsure if it's still functional"""

    queryset = SkillAssessment.objects.all()
    serializer_class = SkillAssessmentSerializer
    permission_classes = (IsTalentOwnerOrStaffUser,)


class GeneralSkillAssessmentAPIView(APIView, PaginationHandlerMixin):
    """
    This endpoint is used to create a skill assessment\n
    [Perm: Company Staff]
    """

    permission_classes = [IsStaffUserOrCompanyRepOrTalentUser]

    def post(self, request):
        if request.user.is_talent():
            return Response(status=401, data={"error": "Unauthorized."})
        # Company reps must be Admin or Recruiter to create company assessments
        if request.user.is_company():
            company = getattr(request.user, "company", None)
            if not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You do not have permission to create assessments for this company."})
        data = GeneralSkillAssessmentCreateSerializer(data=request.data)
        if data.is_valid():
            validated_data = data.validated_data
            skillsets = validated_data.pop("skillsets")
            unique_id = str(uuid.uuid4().hex)[:15]
            company_skill_assessment = GeneralSkillAssessment.objects.create(
                **validated_data, company=request.user.company, reference=unique_id
            )
            company_skill_assessment.skillsets.set(skillsets)
        else:
            print("failed...")
            return Response(status=400, data=data.errors)
        return Response(
            status=200,
            data=GeneralSkillAssessmentListSerializer(company_skill_assessment).data,
        )

    def get(self, request):
        if request.user.is_talent():
            # if it's a talent, return only tiaago assessments - tiaago assessments are assessments that are not tied to any company
            queryset = GeneralSkillAssessment.objects.filter(
                company__isnull=True, job_application__isnull=True
            ).order_by("-created_at")
        elif request.user.is_company():
            # if it's a company rep, return only assessments for his/her company
            queryset = GeneralSkillAssessment.objects.filter(
                company=request.user.company, job_application__isnull=True
            ).order_by("-created_at")
        else:
            queryset = GeneralSkillAssessment.objects.all().order_by("-created_at")
        # Apply filters
        filterset = GeneralSkillAssessmentFilter(request.GET, queryset=queryset)
        queryset = filterset.qs

        # Paginate
        paginated_queryset = self.paginate_queryset(queryset)
        data = GeneralSkillAssessmentListSerializer(paginated_queryset, many=True).data
        paginated_data = self.get_paginated_response(data)

        return Response(data=paginated_data, status=200)


class AddSectionsToSkillAssessmentAPIView(APIView):
    """
    This endpoint is used to add sections to a skill assessment
    [Perm: Company Staff]
    """
    permission_classes = [IsCompanyRepUser]

    def post(self, request, skill_assessment_id):
        company_skill_assessment = GeneralSkillAssessment.objects.filter(
            id=skill_assessment_id,
            company=request.user.company,
            job_application__isnull=True,
        ).first()
        if not company_skill_assessment:
            return Response(
                status=400,
                data={"error": "Skill assessment does not exist or has been deleted"},
            )

        # Ensure company user is Admin or Recruiter
        if request.user.is_company():
            company = getattr(request.user, "company", None)
            if not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You do not have permission to edit this assessment."})

        serializer = GeneralSkillAssessmentSectionSerializer(
            company_skill_assessment, data=request.data
        )
        if not serializer.is_valid():
            return Response(status=400, data=serializer.errors)

        sections_data = serializer.validated_data.get("sections", [])

        try:
            with transaction.atomic():
                for section in sections_data:
                    name = section.get("name")
                    section_type = section.get("type")
                    mcq_questions = section.get("mcq_questions", []) or []
                    coding_tasks = section.get("coding_tasks", []) or []

                    # create an assessment section
                    assessment_section = GeneralSkillAssessmentSection.objects.create(
                        name=name,
                        company_skill_assessment=company_skill_assessment,
                        type=section_type,
                    )

                    # if the section is an MCQ section
                    if section_type == SkillAssessmentTypes.MCQ:
                        for mcq in mcq_questions:
                            is_ai_generated = mcq.get("is_ai_generated", False)
                            question = mcq.get("question")
                            options = mcq.get("options")
                            correct_option_index = mcq.get("correct_option_index")
                            mcq_question_obj = GeneralSkillAssessmentMCQQuestion.objects.create(
                                question=question,
                                options=options,
                                correct_option_index=correct_option_index,
                                is_ai_generated=is_ai_generated,
                            )
                            assessment_section.mcq_questions.add(mcq_question_obj)

                    # if the section is a coding section (support multiple coding tasks)
                    elif section_type == SkillAssessmentTypes.CODING_TASK:
                        for coding_task_payload in coding_tasks:
                            test_cases = coding_task_payload.pop("test_cases", []) or []
                            coding_task_obj = CodingTask.objects.create(**coding_task_payload)
                            # create test cases if provided
                            for test_case in test_cases:
                                TestCase.objects.create(**test_case, coding_task=coding_task_obj)
                            assessment_section.coding_tasks.add(coding_task_obj)

            return Response(status=200, data={"message": "Skill assessment successfully updated"})
        except Exception as e:
            logger.exception("Failed to add sections to skill assessment: %s", e)
            return Response(status=500, data={"error": "Failed to update skill assessment"})


class QuestionBankQuestionsAPIView(APIView, PaginationHandlerMixin):
    """
    This endpoint returns question bank questions based on the roles passed\n
    """

    permission_classes = [IsCompanyRepUser]

    def post(self, request):
        # Company reps must be Admin or Recruiter to request question bank questions
        if request.user.is_company():
            company = getattr(request.user, "company", None)
            if not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You do not have permission to access question bank for this company."})

        data = QuestionBankSerializer(data=request.data)
        if data.is_valid():
            role = data.validated_data.get("role")
            job = data.validated_data.get("job")
            mcq_questions = data.validated_data.get("mcq_questions")
            difficulty_level = data.validated_data.get("difficulty_level")
            # exclusions - IDs of questions that are already on the frontend - To prevent duplication
            exclusions = data.validated_data.get("exclusions")
            # Get questions from the question bank
            questions = QuestionBankQuestion.objects.filter(
                job=job
            ).order_by("?")
            if exclusions:
                questions = questions.exclude(id__in=exclusions)
            questions = questions[:mcq_questions]
            question_bank_questions = list(questions)
            availble_questions_count = len(question_bank_questions)
            if availble_questions_count < mcq_questions:
                questions_left = mcq_questions - availble_questions_count
                if not role.is_technical:
                    extra_questions = AIService.get_mcq_questions(
                        job_description=job.description,
                        num_questions=mcq_questions,
                    )
                    if not extra_questions:
                        return Response({"message":"Failed to get extra mc questions from AI service"}, status=400)
                elif role.is_technical:
                    multistage_questions = AIService.get_multistage_technical_assessment(
                        job_description=job.description,
                        mcq_questions=mcq_questions,
                    )
                    if not multistage_questions:
                        return Response({"message":"Failed to get extra multistage assessment from AI service"}, status=400)
                    extra_questions = multistage_questions["mcq_questions"]
                if extra_questions:
                    new_questions = QuestionBankQuestion.objects.bulk_create(
                        [
                            QuestionBankQuestion(
                                role=role,
                                job=job,
                                question=qbq.get("question"),
                                options=qbq.get("options"),
                                correct_option_index=qbq.get("correct_option_index"),
                                difficulty_level=difficulty_level,
                            )
                            for qbq in extra_questions
                        ]
                    )
                    question_bank_questions.extend(new_questions[:questions_left])
            if len(question_bank_questions) == 0:
                return Response(status=400, data={"error": "Failed to get questions"})
            data = QuestionBankQuestionSerializer(
                question_bank_questions, many=True
            ).data
            return Response(data=data)
        else:
            return Response(status=400, data=data.errors)

from django.db.models import Prefetch
class GeneralSkillAssessmentDetailAPIView(APIView):
    """
    This endpoint is used to fetch a skill assessment\n
    [Perm: Anyone]
    qs: GeneralSkillAssessment with prefetches for sections + MCQs + coding tasks
    QUERYSET
    """

    permission_classes = [AllowAny]
    
    def _base_qs(self):
        section_qs = (
            GeneralSkillAssessmentSection.objects
            .only("id", "name", "type", "company_skill_assessment_id")
            .prefetch_related(
                # through rows + MCQ objects
                Prefetch(
                    "section_mcqs",
                    queryset=GeneralSkillAssessmentSectionMCQ.objects.select_related("mcq").only("id", "section_id", "mcq_id"),
                ),
                # coding tasks
                Prefetch(
                    "coding_tasks",
                    queryset=CodingTask.objects.only(
                        "id", "title", "description", "difficulty_level", "max_score", "time_limit", "stack_id"
                    ),
                ),
            )
        )

        return (
            GeneralSkillAssessment.objects
            .select_related("job_application", "company")
            .prefetch_related(
                "skillsets",                      
                Prefetch("sections", queryset=section_qs),
                
            )
        )

    def get(self, request, skill_assessment_id):
        qs = self._base_qs()
        if request.user.is_authenticated:
            if request.user.is_talent():
                skill_assessment = (
                    qs.filter(id=skill_assessment_id)
                      .filter(
                          Q(company__isnull=False, job_application__applicant=request.user.profile)
                          | Q(company__isnull=True)
                      ).first()
                )
            elif request.user.is_company():
                skill_assessment = (
                    qs.filter(id=skill_assessment_id, company=request.user.company).first()
                )
            else:
                skill_assessment = qs.filter(id=skill_assessment_id).first()
        else:
            skill_assessment = qs.filter(id=skill_assessment_id).first()

        if not skill_assessment:
            return Response(
                status=400,
                data={"error": "Skill assessment does not exist or has been deleted"},
            )

        # Only the owning company or staff may see the answer key —
        # talents take the assessment and must never receive it.
        is_owner_or_staff = request.user.is_authenticated and (
            request.user.is_staff
            or (
                request.user.is_company()
                and skill_assessment.company_id is not None
                and skill_assessment.company_id == request.user.company.id
            )
        )
        data = GeneralSkillAssessmentListSerializer(
            skill_assessment,
            context={
                "include_section_questions": request.user.is_authenticated,
                "include_correct_answers": is_owner_or_staff,
            },
        ).data
        return Response(status=200, data=data)


class TakeAGeneralSkillAssessmentAPIView(APIView):
    """Endpoint for a talent to take a skill assessment"""
    permission_classes = [IsTalentUser]

    def post(self, request, skill_assessment_id):
        talent = request.user.profile
        try:
            # 1) Load & authorize ------------------------------------------------
            skill_assessment = (
                GeneralSkillAssessment.objects
                .select_related("assigned_to", "job_application")
                .filter(id=skill_assessment_id)
                .first()
            )
            if not skill_assessment:
                return Response(status=400, data={"error": "Skill assessment does not exist or has been deleted"})

            if skill_assessment.assigned_to and skill_assessment.assigned_to != talent:
                return Response(status=403, data={"error": "You are not allowed to take this assessment"})
            if skill_assessment.job_application and skill_assessment.job_application.applicant != talent:
                return Response(status=400, data={"error": "You are not allowed to take this assessment"})



            serializer = GeneralSkillAssessmentAnswerSerializer(
                data=request.data, context={"assessment": skill_assessment}
            )
            serializer.is_valid(raise_exception=True)
            answers = serializer.validated_data.get("answers", [])

            submitted_mcq = any((s.get("mcq_answers") or []) for s in answers)
            submitted_coding = any((s.get("coding_task_answers") or []) for s in answers)

            # 4) Prefetch target sections (new MCQ wiring + coding tasks) -------
            section_ids = [s["section_id"] for s in answers]

            coding_qs = CodingTask.objects.only(
                "id", "title", "description", "difficulty_level", "max_score", "time_limit"
            ).prefetch_related("test_cases")

            section_qs = (
                GeneralSkillAssessmentSection.objects
                .filter(company_skill_assessment=skill_assessment, id__in=section_ids)
                .only("id", "name", "type", "company_skill_assessment_id")
                .prefetch_related(
                    Prefetch(
                        "section_mcqs",
                        queryset=GeneralSkillAssessmentSectionMCQ.objects
                            .select_related("mcq")
                            .only(
                                "id", "section_id", "mcq_id",
                                "mcq__id", "mcq__question", "mcq__options", "mcq__correct_option_index",
                            ),
                    ),
                    Prefetch("coding_tasks", queryset=coding_qs),
                )
            )
            sections = {s.id: s for s in section_qs}
            unknown = [sid for sid in section_ids if sid not in sections]
            if unknown:
                return Response(status=400, data={"error": f"Invalid section ids for this assessment: {unknown}"})

            # 5) Reuse/create submission (no immediate completion) --------------
            submission, _ = CandidateAssessmentSubmission.objects.get_or_create(
                candidate=talent,
                skill_assessment=skill_assessment,
                defaults={"is_completed": False}
            )

            # Map existing section submissions for THIS submission only
            existing_secs = {
                ss.skill_assessment_section_id: ss
                for ss in submission.skill_assessment_section_submissions.filter(
                    skill_assessment_section_id__in=section_ids
                )
            }

            # 6) Prepare inserts (component-aware, dedupe per section) ----------
            new_sec_submissions = []
            mcq_answers_to_create = []
            coding_answers_to_create = []

            # Create section submissions
            for s in answers:
                sec_id = s["section_id"]
                if sec_id not in existing_secs:
                    new_sec_submissions.append(
                        CandidateAssessmentSectionSubmission(
                            skill_assessment_section=sections[sec_id],
                            coding_task_answer=(s.get("coding_task_answer") or "")
                        )
                    )

            with transaction.atomic():
                # (a) persist missing section submissions
                if new_sec_submissions:
                    CandidateAssessmentSectionSubmission.objects.bulk_create(new_sec_submissions)
                    # Ensure we have PKs (should be set on Postgres; refresh if not)
                    for obj in new_sec_submissions:
                        if not getattr(obj, "id", None):
                            obj.refresh_from_db()

                    # Update local map with the objects we JUST created,
                    # and attach exactly these to THIS submission (no global requery)
                    for obj in new_sec_submissions:
                        existing_secs[obj.skill_assessment_section_id] = obj
                    submission.skill_assessment_section_submissions.add(*new_sec_submissions)

                # (b) prevent duplicates (for THIS submission) and build MCQ answers
                if submitted_mcq:
                    already_mcq_sec_ids = set(
                        CandidateAssessmentMCQAnswer.objects.filter(
                            section_submission__in=existing_secs.values()
                        ).values_list("section_submission__skill_assessment_section_id", flat=True)
                    )
                    for s in answers:
                        sec_id = s["section_id"]
                        mcq_ans = s.get("mcq_answers", []) or []
                        if not mcq_ans:
                            continue
                        if sec_id in already_mcq_sec_ids:
                            pass
                            #return Response(status=400, data={"error": f"MCQ already submitted for section {sec_id}"})
                        sec_sub = existing_secs[sec_id]
                        sel_map = {a["mcq_id"]: a["selected_option_index"] for a in mcq_ans}

                        links = getattr(sections[sec_id], "_prefetched_objects_cache", {}).get("section_mcqs")
                        if links is None:
                            links = sections[sec_id].section_mcqs.select_related("mcq").all()

                        for link in links:
                            q = link.mcq
                            mcq_answers_to_create.append(
                                CandidateAssessmentMCQAnswer(
                                    section_submission=sec_sub,
                                    question=q,
                                    selected_answer_index=sel_map.get(q.id),
                                )
                            )

                # (c) prevent duplicates (for THIS submission) and build Coding answers
                if submitted_coding:
                    already_coding_sec_ids = set(
                        CandidateAssessmentCodingAnswer.objects.filter(
                            section_submission__in=existing_secs.values()
                        ).values_list("section_submission__skill_assessment_section_id", flat=True)
                    )
                    for s in answers:
                        sec_id = s["section_id"]
                        c_ans = s.get("coding_task_answers", []) or []
                        if not c_ans:
                            continue
                        if sec_id in already_coding_sec_ids:
                            pass
                            #return Response(status=400, data={"error": f"Coding already submitted for section {sec_id}"})
                        sec_sub = existing_secs[sec_id]
                        allowed = {t.id: t for t in sections[sec_id].coding_tasks.all()}

                        for ans in c_ans:
                            t_id = ans.get("coding_task_id")
                            task = allowed.get(t_id)
                            if not task:
                                return Response(status=400, data={"error": f"Task {t_id} not in section {sec_id}"})
                            coding_answers_to_create.append(
                                CandidateAssessmentCodingAnswer(
                                    section_submission=sec_sub,
                                    coding_task=task,
                                    user_answer=(ans.get("user_answer") or "").strip(),
                                )
                            )

                if mcq_answers_to_create:
                    CandidateAssessmentMCQAnswer.objects.bulk_create(mcq_answers_to_create)
                if coding_answers_to_create:
                    CandidateAssessmentCodingAnswer.objects.bulk_create(coding_answers_to_create)

                
                requires_mcq = GeneralSkillAssessmentSection.objects.filter(
                    company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.MCQ
                ).exists()
                requires_coding = GeneralSkillAssessmentSection.objects.filter(
                    company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.CODING_TASK
                ).exists()

                has_any_mcq = CandidateAssessmentMCQAnswer.objects.filter(
                    section_submission__in=existing_secs.values()
                ).exists() or bool(mcq_answers_to_create)
                has_any_coding = CandidateAssessmentCodingAnswer.objects.filter(
                    section_submission__in=existing_secs.values()
                ).exists() or bool(coding_answers_to_create)

                done_mcq = (not requires_mcq) or has_any_mcq
                done_coding = (not requires_coding) or has_any_coding
                if (done_mcq and done_coding) and not submission.is_completed:
                    submission.is_completed = True
                    submission.save(update_fields=["is_completed"])

                # (f) if new answers were added but submission was already MARKED, reset to PENDING
                if (mcq_answers_to_create or coding_answers_to_create) and \
                   submission.mark_status == CandidateAssessmentSubmission.MarkStatusChoices.MARKED:
                    pending = getattr(CandidateAssessmentSubmission.MarkStatusChoices, "PENDING", None)
                    if pending is not None:
                        submission.mark_status = pending
                        submission.save(update_fields=["mark_status"])
            logger.info(f"MCQ answers to create: {len(mcq_answers_to_create)}, Coding answers to create: {len(coding_answers_to_create)} for submission{submission.id}" )
            if mcq_answers_to_create or coding_answers_to_create:
                transaction.on_commit(
                    lambda: mark_skill_assessment_submission.delay(
                        skill_assessment_submission_id=submission.id
                    )
                )

            return Response(status=200, data={"message": "Submitted successfully!"})

        except Exception as e:
            logger.exception("Error during assessment submission: %s", e)
            return Response(status=500, data={"error": "An unexpected error occurred while processing your request."})


class TakeAGeneralSkillAssessmentAPIView_V1(APIView):
    """Endpoint for a talent to take a skill assessment"""
    permission_classes = [IsTalentUser]

    def post(self, request, skill_assessment_id):
        talent = request.user.profile
        try:
            # Load & authorize 
            skill_assessment = (
                GeneralSkillAssessment.objects
                .select_related("assigned_to", "job_application")
                .filter(id=skill_assessment_id)
                .first()
            )
            if not skill_assessment:
                return Response(status=400, data={"error": "Skill assessment does not exist or has been deleted"})

            if skill_assessment.assigned_to and skill_assessment.assigned_to != talent:
                return Response(status=403, data={"error": "You are not allowed to take this assessment"})
            if skill_assessment.job_application and skill_assessment.job_application.applicant != talent:
                return Response(status=400, data={"error": "You are not allowed to take this assessment"})

           # Validate payload
            serializer = GeneralSkillAssessmentAnswerSerializer(
                data=request.data, context={"assessment": skill_assessment}
            )
            serializer.is_valid(raise_exception=True)
            answers = serializer.validated_data.get("answers", [])


            submitted_mcq = any((s.get("mcq_answers") or []) for s in answers)
            submitted_coding = any((s.get("coding_task_answers") or []) for s in answers)

            
            section_ids = [s["section_id"] for s in answers]

            coding_qs = CodingTask.objects.only(
                "id", "title", "description", "difficulty_level", "max_score", "time_limit"
            ).prefetch_related("test_cases")

            section_qs = (
                GeneralSkillAssessmentSection.objects
                .filter(company_skill_assessment=skill_assessment, id__in=section_ids)
                .only("id", "name", "type", "company_skill_assessment_id")
                .prefetch_related(
                    Prefetch(
                        "section_mcqs",
                        queryset=GeneralSkillAssessmentSectionMCQ.objects
                            .select_related("mcq")
                            .only(
                                "id", "section_id", "mcq_id",
                                "mcq__id", "mcq__question", "mcq__options", "mcq__correct_option_index",
                            ),
                    ),
                    Prefetch("coding_tasks", queryset=coding_qs),
                )
            )
            sections = {s.id: s for s in section_qs}
            unknown = [sid for sid in section_ids if sid not in sections]
            if unknown:
                return Response(status=400, data={"error": f"Invalid section ids for this assessment: {unknown}"})

            # 4) Reuse/create submission (no immediate completion) --------------
            submission, _created = CandidateAssessmentSubmission.objects.get_or_create(
                candidate=talent,
                skill_assessment=skill_assessment,
                defaults={"is_completed": False}
            )

            # Map existing section submissions for this submission
            existing_secs = {
                ss.skill_assessment_section_id: ss
                for ss in submission.skill_assessment_section_submissions.filter(
                    skill_assessment_section_id__in=section_ids
                )
            }

            # 5) Prepare inserts (component-aware, dedupe per section) ----------
            new_sec_submissions = []
            mcq_answers_to_create = []
            coding_answers_to_create = []

            # Create section submissions that don't exist yet
            for s in answers:
                sec_id = s["section_id"]
                if sec_id not in existing_secs:
                    new_sec_submissions.append(
                        CandidateAssessmentSectionSubmission(
                            skill_assessment_section=sections[sec_id],
                            coding_task_answer=(s.get("coding_task_answer") or "")
                        )
                    )

            with transaction.atomic():
                # (a) persist missing section submissions
                if new_sec_submissions:
                    CandidateAssessmentSectionSubmission.objects.bulk_create(new_sec_submissions)
                    created = list(
                        CandidateAssessmentSectionSubmission.objects.filter(
                            skill_assessment_section_id__in=[ns.skill_assessment_section_id for ns in new_sec_submissions]
                        )
                    )
                    for ns in created:
                        existing_secs[ns.skill_assessment_section_id] = ns
                    # add (not set) to avoid dropping prior ones
                    submission.skill_assessment_section_submissions.add(*created)

                # (b) prevent duplicates and build MCQ answers
                added_any_mcq = False
                if submitted_mcq:
                    already_mcq_sec_ids = set(
                        CandidateAssessmentMCQAnswer.objects.filter(
                            section_submission__in=existing_secs.values()
                        ).values_list("section_submission__skill_assessment_section_id", flat=True)
                    )
                    for s in answers:
                        sec_id = s["section_id"]
                        mcq_ans = s.get("mcq_answers", []) or []
                        if not mcq_ans:
                            continue
                        if sec_id in already_mcq_sec_ids:
                            return Response(status=400, data={"error": f"MCQ already submitted for section {sec_id}"})
                        sec_sub = existing_secs[sec_id]
                        sel_map = {a["mcq_id"]: a["selected_option_index"] for a in mcq_ans}

                        links = getattr(sections[sec_id], "_prefetched_objects_cache", {}).get("section_mcqs")
                        if links is None:
                            links = sections[sec_id].section_mcqs.select_related("mcq").all()

                        for link in links:
                            q = link.mcq
                            mcq_answers_to_create.append(
                                CandidateAssessmentMCQAnswer(
                                    section_submission=sec_sub,
                                    question=q,
                                    selected_answer_index=sel_map.get(q.id),
                                )
                            )
                        added_any_mcq = True

                # prevent duplicates and build Coding answers
                added_any_coding = False
                if submitted_coding:
                    already_coding_sec_ids = set(
                        CandidateAssessmentCodingAnswer.objects.filter(
                            section_submission__in=existing_secs.values()
                        ).values_list("section_submission__skill_assessment_section_id", flat=True)
                    )
                    for s in answers:
                        sec_id = s["section_id"]
                        c_ans = s.get("coding_task_answers", []) or []
                        if not c_ans:
                            continue
                        if sec_id in already_coding_sec_ids:
                            return Response(status=400, data={"error": f"Coding already submitted for section {sec_id}"})
                        sec_sub = existing_secs[sec_id]
                        allowed = {t.id: t for t in sections[sec_id].coding_tasks.all()}

                        for ans in c_ans:
                            t_id = ans.get("coding_task_id")
                            task = allowed.get(t_id)
                            if not task:
                                return Response(status=400, data={"error": f"Task {t_id} not in section {sec_id}"})
                            coding_answers_to_create.append(
                                CandidateAssessmentCodingAnswer(
                                    section_submission=sec_sub,
                                    coding_task=task,
                                    user_answer=(ans.get("user_answer") or "").strip(),
                                )
                            )
                        added_any_coding = True

                # bulk insert answers
                if mcq_answers_to_create:
                    CandidateAssessmentMCQAnswer.objects.bulk_create(mcq_answers_to_create)
                if coding_answers_to_create:
                    CandidateAssessmentCodingAnswer.objects.bulk_create(coding_answers_to_create)

                # (e) compute completion (optional; you can keep this simple)
                requires_mcq = GeneralSkillAssessmentSection.objects.filter(
                    company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.MCQ
                ).exists()
                requires_coding = GeneralSkillAssessmentSection.objects.filter(
                    company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.CODING_TASK
                ).exists()

                has_any_mcq = CandidateAssessmentMCQAnswer.objects.filter(
                    section_submission__in=existing_secs.values()
                ).exists() or bool(mcq_answers_to_create)
                has_any_coding = CandidateAssessmentCodingAnswer.objects.filter(
                    section_submission__in=existing_secs.values()
                ).exists() or bool(coding_answers_to_create)

                done_mcq = (not requires_mcq) or has_any_mcq
                done_coding = (not requires_coding) or has_any_coding
                new_completed = (done_mcq and done_coding)
                if new_completed and not submission.is_completed:
                    submission.is_completed = True
                    submission.save(update_fields=["is_completed"])

                #ensures re-marking if already marked but new answers arrived
                added_anything = bool(mcq_answers_to_create or coding_answers_to_create)
                if added_anything and submission.mark_status == CandidateAssessmentSubmission.MarkStatusChoices.MARKED:
                    # reset to PENDING so the task will run again
                    try:
                        pending = CandidateAssessmentSubmission.MarkStatusChoices.PENDING
                    except AttributeError:
                        pending = None
                    if pending is not None:
                        submission.mark_status = pending
                        submission.save(update_fields=["mark_status"])

            #enqueue the SINGLE, existing task
            if mcq_answers_to_create or coding_answers_to_create:
                transaction.on_commit(
                    lambda: mark_skill_assessment_submission.delay(
                        skill_assessment_submission_id=submission.id
                    )
                )

            return Response(status=200, data={"message": "Submitted successfully!"})

        except Exception as e:
            logger.exception("Error during assessment submission: %s", e)
            return Response(status=500, data={"error": "An unexpected error occurred while processing your request."})


class PreScreeningMixin:
    def get_assessment_and_session(self, assessment_id):
        assessment = GeneralSkillAssessment.objects.filter(id=assessment_id).first()

        if not assessment or not assessment.job_application:
            raise NotFound("Assessment or job application not found.")

        candidate = assessment.job_application.applicant
        application = assessment.job_application

        session = PreScreeningInterviewSession.objects.filter(
            candidate=candidate, job_application=application, assessment=assessment
        ).first()

        if not session:
            raise NotFound("No pre-screening session found.")

        return assessment, session


class PreScreeningInterviewResultAPIView(PreScreeningMixin, GenericAPIView):
    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request, assessment_id):
        assessment, session = self.get_assessment_and_session(assessment_id)
        # ensure company user has Admin/Recruiter role for this job's company
        if request.user.is_company():
            company = getattr(assessment.job_application.job, 'company', None)
            if not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You are not authorized to view this pre-screening result."})
        serializer = PreScreeningInterviewResultSerializer(session)
        return Response(serializer.data, status=200)


class PreScreeningInterviewConversationAudio(PreScreeningMixin, GenericAPIView):
    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request, assessment_id):
        _, session = self.get_assessment_and_session(assessment_id)
        # ensure company user has Admin/Recruiter role for this job's company
        if request.user.is_company():
            company = getattr(session.job_application.job, 'company', None)
            if not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You are not authorized to view this audio."})
        audio_file = elevenlabs_handler.get_conversation_audio(
            conversation_id=session.conversation_id
        )
        if not audio_file:
            raise NotFound("Audio file not found.")

        audio_file.seek(0)
        return FileResponse(
            audio_file,
            content_type="audio/mpeg",
            as_attachment=False,
            filename=f"conversation_{session.conversation_id}.mp3",
        )


class PreScreeningInterviewConversationDetails(PreScreeningMixin, GenericAPIView):
    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request, assessment_id):
        _, session = self.get_assessment_and_session(assessment_id)
        # ensure company user has Admin/Recruiter role for this job's company
        if request.user.is_company():
            company = getattr(session.job_application.job, 'company', None)
            if not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You are not authorized to view this conversation."})
        conversation_details = elevenlabs_handler.get_conversation_details(
            conversation_id=session.conversation_id
        )
        return Response({"conversation_details": conversation_details}, status=200)


class SkillAssessmentResultAPIView(APIView):
    """Endpoint to retrieve the result of the submission for a Skill Assessment"""
    permission_classes = [IsTalentOrStaffUser]

    def get(self, request, submission_id):
        try:
            submission = (
                CandidateAssessmentSubmission.objects
                .filter(id=submission_id, candidate=request.user.profile)
                .select_related("candidate", "skill_assessment")
                .prefetch_related(
                    Prefetch(
                        "skill_assessment_section_submissions",
                        queryset=CandidateAssessmentSectionSubmission.objects
                        .select_related("skill_assessment_section")
                        .prefetch_related(
                            # Coding answers on the section submission
                            Prefetch(
                                "coding_task_answers",
                                queryset=CandidateAssessmentCodingAnswer.objects.only("id", "coding_task_id"),
                                to_attr="prefetched_coding_answers",
                            ),
                            # MCQ answers on the section submission (default related_name)
                            Prefetch(
                                "candidateassessmentmcqanswer_set",
                                queryset=CandidateAssessmentMCQAnswer.objects
                                    .select_related("question")
                                    .only("id", "selected_answer_index", "question__correct_option_index"),
                                to_attr="prefetched_mcq_answers",
                            ),
                            # MCQs attached to the section
                            Prefetch(
                                "skill_assessment_section__mcq_questions_new",
                                queryset=GeneralSkillAssessmentMCQQuestion.objects.only("id", "correct_option_index"),
                                to_attr="prefetched_mcqs",
                            ),
                            # Coding tasks attached to the section (need max_score for weighting)
                            Prefetch(
                                "skill_assessment_section__coding_tasks",
                                queryset=CodingTask.objects.only("id", "max_score"),
                                to_attr="prefetched_coding_tasks",
                            ),
                        ),
                    ),
                )
                .get()
            )
        except CandidateAssessmentSubmission.DoesNotExist:
            raise NotFound("Assessment submission not found.")

        data = SubmissionSerializer(submission, context={"request": request, "prefetched": True}).data
        return Response(data)


class GetSubmissionsForASkillAssessment(APIView, PaginationHandlerMixin):
    """Endpoint to retreive the submission for a Skill Assessment"""

    permission_classes = [IsTalentOrStaffUser]

    def get(self, request, skill_assessment_id):
        queryset = []
        if request.user.is_talent():
            queryset = CandidateAssessmentSubmission.objects.filter(
                candidate=request.user.profile, skill_assessment__id=skill_assessment_id
            ).order_by("-created_at")
        else:
            queryset = CandidateAssessmentSubmission.objects.filter(
            
                skill_assessment__id=skill_assessment_id,
            ).order_by("-created_at")
        paginated_queryset = self.paginate_queryset(queryset)
        data = SubmissionSerializer(paginated_queryset, many=True).data
        paginated_data = self.get_paginated_response(data)
        return Response(data=paginated_data)


class AddMCQAssessmentAPIView(APIView):
    """Endpoint for a Tiaago Staff to add an MCQ Assessment for verification"""

    permission_classes = [IsStaffUser]

    def post(self, request, *args, **kwargs):
        serializer = AddMCQAssessmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "MCQ questions added successfully."}, 
                 status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AddCodingAssessmentAPIView(APIView):
    """Endpoint for a Tiaago Staff to add a Talent Assessment for Tiaago Verification"""

    permission_classes = [IsStaffUser]
    

    def post(self, request, *args, **kwargs):
        # Choose serializer based on request.version (defaults to "1")
        logger.info("API version:", request.version)
        if request.version == "2":
            SerializerClass = AddCodingAssessmentSerializer_V2
        else:
            SerializerClass = AddCodingAssessmentSerializer_V2

        serializer = SerializerClass(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        obj = serializer.save()
        if not obj:
            return Response(
                {"error": "Failed to create coding assessment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"message": "Coding questions added successfully."},
            status=status.HTTP_201_CREATED,
        )


class StartVerificationAssessmentView(APIView):
    """Endpoint for a talent to start a tiaago skill assesssment for verification"""

    permission_classes = [IsTalentUser]

    def post(self, request):
        serializer = StartVerificationAssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role    = serializer.validated_data['role']
        stack   = serializer.validated_data.get('stack')
        difficulty_level   = serializer.validated_data['difficulty_level']
        mcq_ct  = serializer.validated_data['mcq_count']
        code_ct = serializer.validated_data['coding_count']
        talent = request.user

        #find an existing, incomplete assessment for this user/stack/level:
        assessment = GeneralSkillAssessment.objects.filter(
            assigned_to=talent.profile,
            assessment_type=SkillAssessmentTypes.CUSTOM,
            skillsets=role,
            difficulty_level=difficulty_level,
        ).exclude(
            candidateassessmentsubmission__is_completed=True
        ).prefetch_related(
            'generalskillassessmentsection_set__coding_tasks',
            'generalskillassessmentsection_set__mcq_questions',
        ).first()

        # Check for any active cooldown for this talent/role/stack/difficulty combination
        # This covers both existing assessments and potential new ones
        existing_cooldowns = AssessmentCooldown.objects.filter(
            talent=talent.profile,
            skill_assessment__assessment_type=SkillAssessmentTypes.CUSTOM,
            skill_assessment__skillsets=role,
            skill_assessment__difficulty_level=difficulty_level,
        )
        
        # If stack is specified, also filter by stack
        if stack:
            existing_cooldowns = existing_cooldowns.filter(
                skill_assessment__assessment_stack=stack
            )
        
        # Check if any cooldown is still active
        for cooldown in existing_cooldowns:
            if cooldown.is_active():
                days_remaining = cooldown.days_remaining()
                return Response(
                    status=403, 
                    data={
                        "error": f"You must wait {days_remaining} more days before retaking this assessment. You can retake it on {cooldown.cooldown_ends_at.date()}.",
                        "cooldown_ends_at": cooldown.cooldown_ends_at.isoformat(),
                        "days_remaining": days_remaining
                    }
                )

        # If there's an existing assessment, use it
        if assessment:
            pass  # Use the existing assessment
        else:
            # If none, create a new one  
            #Create the assessment and link to user
            assessment = GeneralSkillAssessment.objects.create(
                title=f"Verification Assessment for {talent.get_full_name()}",
                published=True,
                difficulty_level=difficulty_level,
                description=f"Tiaago assessment for {talent.get_full_name()}",
                duration_minutes=60,
                passing_grade=70,
                reference=str(uuid.uuid4().hex)[:15],
                assessment_type=SkillAssessmentTypes.CUSTOM,
                assigned_to=talent.profile,
            )
            assessment.skillsets.set([role])

            if role.is_technical:
                mcq_count = 30

            mcq_qs = TalentQuestionBank.objects.filter(
                role=role,
                difficulty_level=difficulty_level,
                mcq_question__isnull=False,
            )
            # If technical, only MCQs for that stack; if non‑tech, stack is ignored
            if role.is_technical and stack:
                mcq_qs = mcq_qs.filter(stack=stack)

            mcq_entries = mcq_qs.order_by('?')[:mcq_count]
            mcq_section = GeneralSkillAssessmentSection.objects.create(
                name="Multiple Choice Questions",
                company_skill_assessment=assessment,
                type=SkillAssessmentTypes.MCQ,
            )
            mcq_section.mcq_questions.set([e.mcq_question for e in mcq_entries])

            # Only if technical, fetch and attach coding tasks
            if role.is_technical:
                coding_qs = TalentQuestionBank.objects.filter(
                    role=role,
                    stack=stack,
                    difficulty_level=difficulty_level,
                    coding_task__isnull=False,
                ).order_by('?')[:code_ct]

                coding_section = GeneralSkillAssessmentSection.objects.create(
                    name="Coding Tasks",
                    company_skill_assessment=assessment,
                    type=SkillAssessmentTypes.CODING_TASK,
                )
                coding_section.coding_tasks.set([e.coding_task for e in coding_qs])


        # Serialize the assessment sections/questions into a payload
        data = {
            'assessment_id': assessment.id,
            'title': assessment.title,
            'duration': assessment.duration_minutes,
            'sections': [],
        }
        for section in assessment.sections.all().order_by('type'):
            if section.type == SkillAssessmentTypes.MCQ:
                questions = [{
                    'id': q.id,
                    'question': q.question,
                    'options': q.options,
                } for q in section.mcq_questions.all()]
            else:  # CODING_TASK
                questions = [{
                    'id': q.id,
                    'title': q.title,
                    'description': q.description,
                    'constraints': q.constraints,
                    'sample_input': q.sample_input,
                    'sample_output': q.sample_output,
                } for q in section.coding_tasks.all()]
            data['sections'].append({
                'id':   section.id,
                'type': section.type,
                'questions': questions
            })

        return Response(data, status=status.HTTP_200_OK)

class AIOperationsFeedback(APIView, PaginationHandlerMixin):
    """Endpoint to get feedback from AI analysis of resume and cultural fitness with results showing in descending order"""
    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request, job_id, *args, **kwargs):
        # Company reps must be Admin or Recruiter for the job's company
        job = Job.objects.filter(id=job_id).first()
        if request.user.is_company() and job:
            if not user_is_company_role(request.user, job.company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You are not authorized to access AI feedback for this job."})

        job_applications = JobApplication.objects.select_related("job", "job__company", "job__company__company_rep", "applicant").filter(
            job__id=job_id
        )
        
        """job_applications = JobApplication.objects.select_related("job", "job__company", "job__company__company_rep", "applicant").filter(
            job__company__company_rep=request.user, job__id=job_id
        )"""
        resume_map = {
            r.job_application_id: r for r in ResumeAnalysis.objects.filter(
                job_application__in=job_applications
            )
        }

        prescreening_map = {
            c.job_application_id: c for c in PreScreeningInterviewSession.objects.filter(
                job_application__in=job_applications
            )
        }

        assessment_map = {
            a.job_application_id: a for a in GeneralSkillAssessment.objects.filter(job_application__in=job_applications)
        }

        assessment_ids = [a.id for a in assessment_map.values() if a]
        submissions = CandidateAssessmentSubmission.objects.filter(
            skill_assessment_id__in=assessment_ids, is_completed=True
        ).select_related("skill_assessment", "candidate")

        submission_map = {
            s.skill_assessment_id: s for s in submissions
        }

        feedback = []
        for job_apps in job_applications:
            resume = resume_map.get(job_apps.id)
            prescreening = prescreening_map.get(job_apps.id)
            assessment = assessment_map.get(job_apps.id)
            submission = submission_map.get(assessment.id) if assessment else None
            cover_letter = job_apps.cover_letter
            time_taken=submission.time_taken if submission and submission.time_taken is not None else 0
            difficulty_level=assessment.difficulty_level if assessment and assessment.difficulty_level else ''
           
            #mcq_question=submission.skill_assessment.sections.filter(type=SkillAssessmentTypes.MCQ).first().mcq_questions.count() if assessment and assessment.sections.filter(type=SkillAssessmentTypes.MCQ).exists() else 0
            #coding_tasks_count=assessment.sections.filter(type=SkillAssessmentTypes.CODING_TASK).first().coding_tasks.count() if assessment and assessment.sections.filter(type=SkillAssessmentTypes.CODING_TASK).exists() else 0   
           
            resume_score = resume.total_score if resume and resume.total_score is not None else 0
            cultural_score = prescreening.total_points if prescreening and prescreening.total_points is not None else 0
            assessment_score = submission.total_score if submission and submission.total_score is not None else 0
            # scores = [resume_score, cultural_score, assessment_score]
            scores = [resume_score, assessment_score]#used just these two for now, prescreening is not ready yet
            valid_scores = [float(s) for s in scores if s is not None]
            overall_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0
            resume_role_match_status = resume.role_match_status if resume and resume.role_match_status else "no_match"
            resume_text_authencity = resume.text_authencity if resume and resume.text_authencity else "unknown"
            resume_text_authencity_explanation = resume.text_authencity_explanation if resume and resume.text_authencity_explanation else ""
            resume_experience_validation = resume.experience_validation if resume and resume.experience_validation else "unknown"
            resume_experience_validation_explanation = resume.experience_validation_explanation if resume and resume.experience_validation_explanation else ""
            resume_review_score = resume.resume_review_score if resume and resume.resume_review_score is not None else 0
            resume_skill_matching_score = resume.skill_matching_score if resume and resume.skill_matching_score is not None else 0
            resume_education_certification_score = resume.education_certifications_score if resume and resume.education_certifications_score is not None else 0
            resume_experience_score = resume.experience_relevance_score if resume and resume.experience_relevance_score is not None else 0
            resume_strengths = resume.strengths if resume and resume.strengths else []
            resume_areas_for_improvement = resume.areas_for_improvement if resume and resume.areas_for_improvement else []
            resume_detailed_analysis = resume.detailed_analysis if resume and resume.detailed_analysis else ""
            resume_recommendations = resume.recommendation if resume and resume.recommendation else ""
            resume_experience_relevance_score = resume.experience_relevance_score if resume and resume.experience_relevance_score is not None else 0
            resume_achievement_quality= resume.achievement_quality if resume and resume.achievement_quality is not None else ''
            feedback.append({
                "application_id": job_apps.id,
                "talent_name": job_apps.applicant.user.get_full_name,
                "talent_id": job_apps.applicant.user.id,
                "email": job_apps.applicant.user.email,
                "profile_picture": request.build_absolute_uri(job_apps.applicant.user.profile_pic.url) if job_apps.applicant.user.profile_pic else None,
                "role": job_apps.job.role,
                "resume_analysis_score": resume_score,
                "resume_review_score":resume_review_score,
                "resume_skill_matching_score":resume_skill_matching_score,
                "resume_education_certification_score":resume_education_certification_score,
                "resume_experience_score":resume_experience_score,
                "cultural_fitness_score": cultural_score,
                "overall_score": overall_score,
                "resume_feedback": resume.detailed_analysis if resume else None,
                "prescreening_feedback": prescreening.agent_comment if prescreening else None,
                "assessment_score": assessment_score,
                "has_passed_tiaago_assessment": job_apps.applicant.has_passed_tiaago_assessment,
                "assessment_title": assessment.title if assessment else None,
                "portfolio_slug": job_apps.applicant.portfolio_slug_safe,
                "cover_letter":cover_letter,
                "resume":request.build_absolute_uri(job_apps.applicant.resume.url) if job_apps.applicant.resume else None,
                "resume_role_match_status": resume_role_match_status,
                "resume_text_authencity": resume_text_authencity, 
                "resume_text_authencity_explanation": resume_text_authencity_explanation,
                "resume_experience_validation": resume_experience_validation,
                "resume_experience_validation_explanation": resume_experience_validation_explanation,
                "resume_strengths": resume_strengths,
                "resume_areas_for_improvement": resume_areas_for_improvement,
                "resume_detailed_analysis": resume_detailed_analysis,
                "resume_recommendations": resume_recommendations,
                "resume_experience_relevance_score": resume_experience_relevance_score, 
                "resume_achievement_quality": resume_achievement_quality,
                "time_taken": time_taken,
                "difficulty_level": difficulty_level,
                
            })

        #return leaderbord in descending order
        feedback.sort(key=lambda x: x["overall_score"], reverse=True)
        
        paginated_queryset = self.paginate_queryset(feedback)
        data = AIFeedbackSerializer(paginated_queryset, many=True).data
        paginated_data = self.get_paginated_response(data)
        return Response(data=paginated_data)

class StartPreScreeningInterviewView(PreScreeningMixin, APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        """
        Starts or retrieves a PreScreeningInterviewSession using only assessment_id.
        Candidate and JobApplication are inferred from the Assessment.
        """
        assessment_id = request.query_params.get("assessment_id")

        if not assessment_id:
            logger.warning("Missing assessment_id in query params")
            return Response(
                {"detail": "Missing required query parameter: assessment"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            assessment = get_object_or_404(GeneralSkillAssessment, id=assessment_id)
            if not assessment.job_application:
                logger.warning(f"Assessment {assessment_id} has no associated job application")
                return Response(
                    {"detail": "No job application associated with this assessment."},
                    status=status.HTTP_400_BAD_REQUEST
                )        
            candidate = assessment.job_application.applicant
            if not candidate:
                return Response(
                    {"detail": "No candidate associated with this assessment."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            job_application = assessment.job_application

            logger.info(
                f"Starting interview session for assessment_id={assessment_id}, "
                f"candidate_id={candidate.id}, job_application_id={job_application.id}"
            )

            session, created = PreScreeningInterviewSession.objects.get_or_create(
                candidate=candidate,
                job_application=job_application,
                assessment=assessment,
                total_points=0, 
                final_evaluation="pass"# Initialize total_points
            )

            if created:
                logger.info(f"Created new session: {session.id}")
                queue_entry = queue_or_start_session(session)
                logger.info(f"Queued new session: status={queue_entry.status}, position={queue_entry.position}")
            else:
                logger.info(f"Existing session found: {session.id}")
                queue_entry = getattr(session, 'queue_entry', None) or session.queue.first()
                if not queue_entry:
                    logger.warning(f"No queue entry found for session id={session.id}")
                else:
                    logger.info(f"[Queue Found] Status: {queue_entry.status}, Position: {queue_entry.position}")
            return Response({
                "message": "Session created and queued/started" if created else "Session already exists",
                "session_id": session.id,
                "queue_status": queue_entry.status if queue_entry else "unknown",
                "position": queue_entry.position if queue_entry else None
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error while creating or retrieving pre-screening session")
            return Response(
                {"detail": "An unexpected error occurred while processing your request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class CompleteInterviewSessionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, session_id):
        """
        Completes an interview session and activates the next queued session.
        """
        try:
            queue_entry = InterviewSessionQueue.objects.get(session_id=session_id)
            complete_session(queue_entry)
            activated=activate_next_queued_session()
            return Response({
                "message": "Interview session marked as completed.",
                "next_activated": bool(activated),
                "next_session_id": getattr(activated, "session_id", None) if activated else None
            }, status=200)
        except InterviewSessionQueue.DoesNotExist:
            return Response({"error": "Session not found"}, status=404)

class InitiateAssessmentPaymentAPIView(GenericAPIView):
    permission_classes = [IsAuthenticated, IsTalentUser]
    serializer_class = InitiateAssessmentPaymentSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        talent = user.profile
        assessment_id = serializer.validated_data["assessment_id"]
        coupon_code = serializer.validated_data.get("coupon_code")
        coupon = None

        skill_assessment = GeneralSkillAssessment.objects.filter(id=assessment_id).first()
        if not skill_assessment:
            logger.info(f"assessment not found")
            return Response(status=404, data={"error": "Assessment not found"})

        is_nigerian = user.country.lower() == "nigeria"
        base_amount = Decimal(USD_PRICE * NAIRA_EXCHANGE_RATE) if is_nigerian else Decimal(USD_PRICE)
        currency = "NGN" if is_nigerian else "USD"
        amount = base_amount
        
        if coupon_code:
            coupon = Coupon.objects.filter(code=coupon_code).first()
            if not coupon:
                return Response({"error": "Invalid coupon"}, status=400)
            if not coupon.is_valid():
                return Response({"error": "Coupon expired or fully used"}, status=409)
            if CouponUsage.objects.filter(coupon=coupon, user=user).exists():
                return Response({"error": "You have already used this coupon"}, status=409)

            if coupon.discount_percent is not None:
                discount = (amount * Decimal(coupon.discount_percent) / Decimal(100))
                amount -= discount
            elif currency == "NGN" and coupon.discount_amount_ngn is not None:
                amount -= Decimal(coupon.discount_amount_ngn)
            elif currency == "USD" and coupon.discount_amount_usd is not None:
                amount -= Decimal(coupon.discount_amount_usd)
            else:
                return Response({"error": "Coupon is invalid for this currency"}, status=400)

            amount = max(Decimal("0.00"), amount)
            amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            
            logger.info(f"After coupon calculation - Amount: {amount}, Type: {type(amount)}")
            
        existing_payment = SkillAssessmentPayment.objects.filter(
            talent=talent, assessment=skill_assessment
        ).first()

        try:
            if existing_payment:
                if existing_payment.is_paid:
                    logger.info(f"assessment is {existing_payment.is_paid}")
                    return Response(status=400, data={"error": "Assessment already paid for"})

            # Handle 100% discount (free assessment)
            logger.info(f"Checking free assessment condition - Amount: {amount}, Is Zero: {amount == Decimal('0.00')}")
            if amount == Decimal("0.00"):
                logger.info("Entering free assessment block")
                if existing_payment:
                    existing_payment.is_paid = True
                    existing_payment.amount = amount
                    existing_payment.currency = currency
                    existing_payment.payment_provider = "coupon"
                    existing_payment.payment_reference = f"FREE_{coupon_code}_{assessment_id}"
                    existing_payment.save()
                else:
                    existing_payment = SkillAssessmentPayment.objects.create(
                        talent=talent,
                        assessment=skill_assessment,
                        amount=amount,
                        currency=currency,
                        payment_provider="coupon",
                        payment_reference=f"FREE_{coupon_code}_{assessment_id}",
                        is_paid=True,
                    )
                
                # Record coupon usage
                if coupon:
                    CouponUsage.objects.create(
                        coupon=coupon,
                        user=user,
                        used_at=timezone.now()
                    )
                    coupon.used_count += 1
                    coupon.save()
                
                logger.info(f"Free assessment granted with coupon: {coupon_code}")
                
                return Response({
                    "payment_url": None,
                    "amount": str(amount),
                    "currency": currency,
                    "message": "Assessment unlocked successfully"
                }, status=200)

            # Handle regular payment
            if existing_payment:
                if is_nigerian:
                    gateway_amount = int(amount) 
                    payment_url, reference = initiate_paystack_payment(user, gateway_amount, assessment_id, coupon)
                    existing_payment.payment_provider = "paystack"
                else:
                    gateway_amount = int(amount)  
                    payment_url, reference = initiate_stripe_payment(user, gateway_amount, assessment_id, coupon)
                    existing_payment.payment_provider = "stripe"

                existing_payment.payment_reference = reference
                existing_payment.amount = amount
                existing_payment.currency = currency
                existing_payment.save()

            else:
                if is_nigerian:
                    gateway_amount = amount
                    payment_url, reference = initiate_paystack_payment(user, gateway_amount, assessment_id, coupon)
                    provider = "paystack"
                else:
                    gateway_amount = amount
                    payment_url, reference = initiate_stripe_payment(user, gateway_amount, assessment_id, coupon)
                    provider = "stripe"

                SkillAssessmentPayment.objects.create(
                    talent=talent,
                    assessment=skill_assessment,
                    amount=amount,  
                    currency=currency,
                    payment_provider=provider,
                    payment_reference=reference,
                    is_paid=False,
                )
            
            logger.info(f"payment reference: {reference}")

            return Response({
                "payment_url": payment_url,
                "amount": str(amount), 
                "currency": currency
            }, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

@method_decorator(cache_page(3600), name="dispatch")
class TechStacks(PaginationHandlerMixin, APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = TechStackSerializer

    def get(self, request, *args, **kwargs):
        """
        Fetch a list of available tech stacks for skill assessments.
        """
        try:
            tech_stacks = TechStack.objects.all()
            paginated_queryset = self.paginate_queryset(tech_stacks)
            serializer = self.serializer_class(paginated_queryset, many=True)
            paginated_data = self.get_paginated_response(serializer.data)
            return Response(paginated_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Error fetching tech stacks: {e}")
            return Response(
                {"error": "An error occurred while fetching tech stacks."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CertificateListCreateAPIView(APIView, PaginationHandlerMixin):
    """
    GET: List certificates (staff sees all; non-staff sees their own), paginated via PaginationHandlerMixin
    POST: Create certificate (non-staff auto-bound to own TalentProfile)
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = Certificate.objects.select_related("talent__user", "skill_assessment")

        # Scope by role
        if not request.user.is_staff:
            profile = getattr(request.user, "profile", None)
            if not profile:
                # Empty paginated response
                empty = []
                page = self.paginate_queryset(empty)
                return self.get_paginated_response(empty)
            qs = qs.filter(talent_id=profile.id)

        # Filters
        talent_id = request.query_params.get("talent_id")
        if talent_id:
            qs = qs.filter(talent_id=talent_id)

        sa_id = request.query_params.get("skill_assessment_id")
        if sa_id:
            qs = qs.filter(skill_assessment_id=sa_id)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(skill_assessment__title__icontains=search)
                | Q(talent__full_name__icontains=search)
                | Q(talent__user__username__icontains=search)
            )

        qs = qs.order_by("-issued_at", "-id")

        page = self.paginate_queryset(qs)
        serializer = CertificateReadSerializer(
            page, many=True, context={"request": request}
        )
        return Response(self.get_paginated_response(serializer.data))

    def post(self, request):
        try:
            data = request.data.copy()

            # Non-staff can only create for themselves
            if not request.user.is_staff:
                profile = getattr(request.user, "profile", None)
                if not profile:
                    return Response(
                        status=403, data={"error": "You do not have a TalentProfile."}
                    )
                data["talent_id"] = profile.id

            serializer = CertificateWriteSerializer(
                data=data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            return Response(status=201, data=serializer.to_representation(instance))

        except Exception as e:
            from rest_framework.exceptions import ValidationError

            if isinstance(e, ValidationError):
                return Response(status=400, data=e.detail)
            return Response(
                status=500,
                data={
                    "error": "An unexpected error occurred while creating the certificate."
                },
            )


class CertificateDetailAPIView(APIView, PaginationHandlerMixin):
    """
    GET: Retrieve certificate
    PATCH: Update only certificate_url
    DELETE: Delete certificate
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_obj(self, pk):
        return (
            Certificate.objects.select_related("talent__user", "skill_assessment")
            .filter(pk=pk)
            .first()
        )

    def get(self, request, pk):
        obj = self._get_obj(pk)
        if not obj:
            return Response(status=404, data={"error": "Certificate not found"})
        self.check_object_permissions(request, obj)
        data = CertificateReadSerializer(obj, context={"request": request}).data
        return Response(status=200, data=data)

    def patch(self, request, pk):
        obj = self._get_obj(pk)
        if not obj:
            return Response(status=404, data={"error": "Certificate not found"})
        self.check_object_permissions(request, obj)

        # Only certificate_url can be updated
        allowed = {"certificate_url"}
        incoming = set(request.data.keys())
        if not incoming.issubset(allowed):
            return Response(
                status=400,
                data={"error": f"Only {sorted(list(allowed))} can be updated."},
            )

        serializer = CertificateWriteSerializer(
            obj,
            data={"certificate_url": request.data.get("certificate_url")},
            partial=True,
            context={"request": request},
        )
        try:
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            return Response(
                status=200,
                data=CertificateReadSerializer(
                    instance, context={"request": request}
                ).data,
            )
        except Exception as e:
            from rest_framework.exceptions import ValidationError

            if isinstance(e, ValidationError):
                return Response(status=400, data=e.detail)
            return Response(
                status=500,
                data={
                    "error": "An unexpected error occurred while updating the certificate."
                },
            )

    def delete(self, request, pk):
        obj = self._get_obj(pk)
        if not obj:
            return Response(status=404, data={"error": "Certificate not found"})
        self.check_object_permissions(request, obj)
        obj.delete()
        return Response(status=200, data={"message": "Certificate deleted"})


class CertificatePrepareAPIView(APIView):
    """
    Create-or-get a Certificate row (certificate_url is empty for now) and return
    all details required to render the certificate on the frontend.

    POST /certificates/prepare/<int:skill_assessment_id>/?talent_id=<optional-staff-only>

    - Non-staff: auto-binds to request.user.profile (403 if no profile).
    - Staff: can pass ?talent_id=... to prepare on behalf of a talent.
    - Idempotent: if a Certificate already exists for (talent, assessment), it is returned.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, skill_assessment_id: int):
        # confirm assessment exists
        assessment = GeneralSkillAssessment.objects.filter(
            id=skill_assessment_id
        ).first()
        if not assessment:
            return Response(status=404, data={"error": "Skill assessment not found"})

        # resolve target talent
        if request.user.is_staff and request.query_params.get("talent_id"):
            try:
                talent = TalentProfile.objects.get(id=request.query_params["talent_id"])
            except TalentProfile.DoesNotExist:
                return Response(status=404, data={"error": "Talent not found"})
        else:
            talent = getattr(request.user, "profile", None)
            if not talent:
                return Response(
                    status=403, data={"error": "You do not have a TalentProfile."}
                )

        try:
            with transaction.atomic():
                cert, created = Certificate.objects.get_or_create(
                    talent=talent, skill_assessment=assessment, defaults={}
                )
        except IntegrityError:
            cert = Certificate.objects.filter(
                talent=talent, skill_assessment=assessment
            ).first()

        data = CertificateRenderInitSerializer(cert, context={"request": request}).data

        return Response(status=200 if not created else 201, data=data)


class CertificateUploadAPIView(APIView):
    """
    Attach the final rendered PDF to the Certificate created by the prepare endpoint.

    PATCH /certificates/<int:pk>/upload/
    Body: multipart/form-data with 'certificate_url' file
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk: int):
        django_request = request._request  # DRF wraps Django's HttpRequest
        django_request.upload_handlers = [TemporaryFileUploadHandler(django_request)]
        cert = (
            Certificate.objects.select_related("talent__user", "skill_assessment")
            .filter(pk=pk)
            .first()
        )
        if not cert:
            return Response(status=404, data={"error": "Certificate not found"})

        self.check_object_permissions(request, cert)

        serializer = CertificateUploadSerializer(
            cert, data=request.data, partial=True, context={"request": request}
        )
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            payload = CertificateReadSerializer(cert, context={"request": request}).data
            return Response(status=200, data=payload)
        except Exception as e:
            from rest_framework.exceptions import ValidationError

            if isinstance(e, ValidationError):
                return Response(status=400, data=e.detail)
            return Response(
                status=500,
                data={
                    "error": "An unexpected error occurred while uploading the certificate."
                },
            )


class CertificatePublicLatestByPortfolioSlugView(APIView):
    """
    GET /certificates/public/by-portfolio/<slug>/?skill_assessment_id=<optional>
    Public: returns the most recent certificate for the talent behind this portfolio.
    """

    permission_classes = [AllowAny]


    def get(self, request, slug: str):
        portfolio = get_object_or_404(
            Portfolio.objects.select_related("talent__user", "talent__role"),
            slug=slug,
        )
        qs = Certificate.objects.select_related(
            "talent__user", "skill_assessment"
        ).filter(talent=portfolio.talent)

        sa_id = request.query_params.get("skill_assessment_id")
        if sa_id:
            qs = qs.filter(skill_assessment_id=sa_id)

        cert = qs.order_by("-issued_at", "-id").first()
        if not cert:
            return Response(
                {"error": "No certificate found for this portfolio."}, status=404
            )

        data = CertificatePublicSerializer(cert, context={"request": request}).data
        resp = Response(data, status=200)
        resp["Cache-Control"] = "public, max-age=300"
        return resp
    
class CertificatePublicListByPortfolioSlugView(generics.ListAPIView):
    """
    GET /certificates/public/by-portfolio/<slug>/list/?skill_assessment_id=<optional>&page=&page_size=
    Public: lists all certificates for the portfolio’s talent, newest first.
    sa_id: skill_assesssment_id
    qs:queryset
    """

    permission_classes = [AllowAny]
    serializer_class = CertificatePublicSerializer
   

    def get_queryset(self):
        slug = self.kwargs["slug"]
        portfolio = get_object_or_404(
            Portfolio.objects.select_related("talent__user", "talent__role"),
            slug=slug,
        )

        qs = Certificate.objects.select_related(
            "talent__user", "skill_assessment"
        ).filter(talent=portfolio.talent)

        sa_id = self.request.query_params.get("skill_assessment_id")
        if sa_id:
            qs = qs.filter(skill_assessment_id=sa_id)

        return qs.order_by("-issued_at", "-id")


class AssessmentCooldownStatusAPIView(APIView):
    """
    GET: Check cooldown status for a talent and assessment
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, skill_assessment_id):
        talent = getattr(request.user, "profile", None)
        if not talent:
            return Response(
                status=403, 
                data={"error": "You do not have a TalentProfile."}
            )

        try:
            skill_assessment = GeneralSkillAssessment.objects.get(id=skill_assessment_id)
        except GeneralSkillAssessment.DoesNotExist:
            return Response(
                status=404, 
                data={"error": "Skill assessment not found"}
            )

        # Check for active cooldown
        active_cooldown = AssessmentCooldown.objects.filter(
            talent=talent,
            skill_assessment=skill_assessment
        ).first()

        if active_cooldown:
            data = AssessmentCooldownSerializer(active_cooldown).data
            data["can_take_assessment"] = not active_cooldown.is_active()
            return Response(data=data, status=200)
        else:
            return Response(
                data={
                    "can_take_assessment": True,
                    "cooldown_active": False
                }, 
                status=200
            )


class AssessmentRetakeLinkAPIView(APIView):
    """
    GET: Generate retake link for a specific assessment
    This endpoint generates the correct retake URL for the assessment
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, skill_assessment_id):
        talent = getattr(request.user, "profile", None)
        if not talent:
            return Response(
                status=403, 
                data={"error": "You do not have a TalentProfile."}
            )

        try:
            skill_assessment = GeneralSkillAssessment.objects.get(id=skill_assessment_id)
        except GeneralSkillAssessment.DoesNotExist:
            return Response(
                status=404, 
                data={"error": "Skill assessment not found"}
            )

        # Check if user has permission to take this assessment
        if skill_assessment.assigned_to and skill_assessment.assigned_to != talent:
            return Response(
                status=403, 
                data={"error": "You are not allowed to take this assessment"}
            )
        if skill_assessment.job_application and skill_assessment.job_application.applicant != talent:
            return Response(
                status=403, 
                data={"error": "You are not allowed to take this assessment"}
            )

        # Check for active cooldown
        active_cooldown = AssessmentCooldown.objects.filter(
            talent=talent,
            skill_assessment=skill_assessment
        ).first()

        if active_cooldown and active_cooldown.is_active():
            days_remaining = active_cooldown.days_remaining()
            return Response(
                status=403, 
                data={
                    "error": f"You must wait {days_remaining} more days before retaking this assessment. You can retake it on {active_cooldown.cooldown_ends_at.date()}.",
                    "cooldown_ends_at": active_cooldown.cooldown_ends_at.isoformat(),
                    "days_remaining": days_remaining,
                    "can_retake": False
                }
            )

        # Generate the appropriate retake URL based on assessment type
        if skill_assessment.is_tiaago_skill_assessment:
            # For Tiaago assessments, use the verification endpoint
            retake_url = f"{request.scheme}://{request.get_host()}/api/assessments/talent/start/"
        else:
            # For company assessments, use the take endpoint
            retake_url = f"{request.scheme}://{request.get_host()}/api/assessments/company-assessments/{skill_assessment_id}/take"

        return Response(
            data={
                "retake_url": retake_url,
                "assessment_id": skill_assessment_id,
                "assessment_title": skill_assessment.title,
                "can_retake": True,
                "assessment_type": "tiaago" if skill_assessment.is_tiaago_skill_assessment else "company"
            },
            status=200
        )


class PublicAssessmentRetakeLinkAPIView(APIView):
    """
    GET: Generate retake link for a specific assessment (public endpoint)
    This endpoint can be used in emails and doesn't require authentication
    """
    permission_classes = [AllowAny]

    def get(self, request, skill_assessment_id):
        try:
            skill_assessment = GeneralSkillAssessment.objects.get(id=skill_assessment_id)
        except GeneralSkillAssessment.DoesNotExist:
            return Response(
                status=404, 
                data={"error": "Skill assessment not found"}
            )

        # Generate the appropriate retake URL based on assessment type
        if skill_assessment.is_tiaago_skill_assessment:
            # For Tiaago assessments, use the verification endpoint
            retake_url = f"{request.scheme}://{request.get_host()}/api/assessments/talent/start/"
        else:
            # For company assessments, use the take endpoint
            retake_url = f"{request.scheme}://{request.get_host()}/api/assessments/company-assessments/{skill_assessment_id}/take"

        return Response(
            data={
                "retake_url": retake_url,
                "assessment_id": skill_assessment_id,
                "assessment_title": skill_assessment.title,
                "assessment_type": "tiaago" if skill_assessment.is_tiaago_skill_assessment else "company"
            },
            status=200
        )
