import csv
import io
import uuid
from datetime import timedelta
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
from rest_framework.throttling import ScopedRateThrottle
from django.core.files.uploadhandler import TemporaryFileUploadHandler

from base.mixins.pagination import PaginationHandlerMixin, TiaagoPagination
from rest_framework.permissions import IsAuthenticated
from base.permissions import (
    IsCompanyRepOrTalentUser,
    IsCompanyRepOrStaffUser,
    IsStaffUser,
)
from create_user.utils import User
from create_user.permissions import user_is_company_role, get_company_membership, get_user_company
from create_user.models import CompanyTeamMember
from skill_assessment.constants import SkillAssessmentTypes
from create_user.models import TalentProfile

from skill_assessment.tasks import mark_skill_assessment_submission, finalize_graded_submission, _to_score, DEFAULT_PASSING_GRADE
from skill_assessment.utils import (
    resolve_invite_talent,
    get_submission_candidate_name,
    get_submission_candidate_email,
)
from .filters import GeneralSkillAssessmentFilter
from .models import (
    DIFFICULTY_LEVEL_CHOICES,
    CandidateAssessmentMCQAnswer,
    CandidateAssessmentCodingAnswer,
    CandidateAssessmentOpenEndedAnswer,
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
    AssessmentSubmissionSnapshot,
    OpenEndedQuestion,
    AssessmentBundle,
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
    RecruiterSubmissionAnswersSerializer,
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
    AssessmentInviteDetailSerializer,
    AssessmentInviteConfirmSerializer,
    AssessmentInviteFeedbackSerializer,
    AssessmentSubmissionSnapshotSerializer,
    AssessmentBundleSerializer,
    AssessmentBundlePreviewSerializer,
    BulkInviteCandidatesSerializer,
    AddBundleSectionSerializer,
    GradeOpenEndedSerializer,
    TalentQuestionBankManageSerializer,
    AssessmentBundleManageSerializer,
    AdminAssessmentFeedbackSerializer,
)
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from subscriptions.permissions import (
    IsTalentOrStaffUser,
    IsCompanyRepUser,
    IsTalentUser,
    IsStaffUserOrCompanyRepOrTalentUser
)
from utils.ai_service import AIService
from utils.elevenlabs_handler import elevenlabs_handler
from .services import queue_or_start_session, complete_session, activate_next_queued_session
from jobs.models import JobApplication, Portfolio, Job, Experience
from emails import emails
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
    pagination_class = TiaagoPagination

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
        company = get_user_company(request.user)
        if not company:
            return Response(status=403, data={"error": "No company associated."})
        if not request.user.is_staff and not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
            return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You do not have permission to create assessments for this company."})
        data = GeneralSkillAssessmentCreateSerializer(data=request.data)
        if data.is_valid():
            validated_data = data.validated_data
            skillsets = validated_data.pop("skillsets")

            # Guard against a double-submit (double click / slow-network
            # retry on the wizard's first "Continue") creating two rows for
            # one logical click: reuse a just-created, still-empty draft
            # with the same title instead of making a second one.
            dupe_window = timezone.now() - timedelta(seconds=15)
            existing = GeneralSkillAssessment.objects.filter(
                company=company,
                title=validated_data.get("title"),
                published=False,
                created_at__gte=dupe_window,
                sections__isnull=True,
            ).order_by("-created_at").first()
            if existing:
                return Response(
                    status=200,
                    data=GeneralSkillAssessmentListSerializer(existing).data,
                )

            unique_id = str(uuid.uuid4().hex)[:15]
            company_skill_assessment = GeneralSkillAssessment.objects.create(
                **validated_data, company=company, reference=unique_id
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
            queryset = GeneralSkillAssessment.objects.filter(
                company__isnull=True, job_application__isnull=True
            ).order_by("-created_at")
        elif request.user.is_staff:
            # source_template__isnull=True excludes per-candidate clones (see
            # _clone_standalone_assessment_for_candidate) -- without it, every
            # invited candidate makes what looks like a duplicate assessment
            # appear in this list, since a clone shares its template's
            # company/title/type and only differs by invited_email/source_template.
            queryset = GeneralSkillAssessment.objects.filter(
                source_template__isnull=True
            ).order_by("-created_at")
        else:
            company = get_user_company(request.user)
            if company:
                queryset = GeneralSkillAssessment.objects.filter(
                    company=company, job_application__isnull=True, source_template__isnull=True
                ).order_by("-created_at")
            else:
                queryset = GeneralSkillAssessment.objects.none()
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
                            assessment_section.mcq_questions_new.add(mcq_question_obj)

                    # if the section is a coding section (support multiple coding tasks)
                    elif section_type == SkillAssessmentTypes.CODING_TASK:
                        for coding_task_payload in coding_tasks:
                            test_cases = coding_task_payload.pop("test_cases", []) or []
                            coding_task_obj = CodingTask.objects.create(**coding_task_payload)
                            # create test cases if provided
                            for test_case in test_cases:
                                TestCase.objects.create(**test_case, coding_task=coding_task_obj)
                            assessment_section.coding_tasks.add(coding_task_obj)

                    # if the section is a manually-graded, free-text section
                    elif section_type == SkillAssessmentTypes.OPEN_ENDED:
                        open_ended_questions = section.get("open_ended_questions", []) or []
                        for oeq in open_ended_questions:
                            open_ended_obj = OpenEndedQuestion.objects.create(**oeq)
                            assessment_section.open_ended_questions.add(open_ended_obj)

                _promote_to_mixed_if_needed(company_skill_assessment)

            return Response(status=200, data={"message": "Skill assessment successfully updated"})
        except Exception as e:
            logger.exception("Failed to add sections to skill assessment: %s", e)
            return Response(status=500, data={"error": "Failed to update skill assessment"})


def _promote_to_mixed_if_needed(assessment):
    """An assessment created as a single type (MCQ/CODING_TASK/OPEN_ENDED)
    can end up with more than one section type on it -- either because the
    recruiter added a section of a different type via "Create Custom Test"
    (now allowed, see GeneralSkillAssessmentSectionSerializer.validate), or
    because a Test Library bundle spanning multiple types was added (see
    AddBundleSectionAPIView, which never restricted section types to begin
    with). Once that's true, the assessment's own declared type needs to
    catch up to MIXED so it accurately reflects what candidates will
    actually see -- CUSTOM (the separate Tiaago-verification type) is left
    alone, since it's never reachable from this recruiter-facing flow."""
    types_present = set(assessment.sections.values_list("type", flat=True).distinct())
    if len(types_present) > 1 and assessment.assessment_type != SkillAssessmentTypes.MIXED:
        assessment.assessment_type = SkillAssessmentTypes.MIXED
        assessment.save(update_fields=["assessment_type"])


def _get_owned_company_assessment(request, skill_assessment_id, require_draft=False, require_published=False):
    """Shared ownership + role check for the wizard endpoints below, all of
    which act on a company-owned standalone assessment (never a
    job-application-backed one -- those are AI-authored per-candidate and
    not recruiter-editable through this surface)."""
    assessment = GeneralSkillAssessment.objects.filter(
        id=skill_assessment_id, company=request.user.company, job_application__isnull=True,
    ).first()
    if not assessment:
        return None, Response(status=404, data={"error": "Skill assessment does not exist or has been deleted"})

    if request.user.is_company():
        company = getattr(request.user, "company", None)
        if not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
            return None, Response(status=403, data={"error": "You do not have permission to edit this assessment."})

    if require_draft and assessment.published:
        return None, Response(status=400, data={"error": "This assessment is already published and can no longer be edited."})
    if require_published and not assessment.published:
        return None, Response(status=400, data={"error": "This assessment must be published before candidates can be invited."})
    return assessment, None


class AddBundleSectionAPIView(APIView):
    """POST /company-assessments/<id>/sections/from-bundle/ -- clones a
    curated AssessmentBundle's question-bank entries into new section(s) on
    a draft assessment (the wizard's "Test Library" -> "Add"). Clone, not
    reference: later edits to the bundle (or the TalentQuestionBank rows
    behind it) never retroactively change an assessment already built from
    it, same as hand-authored sections."""

    permission_classes = [IsCompanyRepUser]

    def post(self, request, skill_assessment_id):
        assessment, error = _get_owned_company_assessment(request, skill_assessment_id, require_draft=True)
        if error:
            return error

        serializer = AddBundleSectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bundle = serializer.validated_data["bundle_id"]

        bank_questions = list(
            bundle.bank_questions.select_related("mcq_question", "coding_task", "open_ended_question")
            .prefetch_related("coding_task__test_cases")
        )
        mcq_entries = [bq for bq in bank_questions if bq.mcq_question_id]
        coding_entries = [bq for bq in bank_questions if bq.coding_task_id]
        open_ended_entries = [bq for bq in bank_questions if bq.open_ended_question_id]

        if not (mcq_entries or coding_entries or open_ended_entries):
            return Response(status=400, data={"error": "This bundle has no questions."})

        multi_type = sum(bool(x) for x in (mcq_entries, coding_entries, open_ended_entries)) > 1
        created_sections = []

        try:
            with transaction.atomic():
                if mcq_entries:
                    section = GeneralSkillAssessmentSection.objects.create(
                        name=f"{bundle.name} - Multiple Choice" if multi_type else bundle.name,
                        company_skill_assessment=assessment,
                        type=SkillAssessmentTypes.MCQ,
                    )
                    for bq in mcq_entries:
                        q = bq.mcq_question
                        new_q = GeneralSkillAssessmentMCQQuestion.objects.create(
                            question=q.question, options=q.options,
                            correct_option_index=q.correct_option_index,
                            is_ai_generated=q.is_ai_generated,
                        )
                        section.mcq_questions_new.add(new_q)
                    created_sections.append(section)

                if coding_entries:
                    section = GeneralSkillAssessmentSection.objects.create(
                        name=f"{bundle.name} - Coding" if multi_type else bundle.name,
                        company_skill_assessment=assessment,
                        type=SkillAssessmentTypes.CODING_TASK,
                    )
                    for bq in coding_entries:
                        t = bq.coding_task
                        new_task = CodingTask.objects.create(
                            is_ai_generated=t.is_ai_generated, title=t.title, description=t.description,
                            input_format=t.input_format, output_format=t.output_format,
                            constraints=t.constraints, sample_input=t.sample_input, sample_output=t.sample_output,
                            difficulty_level=t.difficulty_level, skills_assessed=t.skills_assessed,
                            max_score=t.max_score, time_limit=t.time_limit, stack=t.stack,
                        )
                        section.coding_tasks.add(new_task)
                        TestCase.objects.bulk_create([
                            TestCase(
                                coding_task=new_task, input_data=tc.input_data,
                                expected_output=tc.expected_output, is_sample=tc.is_sample,
                            )
                            for tc in t.test_cases.all()
                        ])
                    created_sections.append(section)

                if open_ended_entries:
                    section = GeneralSkillAssessmentSection.objects.create(
                        name=f"{bundle.name} - Open-Ended" if multi_type else bundle.name,
                        company_skill_assessment=assessment,
                        type=SkillAssessmentTypes.OPEN_ENDED,
                    )
                    for bq in open_ended_entries:
                        q = bq.open_ended_question
                        new_q = OpenEndedQuestion.objects.create(
                            is_ai_generated=q.is_ai_generated, question=q.question,
                            grading_guidance=q.grading_guidance, max_score=q.max_score,
                            skills_assessed=q.skills_assessed,
                        )
                        section.open_ended_questions.add(new_q)
                    created_sections.append(section)
            # The recruiter's own duration, set on step 1 before picking any
            # tests, is authoritative and stays put -- bundles no longer add
            # their own estimated_duration_minutes on top of it. Still
            # tracked on the first created section (bundle_duration_minutes)
            # purely for display; RemoveSectionAPIView no longer subtracts
            # it back out of the assessment's duration either.
            if created_sections:
                created_sections[0].bundle_duration_minutes = bundle.estimated_duration_minutes
                created_sections[0].save(update_fields=["bundle_duration_minutes"])
            _promote_to_mixed_if_needed(assessment)
        except Exception as e:
            logger.exception("Failed to add bundle section: %s", e)
            return Response(status=500, data={"error": "Failed to add bundle to assessment"})

        return Response(status=200, data={
            "message": f"Added {len(created_sections)} section(s) from '{bundle.name}'",
            "section_ids": [s.id for s in created_sections],
            "duration_minutes": assessment.duration_minutes,
        })


class RemoveSectionAPIView(APIView):
    """DELETE /company-assessments/<id>/sections/<section_id>/ -- removes a
    single section (bundle-added or hand-authored custom) from a still-draft
    assessment. Mirrors AddBundleSectionAPIView's ownership/draft checks."""

    permission_classes = [IsCompanyRepUser]

    def delete(self, request, skill_assessment_id, section_id):
        assessment, error = _get_owned_company_assessment(request, skill_assessment_id, require_draft=True)
        if error:
            return error

        section = assessment.sections.filter(id=section_id).first()
        if not section:
            return Response(status=404, data={"error": "Section not found on this assessment."})

        # duration_minutes is the recruiter's own step-1 value and is never
        # adjusted by adding/removing question-bank sections (see
        # AddBundleSectionAPIView.post) -- nothing to undo here.
        section.delete()
        return Response(status=200, data={
            "message": "Section removed.", "duration_minutes": assessment.duration_minutes,
        })


class BundleListAPIView(APIView, PaginationHandlerMixin):
    """GET /question-bank/bundles/ -- recommended/browsable bundles for the
    wizard's Step 2 and the /question-bank page. Optional ?role=<id> and
    ?search= filters."""

    permission_classes = [IsCompanyRepUser]

    def get(self, request):
        queryset = AssessmentBundle.objects.filter(active=True).select_related("role")
        role_id = request.GET.get("role")
        if role_id:
            queryset = queryset.filter(role_id=role_id)
        search = request.GET.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search)

        paginated_queryset = self.paginate_queryset(queryset)
        data = AssessmentBundleSerializer(paginated_queryset, many=True).data
        return Response(data=self.get_paginated_response(data), status=200)


class BundlePreviewAPIView(APIView):
    """GET /question-bank/bundles/<id>/preview/ -- full detail for one
    bundle (duration, description, the tech-stack languages its coding
    questions cover, a type breakdown, and a few sample question prompts)
    so a recruiter can judge fit before adding it to an assessment. Never
    exposes answers/correct options/test cases/grading guidance -- see
    AssessmentBundlePreviewSerializer."""

    permission_classes = [IsCompanyRepUser]

    def get(self, request, pk):
        bundle = (
            AssessmentBundle.objects.filter(id=pk, active=True)
            .select_related("role")
            .prefetch_related("bank_questions__mcq_question", "bank_questions__coding_task", "bank_questions__open_ended_question", "bank_questions__stack")
            .first()
        )
        if not bundle:
            return Response(status=404, data={"error": "Bundle not found."})
        return Response(status=200, data=AssessmentBundlePreviewSerializer(bundle).data)


class BundleMCQQuestionsAPIView(APIView):
    """GET /question-bank/bundles/<id>/mcq-questions/ -- the bundle's MCQ
    questions with full options and correct_option_index, for the job
    wizard's "use the question bank" assessment-source option. Unlike
    BundlePreviewAPIView this is not redacted: once a recruiter picks a
    bundle here its questions become their job's assessment content, which
    is exactly the same trust level as attaching a bundle to a
    CompanySkillAssessment via add-sections/from-bundle (already exposes the
    same full question data to the recruiter's own assessment)."""

    permission_classes = [IsCompanyRepUser]

    def get(self, request, pk):
        bundle = (
            AssessmentBundle.objects.filter(id=pk, active=True)
            .prefetch_related("bank_questions__mcq_question")
            .first()
        )
        if not bundle:
            return Response(status=404, data={"error": "Bundle not found."})

        questions = [
            {
                "question": entry.mcq_question.question,
                "options": entry.mcq_question.options,
                "correct_option_index": entry.mcq_question.correct_option_index,
                "is_ai_generated": entry.mcq_question.is_ai_generated,
            }
            for entry in bundle.bank_questions.all()
            if entry.mcq_question_id
        ]
        return Response(status=200, data={"id": bundle.id, "name": bundle.name, "questions": questions})


class TalentQuestionBankManageListCreateView(ListCreateAPIView):
    """Staff-only: list/create question-bank entries -- backs the
    /admin/assessment/question-bank pages."""

    serializer_class = TalentQuestionBankManageSerializer
    permission_classes = [IsStaffUser]
    pagination_class = TiaagoPagination

    def get_queryset(self):
        queryset = TalentQuestionBank.objects.select_related(
            "mcq_question", "coding_task", "open_ended_question", "role", "stack"
        ).order_by("-id")
        role_id = self.request.GET.get("role")
        if role_id:
            queryset = queryset.filter(role_id=role_id)
        question_type = self.request.GET.get("question_type")
        if question_type == SkillAssessmentTypes.MCQ:
            queryset = queryset.filter(mcq_question__isnull=False)
        elif question_type == SkillAssessmentTypes.CODING_TASK:
            queryset = queryset.filter(coding_task__isnull=False)
        elif question_type == SkillAssessmentTypes.OPEN_ENDED:
            queryset = queryset.filter(open_ended_question__isnull=False)
        return queryset


class TalentQuestionBankManageDetailView(RetrieveUpdateDestroyAPIView):
    """Staff-only: retrieve/update/delete a single question-bank entry."""

    serializer_class = TalentQuestionBankManageSerializer
    permission_classes = [IsStaffUser]
    queryset = TalentQuestionBank.objects.select_related(
        "mcq_question", "coding_task", "open_ended_question", "role", "stack"
    )


class QuestionBankCsvUploadView(APIView):
    """Staff-only: POST /staff/question-bank/csv-upload/ -- adds bare
    question-bank entries directly (no bundle wrapper), for the
    /admin/assessment/question-bank page's "Upload CSV" option. Same
    CSV/JSON-builder format as AssessmentBundleCsvUploadView (which wraps
    the same kind of entries in a new bundle) -- reuses its exact row/entry
    parsers, since those already only ever build bare TalentQuestionBank
    rows; only the "wrap in a new bundle" step differs here."""

    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        csv_file = request.FILES.get("csv_file")
        open_ended_raw = request.data.get("open_ended_questions")
        coding_tasks_raw = request.data.get("coding_tasks")
        if not csv_file and not open_ended_raw and not coding_tasks_raw:
            return Response(
                {"error": "Add questions via csv_file, open_ended_questions, coding_tasks, or a combination"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        role_id = request.data.get("role_id") or None
        stack_id = request.data.get("stack_id") or None
        difficulty_level = (request.data.get("difficulty_level") or "").strip().upper()
        if difficulty_level not in _VALID_DIFFICULTY_LEVELS:
            return Response(
                {"error": "A valid difficulty_level is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        reader = None
        if csv_file:
            try:
                decoded = csv_file.read().decode("utf-8-sig")
            except UnicodeDecodeError:
                return Response({"error": "Could not read the file as UTF-8 CSV"}, status=status.HTTP_400_BAD_REQUEST)
            reader = csv.DictReader(io.StringIO(decoded))
            if reader.fieldnames is None:
                return Response({"error": "CSV file has no header row"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                bank_entries = []
                if reader is not None:
                    bank_entries += [
                        _parse_bundle_csv_row(row, row_number, difficulty_level)
                        for row_number, row in enumerate(reader, start=2)  # row 1 is the header
                    ]
                if open_ended_raw:
                    bank_entries += _parse_bundle_open_ended_entries(open_ended_raw, difficulty_level)
                if coding_tasks_raw:
                    bank_entries += _parse_bundle_coding_task_entries(coding_tasks_raw, difficulty_level)

                if not bank_entries:
                    raise ValidationError(
                        "Add at least one question via CSV, the open-ended builder, or the coding task builder"
                    )

                if role_id or stack_id:
                    TalentQuestionBank.objects.filter(
                        id__in=[e.id for e in bank_entries]
                    ).update(**({"role_id": role_id} if role_id else {}), **({"stack_id": stack_id} if stack_id else {}))
        except ValidationError as e:
            message = e.message if hasattr(e, "message") else str(e)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        entries = TalentQuestionBank.objects.filter(id__in=[e.id for e in bank_entries]).select_related(
            "mcq_question", "coding_task", "open_ended_question", "role", "stack"
        )
        return Response(
            TalentQuestionBankManageSerializer(entries, many=True).data, status=status.HTTP_201_CREATED
        )


class GenerateQuestionBankQuestionsView(APIView):
    """Staff-only: POST /staff/question-bank/generate/ -- AI-generates MCQ or
    coding questions straight into the question bank, for the
    /admin/assessment/question-bank page's "Generate with AI" option. Reuses
    the same AIService calls the job-wizard/talent-verification flows
    already use for question generation (utils.ai_service.AIService), just
    persisted as bare TalentQuestionBank entries instead of assessment
    sections. No open-ended option: no existing AIService method generates
    grading-rubric-style questions, and this doesn't invent a new one."""

    permission_classes = [IsStaffUser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "question_bank_generation"

    def post(self, request):
        question_type = (request.data.get("question_type") or "").strip().upper()
        topic = (request.data.get("topic") or "").strip()
        role_id = request.data.get("role_id") or None
        stack_id = request.data.get("stack_id") or None
        difficulty_level = (request.data.get("difficulty_level") or "").strip().upper()
        try:
            count = int(request.data.get("count") or 5)
        except (TypeError, ValueError):
            count = 5
        count = max(1, min(count, 20))

        if question_type not in (SkillAssessmentTypes.MCQ, SkillAssessmentTypes.CODING_TASK):
            return Response({"error": "question_type must be MCQ or CODING_TASK"}, status=400)
        if difficulty_level not in _VALID_DIFFICULTY_LEVELS:
            return Response({"error": "A valid difficulty_level is required"}, status=400)
        if not topic:
            return Response(
                {"error": "topic is required -- e.g. a role, tech stack, or short description to generate questions about"},
                status=400,
            )

        try:
            if question_type == SkillAssessmentTypes.MCQ:
                questions = AIService.get_mcq_questions(job_description=topic, num_questions=count)
            else:
                coding_result = AIService.get_talent_coding_questions(
                    programming_languages=topic, difficulty=difficulty_level.lower(), num_questions=count,
                )
                questions = coding_result.get("questions") if coding_result else None
        except Exception as e:
            logger.exception("Question bank AI generation failed: %s", e)
            return Response({"error": "AI question generation failed. Please try again."}, status=502)

        if not questions:
            return Response({"error": "The AI service returned no questions. Please try again."}, status=502)

        bank_entries = []
        with transaction.atomic():
            if question_type == SkillAssessmentTypes.MCQ:
                for q in questions:
                    mcq = GeneralSkillAssessmentMCQQuestion.objects.create(
                        question=q.get("question"),
                        options=q.get("options"),
                        correct_option_index=q.get("correct_option_index"),
                        is_ai_generated=True,
                    )
                    bank_entries.append(TalentQuestionBank.objects.create(
                        mcq_question=mcq, difficulty_level=difficulty_level, role_id=role_id, stack_id=stack_id,
                    ))
            else:
                for q in questions:
                    coding_task = CodingTask.objects.create(
                        title=(q.get("question") or "Untitled coding task")[:255],
                        description=q.get("question") or "",
                        constraints=q.get("function_signature") or "",
                        difficulty_level=difficulty_level,
                        skills_assessed=q.get("skills_assessed", []),
                        is_ai_generated=True,
                    )
                    for tc in q.get("test_cases", []) or []:
                        TestCase.objects.create(
                            coding_task=coding_task,
                            input_data=tc.get("input"), expected_output=tc.get("expected_output"),
                        )
                    bank_entries.append(TalentQuestionBank.objects.create(
                        coding_task=coding_task, difficulty_level=difficulty_level, role_id=role_id, stack_id=stack_id,
                    ))

        return Response(
            TalentQuestionBankManageSerializer(bank_entries, many=True).data, status=status.HTTP_201_CREATED
        )


class AdminAssessmentFeedbackListView(generics.ListAPIView):
    """Staff-only: every candidate's post-submit star rating + comment (see
    AssessmentInviteFeedbackView, which persists these onto
    CandidateAssessmentSubmission) -- backs /admin/assessments/feedback so
    staff can see what candidates actually thought of an assessment, not
    just its pass/fail numbers. Only rows where feedback was actually left
    show up here; the vast majority of submissions never get any."""

    serializer_class = AdminAssessmentFeedbackSerializer
    permission_classes = [IsStaffUser]
    pagination_class = TiaagoPagination

    def get_queryset(self):
        queryset = (
            CandidateAssessmentSubmission.objects.filter(
                Q(feedback_rating__isnull=False) | ~Q(feedback_comment="")
            )
            .select_related(
                "candidate", "candidate__user", "skill_assessment", "skill_assessment__company",
                "skill_assessment__job_application",
            )
            .order_by("-completed_at")
        )
        rating = self.request.GET.get("rating")
        if rating:
            queryset = queryset.filter(feedback_rating=rating)
        return queryset


class AssessmentBundleManageListCreateView(ListCreateAPIView):
    """Staff-only: list/create bundles -- backs the /admin/assessment/bundles
    pages."""

    serializer_class = AssessmentBundleManageSerializer
    permission_classes = [IsStaffUser]
    pagination_class = TiaagoPagination

    def get_queryset(self):
        queryset = AssessmentBundle.objects.all().select_related("role").prefetch_related(
            "bank_questions__mcq_question", "bank_questions__coding_task", "bank_questions__open_ended_question",
        ).order_by("-id")
        role_id = self.request.GET.get("role")
        if role_id:
            queryset = queryset.filter(role_id=role_id)
        return queryset


class AssessmentBundleManageDetailView(RetrieveUpdateDestroyAPIView):
    """Staff-only: retrieve/update/delete a single bundle."""

    serializer_class = AssessmentBundleManageSerializer
    permission_classes = [IsStaffUser]
    queryset = AssessmentBundle.objects.all().select_related("role").prefetch_related(
        "bank_questions__mcq_question", "bank_questions__coding_task", "bank_questions__open_ended_question",
    )


_VALID_DIFFICULTY_LEVELS = {choice[0].upper() for choice in DIFFICULTY_LEVEL_CHOICES}
_VALID_CSV_QUESTION_TYPES = {"MCQ", "CODING_TASK"}
_OPTION_LETTERS = ["a", "b", "c", "d"]


def _parse_bundle_csv_row(row: dict, row_number: int, default_difficulty: str):
    """Builds one TalentQuestionBank (+ its underlying question row) from a
    single CSV row. The CSV format is intentionally strict -- only MCQ and
    CODING_TASK rows, with columns: question_type, question, option_a,
    option_b, option_c, option_d, correct_option, difficulty_level. Richer
    per-question detail (coding task description/sample IO, open-ended
    grading guidance) is entered via the builder's optional inline sections
    instead (see _parse_bundle_open_ended_entries /
    _parse_bundle_coding_task_entries), not via CSV columns.
    Raises ValidationError with a row number on any problem so the whole
    upload can report exactly which row is wrong rather than failing
    silently or generically."""
    question_type = (row.get("question_type") or "").strip().upper()
    if question_type not in _VALID_CSV_QUESTION_TYPES:
        raise ValidationError(
            f"Row {row_number}: question_type must be one of MCQ, CODING_TASK (got {question_type!r})"
        )

    difficulty_level = (row.get("difficulty_level") or "").strip().upper() or default_difficulty
    if difficulty_level not in _VALID_DIFFICULTY_LEVELS:
        raise ValidationError(
            f"Row {row_number}: difficulty_level must be one of {sorted(_VALID_DIFFICULTY_LEVELS)} (got {difficulty_level!r})"
        )

    question_text = (row.get("question") or "").strip()
    if not question_text:
        raise ValidationError(f"Row {row_number}: question is required")

    if question_type == "MCQ":
        lettered_options = [
            (letter, (row.get(f"option_{letter}") or "").strip()) for letter in _OPTION_LETTERS
        ]
        non_empty_options = [(letter, value) for letter, value in lettered_options if value]
        if len(non_empty_options) < 2:
            raise ValidationError(f"Row {row_number}: MCQ needs at least 2 non-empty options (option_a-option_d)")

        correct_letter = (row.get("correct_option") or "").strip().lower()
        correct_index = next(
            (i for i, (letter, _) in enumerate(non_empty_options, start=1) if letter == correct_letter),
            None,
        )
        if correct_index is None:
            raise ValidationError(
                f"Row {row_number}: correct_option must be one of a, b, c, d matching a non-empty option column"
            )

        mcq = GeneralSkillAssessmentMCQQuestion.objects.create(
            question=question_text,
            options=[{"value": value, "index": i + 1} for i, (_, value) in enumerate(non_empty_options)],
            correct_option_index=correct_index,
        )
        return TalentQuestionBank.objects.create(
            mcq_question=mcq, difficulty_level=difficulty_level,
        )

    # CODING_TASK -- only title + difficulty_level come from the strict CSV;
    # full detail (description, sample input/output) is optional and entered
    # via the coding_tasks builder section instead (_parse_bundle_coding_task_entries).
    coding_task = CodingTask.objects.create(
        title=question_text,
        description="",
        difficulty_level=difficulty_level,
    )
    return TalentQuestionBank.objects.create(
        coding_task=coding_task, difficulty_level=difficulty_level,
    )


def _parse_bundle_open_ended_entries(raw: str, default_difficulty: str):
    """Builds TalentQuestionBank rows for open-ended questions submitted as a
    JSON list (from the bundle builder's inline form) rather than CSV rows --
    open-ended questions are free-text grading rubrics, not tabular data, so
    forcing them through a CSV file is unnecessary friction. Mirrors the
    validation style of _parse_bundle_csv_row (row-numbered ValidationErrors)
    so both paths report errors the same way."""
    try:
        entries = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError("open_ended_questions must be valid JSON")
    if not isinstance(entries, list):
        raise ValidationError("open_ended_questions must be a JSON array")

    bank_entries = []
    for i, item in enumerate(entries, start=1):
        if not isinstance(item, dict):
            raise ValidationError(f"Open-ended question {i}: must be an object")
        question_text = (item.get("question") or "").strip()
        if not question_text:
            raise ValidationError(f"Open-ended question {i}: question text is required")

        difficulty_level = (item.get("difficulty_level") or "").strip().upper() or default_difficulty
        if difficulty_level not in _VALID_DIFFICULTY_LEVELS:
            raise ValidationError(
                f"Open-ended question {i}: difficulty_level must be one of {sorted(_VALID_DIFFICULTY_LEVELS)}"
            )

        skills_assessed = item.get("skills_assessed") or []
        if isinstance(skills_assessed, str):
            skills_assessed = [s.strip() for s in skills_assessed.split(";") if s.strip()]

        open_ended = OpenEndedQuestion.objects.create(
            question=question_text,
            grading_guidance=(item.get("grading_guidance") or "").strip(),
            skills_assessed=skills_assessed,
        )
        bank_entries.append(
            TalentQuestionBank.objects.create(
                open_ended_question=open_ended, difficulty_level=difficulty_level,
            )
        )
    return bank_entries


def _parse_bundle_coding_task_entries(raw: str, default_difficulty: str):
    """Builds TalentQuestionBank rows for coding tasks submitted as a JSON
    list (from the bundle builder's optional inline form) rather than CSV
    rows -- mirrors _parse_bundle_open_ended_entries, letting a coding task
    carry a full description/sample input/output without forcing those
    columns into the strict CSV format."""
    try:
        entries = json.loads(raw)
    except (TypeError, ValueError):
        raise ValidationError("coding_tasks must be valid JSON")
    if not isinstance(entries, list):
        raise ValidationError("coding_tasks must be a JSON array")

    bank_entries = []
    for i, item in enumerate(entries, start=1):
        if not isinstance(item, dict):
            raise ValidationError(f"Coding task {i}: must be an object")
        title = (item.get("question") or item.get("title") or "").strip()
        if not title:
            raise ValidationError(f"Coding task {i}: title/question text is required")

        difficulty_level = (item.get("difficulty_level") or "").strip().upper() or default_difficulty
        if difficulty_level not in _VALID_DIFFICULTY_LEVELS:
            raise ValidationError(
                f"Coding task {i}: difficulty_level must be one of {sorted(_VALID_DIFFICULTY_LEVELS)}"
            )

        skills_assessed = item.get("skills_assessed") or []
        if isinstance(skills_assessed, str):
            skills_assessed = [s.strip() for s in skills_assessed.split(";") if s.strip()]

        coding_task = CodingTask.objects.create(
            title=title,
            description=(item.get("description") or "").strip(),
            sample_input=(item.get("sample_input") or "").strip(),
            sample_output=(item.get("sample_output") or "").strip(),
            difficulty_level=difficulty_level,
            skills_assessed=skills_assessed,
        )
        bank_entries.append(
            TalentQuestionBank.objects.create(
                coding_task=coding_task, difficulty_level=difficulty_level,
            )
        )
    return bank_entries


class AssessmentBundleCsvUploadView(APIView):
    """Staff-only: POST /staff/bundles/csv-upload/ -- creates a bundle and
    its questions in one step. Expected multipart fields: name, description,
    role_id, difficulty_level, estimated_duration_minutes, is_recommended,
    plus at least one of:
      - csv_file: strict MCQ / CODING_TASK rows (see column list below).
      - open_ended_questions: a JSON-encoded array of
        {question, grading_guidance, skills_assessed, difficulty_level?}
        for open-ended questions authored directly in the builder UI instead
        of via CSV.
      - coding_tasks: a JSON-encoded array of
        {question, description, sample_input, sample_output,
        skills_assessed, difficulty_level?} for coding tasks that need full
        detail beyond the CSV's bare title, authored via the builder UI.

    CSV columns (header row required, strict): question_type, question,
    option_a, option_b, option_c, option_d, correct_option, difficulty_level.
    question_type must be MCQ or CODING_TASK -- see _parse_bundle_csv_row for
    exactly what each type reads. difficulty_level is optional per row; a
    blank value falls back to the bundle-level value in the form fields
    above. correct_option is the letter (a-d) of the correct option column.
    """

    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        csv_file = request.FILES.get("csv_file")
        open_ended_raw = request.data.get("open_ended_questions")
        coding_tasks_raw = request.data.get("coding_tasks")
        if not csv_file and not open_ended_raw and not coding_tasks_raw:
            return Response(
                {"error": "Add questions via csv_file, open_ended_questions, coding_tasks, or a combination"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = (request.data.get("name") or "").strip()
        role_id = request.data.get("role_id")
        difficulty_level = (request.data.get("difficulty_level") or "").strip().upper()
        if not name or not role_id or difficulty_level not in _VALID_DIFFICULTY_LEVELS:
            return Response(
                {"error": "name, role_id, and a valid difficulty_level are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = None
        if csv_file:
            try:
                decoded = csv_file.read().decode("utf-8-sig")
            except UnicodeDecodeError:
                return Response({"error": "Could not read the file as UTF-8 CSV"}, status=status.HTTP_400_BAD_REQUEST)

            reader = csv.DictReader(io.StringIO(decoded))
            if reader.fieldnames is None:
                return Response({"error": "CSV file has no header row"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                bank_entries = []
                if reader is not None:
                    bank_entries += [
                        _parse_bundle_csv_row(row, row_number, difficulty_level)
                        for row_number, row in enumerate(reader, start=2)  # row 1 is the header
                    ]
                if open_ended_raw:
                    bank_entries += _parse_bundle_open_ended_entries(open_ended_raw, difficulty_level)
                if coding_tasks_raw:
                    bank_entries += _parse_bundle_coding_task_entries(coding_tasks_raw, difficulty_level)

                if not bank_entries:
                    raise ValidationError("Add at least one question via CSV, the open-ended builder, or the coding task builder")

                bundle = AssessmentBundle.objects.create(
                    name=name,
                    description=request.data.get("description") or "",
                    role_id=role_id,
                    difficulty_level=difficulty_level,
                    estimated_duration_minutes=int(request.data.get("estimated_duration_minutes") or 30),
                    is_recommended=str(request.data.get("is_recommended")).lower() in ("true", "1", "on"),
                )
                bundle.bank_questions.set(bank_entries)
        except ValidationError as e:
            message = e.message if hasattr(e, "message") else str(e)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            AssessmentBundleManageSerializer(bundle).data, status=status.HTTP_201_CREATED
        )


class PublishAssessmentAPIView(APIView):
    """POST /company-assessments/<id>/publish/ -- finalizes a draft as the
    invitable template. Sections/questions are effectively locked once
    published (see _get_owned_company_assessment's require_draft checks on
    the editing endpoints above) -- further changes require building a new
    assessment, so an already-invited candidate is never graded against a
    moving target."""

    permission_classes = [IsCompanyRepUser]

    def post(self, request, skill_assessment_id):
        assessment, error = _get_owned_company_assessment(request, skill_assessment_id, require_draft=True)
        if error:
            return error

        if not assessment.sections.exists():
            return Response(status=400, data={"error": "Add at least one section before publishing."})

        assessment.published = True
        assessment.save(update_fields=["published"])
        return Response(status=200, data=GeneralSkillAssessmentListSerializer(assessment).data)


def _clone_standalone_assessment_for_candidate(template, email, name):
    """Deep-clone a published, recruiter-built standalone assessment into a
    fresh per-candidate row -- mirrors the clone-not-reference pattern
    jobs/tasks.py's send_assessment_link already uses for job invites. Every
    invited candidate gets their own independent copy of every
    section/question row (own invite_token too), so later edits to the
    template never retroactively change an invite that's already gone out."""
    clone = GeneralSkillAssessment.objects.create(
        company=template.company,
        title=template.title,
        published=True,
        difficulty_level=template.difficulty_level,
        description=template.description,
        duration_minutes=template.duration_minutes,
        passing_grade=template.passing_grade,
        display_review_and_approve_responses=template.display_review_and_approve_responses,
        display_feedback=template.display_feedback,
        shuffle_questions=template.shuffle_questions,
        show_results_to_candidate=template.show_results_to_candidate,
        use_public_link=template.use_public_link,
        use_start_and_end_time=template.use_start_and_end_time,
        start_at=template.start_at,
        end_at=template.end_at,
        reference=str(uuid.uuid4().hex)[:15],
        assessment_type=template.assessment_type,
        assessment_stack=template.assessment_stack,
        invited_email=email,
        invited_name=name,
        source_template=template,
    )
    clone.skillsets.set(template.skillsets.all())

    for section in template.sections.all().prefetch_related(
        "mcq_questions_new", "coding_tasks__test_cases", "open_ended_questions"
    ):
        new_section = GeneralSkillAssessmentSection.objects.create(
            name=section.name, company_skill_assessment=clone, type=section.type,
        )
        for q in section.mcq_questions_new.all():
            new_q = GeneralSkillAssessmentMCQQuestion.objects.create(
                question=q.question, options=q.options,
                correct_option_index=q.correct_option_index, is_ai_generated=q.is_ai_generated,
            )
            new_section.mcq_questions_new.add(new_q)
        for t in section.coding_tasks.all():
            new_task = CodingTask.objects.create(
                is_ai_generated=t.is_ai_generated, title=t.title, description=t.description,
                input_format=t.input_format, output_format=t.output_format,
                constraints=t.constraints, sample_input=t.sample_input, sample_output=t.sample_output,
                difficulty_level=t.difficulty_level, skills_assessed=t.skills_assessed,
                max_score=t.max_score, time_limit=t.time_limit, stack=t.stack,
            )
            new_section.coding_tasks.add(new_task)
            TestCase.objects.bulk_create([
                TestCase(
                    coding_task=new_task, input_data=tc.input_data,
                    expected_output=tc.expected_output, is_sample=tc.is_sample,
                )
                for tc in t.test_cases.all()
            ])
        for q in section.open_ended_questions.all():
            new_q = OpenEndedQuestion.objects.create(
                is_ai_generated=q.is_ai_generated, question=q.question,
                grading_guidance=q.grading_guidance, max_score=q.max_score,
                skills_assessed=q.skills_assessed,
            )
            new_section.open_ended_questions.add(new_q)

    return clone


class InviteCandidatesToAssessmentAPIView(APIView):
    """POST /company-assessments/<id>/invite/ -- clones the published
    template into one fresh GeneralSkillAssessment per invited candidate and
    emails each an invite link. Never creates a CustomUser/TalentProfile --
    candidates are identified purely by invited_email/invited_name (see
    GeneralSkillAssessment.invited_email and skill_assessment.utils)."""

    permission_classes = [IsCompanyRepUser]

    def post(self, request, skill_assessment_id):
        from subscriptions.billing_service import BillingService
        from subscriptions.helper import has_active_subscription_capacity
        from subscriptions.models import UserUsage

        template, error = _get_owned_company_assessment(request, skill_assessment_id, require_published=True)
        if error:
            return error

        serializer = BulkInviteCandidatesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invites = serializer.validated_data["invites"]

        company = template.company
        sent, failed = [], []

        for invite in invites:
            email = invite["email"]
            name = invite["name"]
            try:
                with transaction.atomic():
                    clone = _clone_standalone_assessment_for_candidate(template, email, name)
                    clone.invite_sent_at = timezone.now()
                    clone.invite_deadline = clone.invite_sent_at + timedelta(hours=72)
                    clone.save(update_fields=["invite_sent_at", "invite_deadline"])

                # Billed the same way, at the same price, as a job-flow
                # assessment invite (jobs.tasks.send_assessment_link) --
                # subscription seat capacity first, wallet free-credit-then-
                # charge as the fallback. Blocks the invite (never sent) if
                # the wallet can't cover it, same as the job flow.
                usage = UserUsage.objects.filter(company=company).first()
                if not has_active_subscription_capacity(company, usage, determiner="assessment"):
                    billing_result = BillingService.process_standalone_assessment_charge(clone)
                    if not billing_result["success"]:
                        logger.warning(
                            "Standalone assessment invite not sent for %s: insufficient wallet balance", email,
                        )
                        failed.append(email)
                        continue

                emails.standalone_assessment_invite_mail(
                    email, name, clone, deadline=clone.invite_deadline,
                )
                sent.append(email)
            except Exception as e:
                logger.exception("Failed to invite %s to assessment %s: %s", email, template.id, e)
                failed.append(email)

        return Response(status=200, data={"sent": sent, "failed": failed})


class QuestionBankQuestionsAPIView(APIView, PaginationHandlerMixin):
    """
    This endpoint returns question bank questions based on the roles passed\n
    """

    permission_classes = [IsCompanyRepUser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "question_bank_generation"

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


def _assessment_detail_base_qs():
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


class GeneralSkillAssessmentDetailAPIView(APIView):
    """
    This endpoint is used to fetch a skill assessment\n
    [Perm: Anyone]
    qs: GeneralSkillAssessment with prefetches for sections + MCQs + coding tasks
    QUERYSET
    """

    permission_classes = [AllowAny]

    def _base_qs(self):
        return _assessment_detail_base_qs()

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

    def delete(self, request, skill_assessment_id):
        """Deletes a standalone company assessment (never a job-application-
        backed one -- those are per-candidate and not user-manageable here).
        Refused once any candidate has actually completed it, since
        CandidateAssessmentSubmission.skill_assessment is SET_NULL on delete
        -- allowing it would silently orphan real results instead of hard
        failing."""
        if not (request.user.is_authenticated and request.user.is_company()):
            return Response(status=403, data={"error": "You do not have permission to delete this assessment."})

        company = getattr(request.user, "company", None)
        if not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
            return Response(status=403, data={"error": "You do not have permission to delete this assessment."})

        assessment = GeneralSkillAssessment.objects.filter(
            id=skill_assessment_id, company=company, job_application__isnull=True,
        ).first()
        if not assessment:
            return Response(status=404, data={"error": "Skill assessment does not exist or has been deleted"})

        has_attempts = CandidateAssessmentSubmission.objects.filter(
            Q(skill_assessment_id=assessment.id) | Q(skill_assessment__source_template_id=assessment.id),
            is_completed=True,
        ).exists()
        if has_attempts:
            return Response(
                status=400,
                data={"error": "This assessment already has candidate submissions and can't be deleted."},
            )

        assessment.delete()
        return Response(status=200, data={"message": "Skill assessment deleted"})


def submit_general_skill_assessment_answers(talent, skill_assessment, request_data):
    """Core answer-submission logic, shared by the authenticated
    TakeAGeneralSkillAssessmentAPIView and the no-login token-based invite
    flow (AssessmentInviteSubmitView). `talent` is resolved by the caller --
    from `request.user.profile` for the authenticated path, or from
    `skill_assessment.job_application.applicant` for the token path."""
    try:
        if skill_assessment.assigned_to and skill_assessment.assigned_to != talent:
            return Response(status=403, data={"error": "You are not allowed to take this assessment"})
        if skill_assessment.job_application and skill_assessment.job_application.applicant != talent:
            return Response(status=400, data={"error": "You are not allowed to take this assessment"})

        if True:
            serializer = GeneralSkillAssessmentAnswerSerializer(
                data=request_data, context={"assessment": skill_assessment}
            )
            serializer.is_valid(raise_exception=True)
            answers = serializer.validated_data.get("answers", [])

            submitted_mcq = any((s.get("mcq_answers") or []) for s in answers)
            submitted_coding = any((s.get("coding_task_answers") or []) for s in answers)
            submitted_open_ended = any((s.get("open_ended_answers") or []) for s in answers)

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
                    "open_ended_questions",
                )
            )
            sections = {s.id: s for s in section_qs}
            unknown = [sid for sid in section_ids if sid not in sections]
            if unknown:
                return Response(status=400, data={"error": f"Invalid section ids for this assessment: {unknown}"})

            # 5) Reuse/create submission (no immediate completion) --------------
            submission, _created = CandidateAssessmentSubmission.objects.get_or_create(
                candidate=talent,
                skill_assessment=skill_assessment,
                defaults={"is_completed": False}
            )
            if _created:
                submission.started_at = timezone.now()
                submission.save(update_fields=["started_at"])

            # Server-side enforcement of the timed countdown -- the frontend
            # auto-submits at expiry, but that's only a client-side courtesy;
            # without this, a candidate who blocks/kills the timer JS could
            # keep answering indefinitely. Grace period absorbs normal
            # network latency on the auto-submit request itself.
            if (
                submission.started_at
                and getattr(skill_assessment, "duration_minutes", None)
                and not submission.is_completed
            ):
                deadline = submission.started_at + timedelta(
                    minutes=skill_assessment.duration_minutes
                ) + timedelta(seconds=90)
                if timezone.now() > deadline:
                    return Response(
                        status=400,
                        data={"error": "Time is up for this assessment -- no further answers can be submitted."},
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
            open_ended_answers_to_create = []

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

                # (b) build MCQ answers -- upsert against any rows that already exist
                # for this section (e.g. the blank ones force_complete_submission
                # backfills for a section the candidate was mid-way through when a
                # critical proctoring violation forced the submission). Bulk-creating
                # new rows alongside those blanks instead of overwriting them would
                # double the question count mark_mcq() divides by, deflating the
                # score for a section the candidate actually completed.
                mcq_answers_to_update = []
                if submitted_mcq:
                    existing_mcq_answers = {
                        (a.section_submission_id, a.question_id): a
                        for a in CandidateAssessmentMCQAnswer.objects.filter(
                            section_submission__in=existing_secs.values()
                        )
                    }
                    for s in answers:
                        sec_id = s["section_id"]
                        mcq_ans = s.get("mcq_answers", []) or []
                        if not mcq_ans:
                            continue
                        sec_sub = existing_secs[sec_id]
                        sel_map = {a["mcq_id"]: a["selected_option_index"] for a in mcq_ans}

                        links = getattr(sections[sec_id], "_prefetched_objects_cache", {}).get("section_mcqs")
                        if links is None:
                            links = sections[sec_id].section_mcqs.select_related("mcq").all()

                        for link in links:
                            q = link.mcq
                            selected = sel_map.get(q.id)
                            existing = existing_mcq_answers.get((sec_sub.id, q.id))
                            if existing:
                                if existing.selected_answer_index != selected:
                                    existing.selected_answer_index = selected
                                    mcq_answers_to_update.append(existing)
                            else:
                                mcq_answers_to_create.append(
                                    CandidateAssessmentMCQAnswer(
                                        section_submission=sec_sub,
                                        question=q,
                                        selected_answer_index=selected,
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

                # (d) build open-ended answers -- same upsert-against-blanks rule as
                # MCQ above (see comment on (b)).
                open_ended_answers_to_update = []
                if submitted_open_ended:
                    existing_open_ended_answers = {
                        (a.section_submission_id, a.open_ended_question_id): a
                        for a in CandidateAssessmentOpenEndedAnswer.objects.filter(
                            section_submission__in=existing_secs.values()
                        )
                    }
                    for s in answers:
                        sec_id = s["section_id"]
                        oe_ans = s.get("open_ended_answers", []) or []
                        if not oe_ans:
                            continue
                        sec_sub = existing_secs[sec_id]
                        allowed = {q.id: q for q in sections[sec_id].open_ended_questions.all()}

                        for ans in oe_ans:
                            q_id = ans.get("open_ended_question_id")
                            question = allowed.get(q_id)
                            if not question:
                                return Response(status=400, data={"error": f"Question {q_id} not in section {sec_id}"})
                            text = (ans.get("answer_text") or "").strip()
                            existing = existing_open_ended_answers.get((sec_sub.id, question.id))
                            if existing:
                                if existing.answer_text != text:
                                    existing.answer_text = text
                                    open_ended_answers_to_update.append(existing)
                            else:
                                open_ended_answers_to_create.append(
                                    CandidateAssessmentOpenEndedAnswer(
                                        section_submission=sec_sub,
                                        open_ended_question=question,
                                        answer_text=text,
                                    )
                                )

                if mcq_answers_to_create:
                    CandidateAssessmentMCQAnswer.objects.bulk_create(mcq_answers_to_create)
                if mcq_answers_to_update:
                    CandidateAssessmentMCQAnswer.objects.bulk_update(mcq_answers_to_update, ["selected_answer_index"])
                if open_ended_answers_to_update:
                    CandidateAssessmentOpenEndedAnswer.objects.bulk_update(open_ended_answers_to_update, ["answer_text"])
                if coding_answers_to_create:
                    CandidateAssessmentCodingAnswer.objects.bulk_create(coding_answers_to_create)
                if open_ended_answers_to_create:
                    CandidateAssessmentOpenEndedAnswer.objects.bulk_create(open_ended_answers_to_create)


                # Completion must be judged against EVERY section of this
                # assessment, not just the section(s) in this one request --
                # existing_secs above is scoped to the current request's
                # section_ids, which would otherwise mark a multi-section
                # assessment "done" as soon as any single MCQ/coding section
                # was answered, even with other required sections untouched.
                all_mcq_section_ids = set(
                    GeneralSkillAssessmentSection.objects.filter(
                        company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.MCQ
                    ).values_list("id", flat=True)
                )
                all_coding_section_ids = set(
                    GeneralSkillAssessmentSection.objects.filter(
                        company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.CODING_TASK
                    ).values_list("id", flat=True)
                )
                all_open_ended_section_ids = set(
                    GeneralSkillAssessmentSection.objects.filter(
                        company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.OPEN_ENDED
                    ).values_list("id", flat=True)
                )

                answered_mcq_section_ids = set(
                    CandidateAssessmentMCQAnswer.objects.filter(
                        section_submission__in=submission.skill_assessment_section_submissions.all()
                    ).values_list("section_submission__skill_assessment_section_id", flat=True)
                )
                answered_coding_section_ids = set(
                    CandidateAssessmentCodingAnswer.objects.filter(
                        section_submission__in=submission.skill_assessment_section_submissions.all()
                    ).values_list("section_submission__skill_assessment_section_id", flat=True)
                )
                answered_open_ended_section_ids = set(
                    CandidateAssessmentOpenEndedAnswer.objects.filter(
                        section_submission__in=submission.skill_assessment_section_submissions.all()
                    ).values_list("section_submission__skill_assessment_section_id", flat=True)
                )

                done_mcq = all_mcq_section_ids.issubset(answered_mcq_section_ids)
                done_coding = all_coding_section_ids.issubset(answered_coding_section_ids)
                done_open_ended = all_open_ended_section_ids.issubset(answered_open_ended_section_ids)
                if (done_mcq and done_coding and done_open_ended) and not submission.is_completed:
                    submission.is_completed = True
                    submission.save(update_fields=["is_completed"])

                # (f) if new answers were added but submission was already MARKED, reset to PENDING
                if (mcq_answers_to_create or coding_answers_to_create or open_ended_answers_to_create) and \
                   submission.mark_status == CandidateAssessmentSubmission.MarkStatusChoices.MARKED:
                    pending = getattr(CandidateAssessmentSubmission.MarkStatusChoices, "PENDING", None)
                    if pending is not None:
                        submission.mark_status = pending
                        submission.save(update_fields=["mark_status"])
            logger.info(f"MCQ answers to create: {len(mcq_answers_to_create)}, Coding answers to create: {len(coding_answers_to_create)}, Open-ended answers to create: {len(open_ended_answers_to_create)} for submission{submission.id}" )
            # Only dispatch once the ENTIRE assessment (every required
            # section) is done -- not after every individual section submit.
            if done_mcq and done_coding and done_open_ended:
                transaction.on_commit(
                    lambda: mark_skill_assessment_submission.delay(
                        skill_assessment_submission_id=submission.id
                    )
                )

            return Response(status=200, data={"message": "Submitted successfully!"})

    except Exception as e:
        logger.exception("Error during assessment submission: %s", e)
        return Response(status=500, data={"error": "An unexpected error occurred while processing your request."})


def force_complete_submission(submission: CandidateAssessmentSubmission):
    """Force a submission to completion after a proctoring-triggered forced
    end (critical violation / max tab switches) -- called from
    proctoring.views.CompleteProctoringSessionView, never from a normal
    candidate-initiated submit.

    Normal submission already backfills a blank (selected_answer_index=None)
    CandidateAssessmentMCQAnswer for every question in any section the
    candidate actually reached, so a partially-answered *current* section is
    already handled correctly by the time this runs (the frontend submits
    whatever's on screen before signalling the forced end). What's missing
    is any section the candidate never reached at all: mark_mcq already
    scores a completely untouched MCQ section as 0, but mark_coding_task
    treats a missing section submission as a hard error that aborts scoring
    for the *whole* assessment -- so every never-reached section needs at
    least a blank CandidateAssessmentSectionSubmission row created here,
    which is enough for both marking functions to grade it as wrong/empty
    rather than failing outright.
    """
    if submission.is_completed:
        return

    assessment = submission.skill_assessment
    if not assessment:
        return

    touched_section_ids = set(
        submission.skill_assessment_section_submissions.values_list(
            "skill_assessment_section_id", flat=True
        )
    )

    with transaction.atomic():
        for section in assessment.sections.all():
            if section.id in touched_section_ids:
                continue

            section_submission = CandidateAssessmentSectionSubmission.objects.create(
                skill_assessment_section=section
            )
            submission.skill_assessment_section_submissions.add(section_submission)

            if section.type == SkillAssessmentTypes.MCQ:
                # Blank answers so grading (and any recruiter-facing "what did
                # they answer" view) sees every question as explicitly
                # unanswered, not just absent.
                CandidateAssessmentMCQAnswer.objects.bulk_create([
                    CandidateAssessmentMCQAnswer(section_submission=section_submission, question=q)
                    for q in section.mcq_questions.all()
                ])
            # CODING_TASK sections need no CandidateAssessmentCodingAnswer rows --
            # mark_coding_task already treats a missing answer for a task as an
            # empty-string submission once the section submission row exists.
            elif section.type == SkillAssessmentTypes.OPEN_ENDED:
                CandidateAssessmentOpenEndedAnswer.objects.bulk_create([
                    CandidateAssessmentOpenEndedAnswer(section_submission=section_submission, open_ended_question=q)
                    for q in section.open_ended_questions.all()
                ])

        submission.is_completed = True
        submission.save(update_fields=["is_completed"])

    mark_skill_assessment_submission.delay(skill_assessment_submission_id=submission.id)


class TakeAGeneralSkillAssessmentAPIView(APIView):
    """Endpoint for a logged-in talent to take a skill assessment"""
    permission_classes = [IsTalentUser]

    def post(self, request, skill_assessment_id):
        talent = request.user.profile
        skill_assessment = (
            GeneralSkillAssessment.objects
            .select_related("assigned_to", "job_application")
            .filter(id=skill_assessment_id)
            .first()
        )
        if not skill_assessment:
            return Response(status=400, data={"error": "Skill assessment does not exist or has been deleted"})
        return submit_general_skill_assessment_answers(talent, skill_assessment, request.data)


def _get_assessment_by_invite_token(token):
    """Resolve a GeneralSkillAssessment for the no-login candidate invite
    flow. Resolves two distinct cases:
    - job-application-backed: identity is job_application.applicant (a real
      TalentProfile), matched via resolve_invite_talent().
    - standalone (recruiter invited a candidate by email directly, no job):
      invited_email/invited_name are set instead, and there is deliberately
      no TalentProfile at all -- resolve_invite_talent() returns None for
      this case, which every call site below is written to handle.
    Bare company-only *template* assessments (not yet invited to anyone --
    no job_application AND no invited_email) and Tiaago self-verification
    assessments stay unreachable via token, same as before."""
    assessment = (
        GeneralSkillAssessment.objects
        .select_related("job_application", "job_application__applicant", "job_application__applicant__user", "job_application__job", "job_application__job__company")
        .filter(invite_token=token)
        .exclude(job_application__isnull=True, invited_email__isnull=True)
        .first()
    )
    return assessment


def _expired_response():
    return Response(
        status=410,
        data={"error": "This assessment invite has expired.", "expired": True},
    )


class AssessmentInviteDetailView(APIView):
    """GET /assessments/invite/<token>/ -- candidate name/email, job/company,
    and test format (no question content). Powers the Instructions + "enter
    your details" pre-start screens without requiring login."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        assessment = _get_assessment_by_invite_token(token)
        if not assessment:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        talent = resolve_invite_talent(assessment)
        existing_submission = CandidateAssessmentSubmission.objects.filter(
            candidate=talent, skill_assessment=assessment
        ).first()

        data = AssessmentInviteDetailSerializer(
            assessment, context={"existing_submission": existing_submission}
        ).data
        return Response(status=200, data=data)


class AssessmentInviteConfirmView(APIView):
    """POST /assessments/invite/<token>/confirm/ -- candidate confirms/edits
    their display name for this attempt. Creates the CandidateAssessmentSubmission
    row (if one doesn't already exist) so later steps (snapshots, questions)
    have a stable submission to attach to."""

    permission_classes = [AllowAny]

    def post(self, request, token):
        assessment = _get_assessment_by_invite_token(token)
        if not assessment:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        serializer = AssessmentInviteConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        talent = resolve_invite_talent(assessment)
        already_started = CandidateAssessmentSubmission.objects.filter(
            candidate=talent, skill_assessment=assessment
        ).exists()
        if assessment.is_invite_expired and not already_started:
            return _expired_response()
        window_error = assessment.attempt_window_error
        if window_error and not already_started:
            return Response(status=403, data={"error": window_error})

        submission, _created = CandidateAssessmentSubmission.objects.get_or_create(
            candidate=talent, skill_assessment=assessment, defaults={"is_completed": False}
        )
        # Standalone invites: the recruiter set this candidate's name at
        # invite time and it is NOT editable by the candidate -- ignore
        # whatever the client submitted and use invited_name regardless, so
        # a direct API call can't override it either.
        submission.candidate_display_name = (
            assessment.invited_name if talent is None else serializer.validated_data["full_name"]
        )
        update_fields = ["candidate_display_name"]
        if _created:
            submission.started_at = timezone.now()
            update_fields.append("started_at")
        submission.save(update_fields=update_fields)

        return Response(status=200, data={"submission_id": submission.id})


class AssessmentInviteQuestionsView(APIView):
    """GET /assessments/invite/<token>/questions/ -- full assessment with real
    question content (never the answer key) for the token holder."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        assessment = _get_assessment_by_invite_token(token)
        if not assessment:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        talent = resolve_invite_talent(assessment)
        submission = CandidateAssessmentSubmission.objects.filter(
            candidate=talent, skill_assessment=assessment
        ).first()
        if assessment.is_invite_expired and not submission:
            return _expired_response()
        # An attempt already in progress may finish even if the window has
        # since closed -- only block a fresh start outside the window.
        window_error = assessment.attempt_window_error
        if window_error and not (submission and submission.started_at):
            return Response(status=403, data={"error": window_error})

        assessment_id = assessment.id
        assessment = _assessment_detail_base_qs().filter(id=assessment_id).first()
        data = GeneralSkillAssessmentListSerializer(
            assessment,
            context={"include_section_questions": True, "include_correct_answers": False},
        ).data
        # started_at anchors the overall countdown so it survives page
        # refreshes -- the timer is always duration_minutes from this
        # fixed point, never reset on reload.
        data["started_at"] = submission.started_at if submission else None
        return Response(status=200, data=data)


class AssessmentInviteSubmitView(APIView):
    """POST /assessments/invite/<token>/submit/ -- submit answers without a
    login session. Identity is resolved from the token, never request.user."""

    permission_classes = [AllowAny]

    def post(self, request, token):
        assessment = _get_assessment_by_invite_token(token)
        if not assessment:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        talent = resolve_invite_talent(assessment)
        return submit_general_skill_assessment_answers(talent, assessment, request.data)


class AssessmentInviteSnapshotUploadView(APIView):
    """POST /assessments/invite/<token>/snapshot/ -- periodic proctoring
    camera capture during the live attempt. Requires the candidate to already
    have confirmed their details (AssessmentInviteConfirmView), since that's
    what creates the submission row snapshots attach to."""

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request, token):
        assessment = _get_assessment_by_invite_token(token)
        if not assessment:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        talent = resolve_invite_talent(assessment)
        submission = CandidateAssessmentSubmission.objects.filter(
            candidate=talent, skill_assessment=assessment
        ).first()
        if not submission:
            return Response(status=400, data={"error": "Please confirm your details before starting."})

        image = request.FILES.get("image")
        if not image:
            return Response(status=400, data={"error": "No image provided."})

        snapshot = AssessmentSubmissionSnapshot.objects.create(submission=submission, image=image)
        return Response(status=201, data=AssessmentSubmissionSnapshotSerializer(snapshot).data)


class AssessmentInviteFeedbackView(APIView):
    """POST /assessments/invite/<token>/feedback/ -- optional star rating +
    comment shown on the post-submit "thank you" screen."""

    permission_classes = [AllowAny]

    def post(self, request, token):
        assessment = _get_assessment_by_invite_token(token)
        if not assessment:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        talent = resolve_invite_talent(assessment)
        submission = CandidateAssessmentSubmission.objects.filter(
            candidate=talent, skill_assessment=assessment
        ).first()
        if not submission:
            return Response(status=400, data={"error": "No submission found for this assessment."})

        serializer = AssessmentInviteFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "rating" in serializer.validated_data:
            submission.feedback_rating = serializer.validated_data["rating"]
        if "comment" in serializer.validated_data:
            submission.feedback_comment = serializer.validated_data["comment"]
        submission.save(update_fields=["feedback_rating", "feedback_comment"])

        return Response(status=200, data={"message": "Thanks for your feedback!"})


class CandidateSubmissionSnapshotListView(APIView):
    """GET /submissions/<submission_id>/snapshots/ -- lets the owning
    company (or staff) spot-check the periodic camera captures taken during
    a no-login candidate's attempt."""

    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request, submission_id):
        submission = (
            CandidateAssessmentSubmission.objects
            .select_related("skill_assessment", "skill_assessment__job_application", "skill_assessment__job_application__job")
            .filter(id=submission_id)
            .first()
        )
        if not submission:
            return Response(status=404, data={"error": "Submission not found"})

        if not request.user.is_staff:
            job = getattr(submission.skill_assessment.job_application, "job", None) if submission.skill_assessment else None
            company = get_user_company(request.user)
            if not job or not company or job.company_id != company.id:
                return Response(status=403, data={"error": "You do not have access to this submission"})

        snapshots = submission.snapshots.order_by("created_at")
        data = AssessmentSubmissionSnapshotSerializer(snapshots, many=True, context={"request": request}).data
        return Response(status=200, data=data)


class RecruiterSubmissionAnswersView(APIView):
    """GET /submissions/<submission_id>/answers/ -- full question/option text
    plus the candidate's chosen answer per question, for the recruiter's
    application detail view. Distinct from SkillAssessmentResultAPIView,
    which is talent-scoped and only returns aggregate stats, not question
    content."""

    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request, submission_id):
        submission = (
            CandidateAssessmentSubmission.objects
            .select_related(
                "skill_assessment", "skill_assessment__job_application",
                "skill_assessment__job_application__job", "skill_assessment__company",
            )
            .filter(id=submission_id)
            .first()
        )
        if not submission:
            return Response(status=404, data={"error": "Submission not found"})

        if not request.user.is_staff:
            job = getattr(submission.skill_assessment.job_application, "job", None) if submission.skill_assessment else None
            # A standalone assessment has no job_application, so ownership is
            # checked against skill_assessment.company directly instead.
            company = job.company if job else getattr(submission.skill_assessment, "company", None)
            # This returns the answer key alongside each answer, so it's held
            # to the same Admin/Recruiter-only bar as AIOperationsFeedback
            # (the summary view that surfaces this submission_id in the
            # first place) -- not just "any team member of the company",
            # which would let a lower-trust Viewer role pull it directly.
            if not company or not user_is_company_role(
                request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]
            ):
                return Response(status=403, data={"error": "You do not have access to this submission"})

        data = RecruiterSubmissionAnswersSerializer(submission).data
        return Response(status=200, data=data)


class GradeOpenEndedAPIView(APIView):
    """POST /submissions/<submission_id>/grade-open-ended/ -- recruiter
    scores one or more open-ended answers on a submission (each pre-filled
    with an AI suggestion, editable/overridable here -- see
    suggest_open_ended_grades in tasks.py). Once every open-ended answer on
    the submission has a score, automatically finalizes it: recomputes
    total_score from the MCQ/coding averages already stashed in
    pending_score_breakdown at auto-mark time plus the open-ended average,
    never re-running (or re-billing) MCQ/coding grading."""

    permission_classes = [IsCompanyRepOrStaffUser]

    def post(self, request, submission_id):
        submission = (
            CandidateAssessmentSubmission.objects
            .select_related("skill_assessment", "skill_assessment__company")
            .filter(id=submission_id)
            .first()
        )
        if not submission:
            return Response(status=404, data={"error": "Submission not found"})

        if not request.user.is_staff:
            company = getattr(request.user, "company", None)
            owning_company = getattr(submission.skill_assessment, "company", None)
            if not company or not owning_company or owning_company.id != company.id or not user_is_company_role(
                request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]
            ):
                return Response(status=403, data={"error": "You do not have access to this submission"})

        serializer = GradeOpenEndedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        graded_inputs = serializer.validated_data["answers"]

        answer_ids = [a["answer_id"] for a in graded_inputs]
        answers = {
            a.id: a for a in CandidateAssessmentOpenEndedAnswer.objects.filter(
                id__in=answer_ids,
                section_submission__in=submission.skill_assessment_section_submissions.all(),
            ).select_related("open_ended_question")
        }
        missing = set(answer_ids) - set(answers.keys())
        if missing:
            return Response(status=400, data={"error": f"Answers not found on this submission: {sorted(missing)}"})

        for item in graded_inputs:
            answer = answers[item["answer_id"]]
            max_score = answer.open_ended_question.max_score
            if max_score and item["score"] > max_score:
                return Response(status=400, data={
                    "error": f"Score {item['score']} exceeds max_score {max_score} for answer {answer.id}"
                })

        with transaction.atomic():
            for item in graded_inputs:
                answer = answers[item["answer_id"]]
                answer.score = item["score"]
                answer.feedback = item.get("feedback", "")
                answer.graded_by = request.user
                answer.graded_at = timezone.now()
                answer.save(update_fields=["score", "feedback", "graded_by", "graded_at"])

        all_open_ended = CandidateAssessmentOpenEndedAnswer.objects.filter(
            section_submission__in=submission.skill_assessment_section_submissions.all()
        )
        if all_open_ended.filter(score__isnull=True).exists():
            return Response(status=200, data={"message": "Saved. Awaiting more grading.", "finalized": False})

        # Every open-ended answer on this submission now has a score --
        # finalize it.
        scored_percents = [
            (a.score / a.open_ended_question.max_score) * 100.0
            for a in all_open_ended.select_related("open_ended_question")
            if a.open_ended_question.max_score
        ]
        open_ended_avg = sum(scored_percents) / len(scored_percents) if scored_percents else 0.0

        breakdown = submission.pending_score_breakdown or {}
        components = [open_ended_avg]
        if breakdown.get("has_mcq"):
            components.append(breakdown.get("mcq_avg", 0.0))
        if breakdown.get("has_coding"):
            components.append(breakdown.get("code_avg", 0.0))
        total_score = _to_score(round(sum(components) / len(components), 2))

        assessment = submission.skill_assessment
        pass_mark = float(getattr(assessment, "passing_grade", None) or DEFAULT_PASSING_GRADE)
        is_passed = total_score >= pass_mark

        # Finalizing sends completion emails through EmailHandler's
        # synchronous provider-fallback/retry logic, which can take tens of
        # seconds -- run it out-of-band so this request (the recruiter is
        # waiting on "Save grade") returns as soon as the score itself is set.
        transaction.on_commit(
            lambda: finalize_graded_submission.delay(
                submission_id=submission.id, total_score=total_score, is_passed=is_passed, pass_mark=pass_mark,
            )
        )
        return Response(status=200, data={
            "message": "Submission finalized.", "finalized": True,
            "score": total_score, "passed": is_passed,
        })


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
            if _created:
                submission.started_at = timezone.now()
                submission.save(update_fields=["started_at"])

            # Server-side enforcement of the timed countdown -- see identical
            # check in submit_general_skill_assessment_answers.
            if (
                submission.started_at
                and getattr(skill_assessment, "duration_minutes", None)
                and not submission.is_completed
            ):
                deadline = submission.started_at + timedelta(
                    minutes=skill_assessment.duration_minutes
                ) + timedelta(seconds=90)
                if timezone.now() > deadline:
                    return Response(
                        status=400,
                        data={"error": "Time is up for this assessment -- no further answers can be submitted."},
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

                # (e) compute completion -- judged against EVERY section of
                # this assessment, not just the section(s) in this request
                # (existing_secs is scoped to the current request's
                # section_ids, which would otherwise mark a multi-section
                # assessment "done" as soon as any single MCQ/coding section
                # was answered, even with other required sections untouched).
                all_mcq_section_ids = set(
                    GeneralSkillAssessmentSection.objects.filter(
                        company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.MCQ
                    ).values_list("id", flat=True)
                )
                all_coding_section_ids = set(
                    GeneralSkillAssessmentSection.objects.filter(
                        company_skill_assessment=skill_assessment, type=SkillAssessmentTypes.CODING_TASK
                    ).values_list("id", flat=True)
                )

                answered_mcq_section_ids = set(
                    CandidateAssessmentMCQAnswer.objects.filter(
                        section_submission__in=submission.skill_assessment_section_submissions.all()
                    ).values_list("section_submission__skill_assessment_section_id", flat=True)
                )
                answered_coding_section_ids = set(
                    CandidateAssessmentCodingAnswer.objects.filter(
                        section_submission__in=submission.skill_assessment_section_submissions.all()
                    ).values_list("section_submission__skill_assessment_section_id", flat=True)
                )

                done_mcq = all_mcq_section_ids.issubset(answered_mcq_section_ids)
                done_coding = all_coding_section_ids.issubset(answered_coding_section_ids)
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

            #enqueue the SINGLE, existing task -- only once the ENTIRE
            # assessment (every required section) is done, not per section.
            if new_completed:
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

        data = SubmissionSerializer(
            submission, context={"request": request, "prefetched": True, "gate_for_candidate": True}
        ).data
        return Response(data)


class ApproveSubmissionAPIView(APIView):
    """POST /skill-assessments/submissions/<id>/approve/ -- recruiter marks a
    submission as reviewed. Only actually changes anything the candidate
    sees when the assessment has display_review_and_approve_responses
    enabled (SubmissionSerializer.to_representation gates on approved_at in
    that case); harmless no-op release otherwise."""

    permission_classes = [IsCompanyRepOrStaffUser]

    def post(self, request, submission_id):
        submission = CandidateAssessmentSubmission.objects.select_related("skill_assessment").filter(
            id=submission_id
        ).first()
        if not submission:
            return Response(status=404, data={"error": "Submission not found."})

        assessment = submission.skill_assessment
        if not request.user.is_staff:
            company = get_user_company(request.user)
            if not assessment or not company or assessment.company_id != company.id:
                return Response(status=403, data={"error": "You do not have permission to review this submission."})

        submission.approved_at = timezone.now()
        submission.approved_by = request.user
        submission.save(update_fields=["approved_at", "approved_by"])
        return Response(status=200, data=SubmissionSerializer(submission).data)


class GetSubmissionsForASkillAssessment(APIView, PaginationHandlerMixin):
    """Endpoint to retrieve the submissions for a Skill Assessment.

    `skill_assessment_id` is the *published template* id for the new
    standalone-invite flow (each invited candidate has their own cloned row
    -- see GeneralSkillAssessment.source_template) as well as the older
    shared/public-link flow (candidates submit directly against the same
    row). Both are matched below."""

    permission_classes = [IsTalentOrStaffUser | IsCompanyRepOrStaffUser]

    def get(self, request, skill_assessment_id):
        submission_filter = Q(skill_assessment_id=skill_assessment_id) | Q(
            skill_assessment__source_template_id=skill_assessment_id
        )
        if request.user.is_talent():
            queryset = CandidateAssessmentSubmission.objects.filter(
                submission_filter, candidate=request.user.profile
            ).order_by("-created_at")
        elif request.user.is_staff:
            queryset = CandidateAssessmentSubmission.objects.filter(submission_filter).order_by("-created_at")
        elif request.user.is_company():
            company = get_user_company(request.user)
            if not company:
                return Response(status=403, data={"error": "No company associated."})
            queryset = CandidateAssessmentSubmission.objects.filter(
                submission_filter, skill_assessment__company=company
            ).order_by("-created_at")
        else:
            return Response(status=403, data={"error": "You do not have access to these submissions."})
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
            mcq_section.mcq_questions_new.set([e.mcq_question for e in mcq_entries])

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

    def get(self, request, public_id, *args, **kwargs):
        # Company reps must be Admin or Recruiter for the job's company
        job = Job.objects.filter(public_id=public_id).first()
        if request.user.is_company() and job:
            if not user_is_company_role(request.user, job.company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response(status=status.HTTP_403_FORBIDDEN, data={"error": "You are not authorized to access AI feedback for this job."})

        job_applications = JobApplication.objects.select_related("job", "job__company", "job__company__company_rep", "applicant").filter(
            job__id=job.id if job else None
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

        from ai_interviews.models import AIInterview
        ai_interview_map = {
            i.job_application_id: i for i in AIInterview.objects.filter(
                job_application__in=job_applications, is_preview=False, summary_status=AIInterview.SummaryStatus.READY,
            ).order_by("created_at")
        }

        from payments.models import ReportPAYGFlowStatus
        flow_status_map = {
            f.job_application_id: f.status
            for f in ReportPAYGFlowStatus.objects.filter(job_application__in=job_applications)
        }

        assessment_ids = [a.id for a in assessment_map.values() if a]
        submissions = CandidateAssessmentSubmission.objects.filter(
            skill_assessment_id__in=assessment_ids, is_completed=True
        ).select_related("skill_assessment", "candidate")

        submission_map = {
            s.skill_assessment_id: s for s in submissions
        }

        from proctoring.models import ProctoringSession
        proctoring_map = {
            p.assessment_attempt_id: p
            for p in ProctoringSession.objects.filter(assessment_attempt__in=submissions)
            .prefetch_related("events")
        }

        # Prefetched (not per-row queried) so the question count for each
        # assessment's "Assessment Details" card doesn't add N+1 queries.
        # topics_tested_map is built in the same pass -- section names (e.g.
        # "React Fundamentals") plus the assessment's tech stack are the
        # existing, already-categorized signal for "what was this candidate
        # actually tested on", no new AI call needed.
        question_count_map = {}
        topics_tested_map = {}
        for a in GeneralSkillAssessment.objects.filter(id__in=assessment_ids).select_related(
            "assessment_stack"
        ).prefetch_related(
            "sections__mcq_questions_new", "sections__coding_tasks", "sections__open_ended_questions"
        ):
            question_count_map[a.id] = sum(
                len(s.mcq_questions_new.all()) + len(s.coding_tasks.all()) + len(s.open_ended_questions.all())
                for s in a.sections.all()
            )
            topics = [s.name for s in a.sections.all() if s.name]
            if a.assessment_stack_id and a.assessment_stack.stack:
                topics = [a.assessment_stack.stack] + topics
            # Dedup while preserving order.
            topics_tested_map[a.id] = list(dict.fromkeys(topics))

        # Bulk-fetched (not per-row queried) current-company lookup, keyed by
        # talent id -- prefers an ongoing role (end_date is null), else falls
        # back to the most recently started one. Feeds "Add to Pipeline" (see
        # AddToPipelineSerializer), which otherwise has no source for this
        # field on a job applicant (unlike sourcing-search candidates, who
        # already carry it from the enrichment provider).
        applicant_ids = [job_apps.applicant_id for job_apps in job_applications]
        experiences = Experience.objects.filter(
            portfolio__talent_id__in=applicant_ids
        ).select_related("portfolio").order_by("-start_date")
        latest_company_map = {}
        ongoing_company_map = {}
        for exp in experiences:
            talent_id = exp.portfolio.talent_id
            latest_company_map.setdefault(talent_id, exp.company_name)
            if exp.end_date is None:
                ongoing_company_map.setdefault(talent_id, exp.company_name)
        current_company_map = {**latest_company_map, **ongoing_company_map}

        feedback = []
        for job_apps in job_applications:
            resume = resume_map.get(job_apps.id)
            prescreening = prescreening_map.get(job_apps.id)
            assessment = assessment_map.get(job_apps.id)
            submission = submission_map.get(assessment.id) if assessment else None
            cover_letter = job_apps.cover_letter
            time_taken=submission.time_taken if submission and submission.time_taken is not None else 0
            difficulty_level=assessment.difficulty_level if assessment and assessment.difficulty_level else ''
            total_questions = question_count_map.get(assessment.id) if assessment else None
            duration_minutes = assessment.duration_minutes if assessment else None
            passing_grade = assessment.passing_grade if assessment else None
            is_passed = submission.is_passed if submission else None
            completed_at = submission.completed_at if submission else None
           
            resume_score = resume.total_score if resume and resume.total_score is not None else 0
            cultural_score = prescreening.total_points if prescreening and prescreening.total_points is not None else 0
            assessment_score = submission.total_score if submission and submission.total_score is not None else 0
            ai_interview = ai_interview_map.get(job_apps.id)
            ai_interview_score = float(ai_interview.overall_score) if ai_interview and ai_interview.overall_score is not None else None
            # scores = [resume_score, cultural_score, assessment_score]
            scores = [resume_score, assessment_score]#used just these two for now, prescreening is not ready yet
            # Only counted when the candidate has actually reached (and been
            # scored on) the AI-interview stage -- otherwise a candidate who
            # simply hasn't gotten there yet would get a phantom 0 dragging
            # their average down.
            if ai_interview_score is not None:
                scores.append(ai_interview_score)
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
            proctoring_session = proctoring_map.get(submission.id) if submission else None
            has_account = bool(job_apps.applicant_id)
            resume_url = None
            if job_apps.candidate_resume:
                resume_url = request.build_absolute_uri(job_apps.candidate_resume.url)
            feedback.append({
                "application_id": job_apps.id,
                "talent_name": job_apps.candidate_full_name,
                "talent_id": job_apps.applicant.user.id if has_account else None,
                "email": job_apps.candidate_email,
                "phone_number": job_apps.candidate_phone_number or None,
                "linkedin_url": job_apps.candidate_linkedin_url or None,
                "profile_picture": (
                    request.build_absolute_uri(job_apps.applicant.user.profile_pic.url)
                    if has_account and job_apps.applicant.user.profile_pic else None
                ),
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
                "ai_interview_score": ai_interview_score,
                "ai_interview_id": str(ai_interview.id) if ai_interview else None,
                "resume_screening_status": flow_status_map.get(job_apps.id),
                "has_passed_tiaago_assessment": job_apps.applicant.has_passed_tiaago_assessment if has_account else False,
                "assessment_title": assessment.title if assessment else None,
                "portfolio_slug": job_apps.applicant.portfolio_slug_safe if has_account else None,
                "cover_letter":cover_letter,
                "resume": resume_url,
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
                "topics_tested": topics_tested_map.get(assessment.id, []) if assessment else [],
                "difficulty_level": difficulty_level,
                "total_questions": total_questions,
                "duration_minutes": duration_minutes,
                "passing_grade": passing_grade,
                "is_passed": is_passed,
                "completed_at": completed_at,
                "submission_id": submission.id if submission else None,
                "proctoring_integrity_score": proctoring_session.integrity_score if proctoring_session else None,
                "proctoring_risk_level": proctoring_session.risk_level if proctoring_session else None,
                "proctoring_has_violation": bool(
                    proctoring_session and any(e.severity == "VIOLATION" for e in proctoring_session.events.all())
                ),
                "country": (job_apps.applicant.country or "") if has_account else "",
                "current_company": current_company_map.get(job_apps.applicant_id, "") if has_account else "",
                "status": job_apps.status,
                "status_label": job_apps.get_status_display(),
            })

        #return leaderbord in descending order
        feedback.sort(key=lambda x: x["overall_score"], reverse=True)

        # Counted over the full (unpaginated) result set so the "N in each
        # stage" summary on the applicants page stays accurate across pages.
        stage_counts = {choice.value: 0 for choice in JobApplication.JobApplicationStatus}
        for item in feedback:
            stage_counts[item["status"]] = stage_counts.get(item["status"], 0) + 1

        paginated_queryset = self.paginate_queryset(feedback)
        data = AIFeedbackSerializer(paginated_queryset, many=True).data
        paginated_data = self.get_paginated_response(data)
        paginated_data["stage_counts"] = stage_counts
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
            job_application = assessment.job_application
            candidate = job_application.applicant

            logger.info(
                f"Starting interview session for assessment_id={assessment_id}, "
                f"candidate_id={candidate.id if candidate else 'guest'}, job_application_id={job_application.id}"
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
                return Response(self.get_paginated_response(empty))
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
