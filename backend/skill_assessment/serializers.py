from pathlib import Path
from loguru import logger
from django.utils.text import slugify
import openpyxl
import csv
import random
import uuid
from rest_framework import serializers
from create_user.api.serializers import CompanyDetailSerializer
from create_user.models import TalentProfile
from roles.serializers import RoleSerializer
from .utils import (
    resolve_invite_talent,
    STANDALONE_PROCTORING_DEFAULTS,
    get_submission_candidate_name,
    get_submission_candidate_email,
)
from .models import (
    CandidateAssessmentCodingAnswer,
    CandidateAssessmentSectionSubmission,
    Certificate,
    GeneralSkillAssessmentSectionMCQ,
    MCQToCodingLink,
    SkillAssessment,
    GeneralSkillAssessment,
    GeneralSkillAssessmentSection,
    GeneralSkillAssessmentSection,
    QuestionBankQuestion,
    CodingTask,
    GeneralSkillAssessmentMCQQuestion,
    TestCase,
    CandidateAssessmentSubmission,
    PreScreeningInterviewSession,
    PreScreeningInterviewQuestionResponse,
    CandidateAssessmentMCQAnswer,
    TechStack,
    TalentQuestionBank,
    AssessmentCooldown,
    AssessmentSubmissionSnapshot,
    OpenEndedQuestion,
    AssessmentBundle,
    CandidateAssessmentOpenEndedAnswer,
)
from .tasks import create_talent_coding_assessment_task_v2
from roles.models import Role
from jobs.models import Job
from skill_assessment.constants import SkillAssessmentTypes
from .constants import QuestionBankDifficultyLevels, SkillAssessmentDifficultyLevels
import os
from utils.ai_service import AIService
from django.db import transaction
from django.db.models import Prefetch
class SkillAssessmentSerializer(serializers.ModelSerializer):
    quiz_id = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    quiz_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    talent_name = serializers.SerializerMethodField()
    has_passed = serializers.ReadOnlyField()
    has_expired = serializers.ReadOnlyField()

    class Meta:
        model = SkillAssessment
        fields = (
            "id",
            "quiz_id",
            "project_id",
            "quiz_name",
            "project_name",
            "has_passed",
            "has_expired",
            "talent_name",
            "created",
            "updated",
            "expired",
        )

    def get_quiz_id(self, obj):
        if obj.quiz_taken:
            return obj.quiz_taken.id

        return None

    def get_project_id(self, obj):
        if obj.project_taken:
            return obj.project_taken.id

        return None

    def get_quiz_name(self, obj):
        if obj.quiz_taken:
            return obj.quiz_taken.quiz.name

        return None

    def get_project_name(self, obj):
        if obj.project_taken:
            return obj.project_taken.project.title

        return None

    def get_talent_name(self, obj):
        if obj.talent:
            return obj.talent.user.get_full_name()


class GeneralSkillAssessmentOptionSerializer(serializers.Serializer):
    value = serializers.CharField()
    index = serializers.IntegerField()


class GeneralSkillAssessmentMCQSerializer(serializers.Serializer):
    """Use 1 based indexing for options"""

    question = serializers.CharField()
    options = serializers.ListField(child=GeneralSkillAssessmentOptionSerializer())
    correct_option_index = serializers.IntegerField()
    is_ai_generated = serializers.BooleanField(required=False)

    def validate(self, attrs):
        correct_option_index = attrs.get("correct_option_index")
        options = attrs.get("options")
        matching_option = filter(
            lambda x: x.get("index") == correct_option_index, options
        )
        if not list(matching_option):
            raise serializers.ValidationError(
                "Correct option index is not found in the options"
            )
        option_indexes = map(lambda x: x.get("index"), options)
        if 0 in option_indexes:
            raise serializers.ValidationError("0 is not a valid index")
        option_indexes_list = list(option_indexes)
        option_indexes_set = set(option_indexes_list)
        if len(option_indexes_list) != len(list(option_indexes_set)):
            raise serializers.ValidationError(
                "Please ensure you do not duplicate option indexes"
            )
        invalid_index = filter(
            lambda x: x > len(option_indexes_list) or x < 0, option_indexes_list
        )
        if list(invalid_index):
            raise serializers.ValidationError("Please use valid indexes")
        return attrs


class GeneralSkillAssessmentMCQListSerializer(serializers.ModelSerializer):

    class Meta:
        model = GeneralSkillAssessmentMCQQuestion
        fields = [
            "id",
            "is_ai_generated",
            "question",
            "options",
            "correct_option_index",
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Candidates must never see the answer key; only the owning
        # company/staff (view sets this flag) get correct_option_index.
        if not self.context.get("include_correct_answers"):
            representation.pop("correct_option_index", None)
        # Shuffle display order on every load so the correct answer isn't
        # always in the same position -- grading is keyed off each option's
        # own "index" value (compared against correct_option_index), not its
        # position in this list, so reordering here is safe.
        options = representation.get("options")
        if isinstance(options, list):
            options = list(options)
            random.shuffle(options)
            representation["options"] = options
        return representation


class TestCaseSerializer(serializers.ModelSerializer):

    class Meta:
        model = TestCase
        fields = ("id", "input_data", "expected_output", "is_sample")

class TechStackSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechStack
        fields = ("id", "difficulty", "slug", "icon", "tech_stack")

class GeneralSkillAssessmentCodingTaskSerializer(serializers.ModelSerializer):
    test_cases = TestCaseSerializer(many=True, required=False)

    class Meta:
        model = CodingTask
        fields = [
            "id",
            "title",
            "description",
            "input_format",
            "output_format",
            "constraints",
            "sample_input",
            "sample_output",
            "difficulty_level",
            "max_score",
            "time_limit",
            "test_cases",
        ]


class OpenEndedQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpenEndedQuestion
        fields = ["id", "is_ai_generated", "question", "grading_guidance", "max_score", "skills_assessed"]


class GeneralSkillAssessmentSectionCreateSerializer(serializers.ModelSerializer):
    mcq_questions = GeneralSkillAssessmentMCQSerializer(many=True, required=False)
    coding_tasks = GeneralSkillAssessmentCodingTaskSerializer(many=True, required=False)
    open_ended_questions = OpenEndedQuestionSerializer(many=True, required=False)

    class Meta:
        model = GeneralSkillAssessmentSection
        fields = ["name", "type", "mcq_questions", "id", "coding_tasks", "open_ended_questions"]

    def validate(self, attrs):
        type = attrs.get("type")
        mcq_questions = attrs.get("mcq_questions", [])
        coding_tasks = attrs.get("coding_tasks", [])
        open_ended_questions = attrs.get("open_ended_questions", [])
        if type == SkillAssessmentTypes.MCQ and not len(mcq_questions):
            raise serializers.ValidationError(
                "Please include at least one question for MCQ"
            )
        if type == SkillAssessmentTypes.CODING_TASK and not len(coding_tasks):
            raise serializers.ValidationError("Please input a coding task")
        if type == SkillAssessmentTypes.OPEN_ENDED and not len(open_ended_questions):
            raise serializers.ValidationError(
                "Please include at least one question for the open-ended section"
            )
        return attrs


class GeneralSkillAssessmentSectionPreviewSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = GeneralSkillAssessmentSection
        fields = ["name", "type", "id", "question_count"]

    def get_question_count(self, section):
        if section.type == SkillAssessmentTypes.MCQ:
            return section.mcq_questions.all().count()
        if section.type == SkillAssessmentTypes.CODING_TASK:
            return section.coding_tasks.all().count()
        if section.type == SkillAssessmentTypes.OPEN_ENDED:
            return section.open_ended_questions.all().count()


class GeneralSkillAssessmentSectionListSerializer(
    GeneralSkillAssessmentSectionCreateSerializer
):
    mcq_questions = GeneralSkillAssessmentMCQListSerializer(many=True)
    coding_tasks = GeneralSkillAssessmentCodingTaskSerializer(many=True)


class GeneralSkillAssessmentCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = GeneralSkillAssessment
        fields = [
            "title",
            "difficulty_level",
            "skillsets",
            "description",
            "duration_minutes",
            "passing_grade",
            "display_review_and_approve_responses",
            "display_feedback",
            "shuffle_questions",
            "use_public_link",
            "use_start_and_end_time",
            "show_results_to_candidate",
            "assessment_type",
        ]



class GeneralSkillAssessmentSectionSerializer(serializers.ModelSerializer):
    sections = GeneralSkillAssessmentSectionCreateSerializer(
        many=True, allow_empty=False
    )

    class Meta:
        model = GeneralSkillAssessment
        fields = ["sections"]

    def validate(self, attrs):
        assessment_type = getattr(self.instance, "assessment_type", None)
        sections = attrs.get("sections")

        # Hybrid assessments freely combine any mix of MCQ/coding/open-ended
        # sections -- no shape restriction, unlike CUSTOM below.
        if assessment_type == SkillAssessmentTypes.MIXED:
            return attrs

        # Single-type assessments (MCQ, CODING_TASK, or OPEN_ENDED)
        if assessment_type in [
            SkillAssessmentTypes.CODING_TASK,
            SkillAssessmentTypes.MCQ,
            SkillAssessmentTypes.OPEN_ENDED,
        ]:
            if len(sections) > 1:
                raise serializers.ValidationError(
                    "Multiple sections are only available for custom skill assessments"
                )
            section_type = sections[0].get("type")
            if section_type != assessment_type:
                message = f"Section is of type {section_type} but assessment is of type {assessment_type}"
                raise serializers.ValidationError(f"Invalid assessment section. {message}")
            return attrs

        # Custom assessments
        if assessment_type == SkillAssessmentTypes.CUSTOM:
            if len(sections) != 2:
                raise serializers.ValidationError(
                    "Custom skill assessments require both coding tasks and MCQ questions to be included"
                )
            section_types = {section.get("type") for section in sections}
            required_types = {SkillAssessmentTypes.MCQ, SkillAssessmentTypes.CODING_TASK}
            if section_types != required_types:
                raise serializers.ValidationError(
                    "Custom assessments must have exactly one MCQ section and one Coding Task section"
                )
            return attrs

        return attrs


class GeneralSkillAssessmentListSerializer(GeneralSkillAssessmentCreateSerializer):

    class ShortenedRoleSerializer(RoleSerializer):
        class Meta(RoleSerializer.Meta):
            fields = ["id", "title"]

    skillsets = ShortenedRoleSerializer(many=True)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        include_section_questions = self.context.get("include_section_questions")
        if not include_section_questions:
            sections = GeneralSkillAssessmentSectionPreviewSerializer(
                instance.sections.all(), many=True
            ).data
            representation["sections"] = sections
        else:
            sections = GeneralSkillAssessmentSectionListSerializer(
                instance.sections.all(), many=True, context=self.context
            ).data
            representation["sections"] = sections
        return representation

    class Meta:
        model = GeneralSkillAssessment
        fields = GeneralSkillAssessmentCreateSerializer.Meta.fields + ["id", "published"]


class AssessmentBundleSerializer(serializers.ModelSerializer):
    """Recruiter-facing bundle listing for the wizard's Step 2 "Test Library"
    and the /question-bank browse page. Read-only -- bundles are authored
    through the staff admin CRUD, not by recruiters."""

    role = RoleSerializer()
    question_count = serializers.ReadOnlyField()

    class Meta:
        model = AssessmentBundle
        fields = [
            "id", "name", "description", "role", "difficulty_level",
            "estimated_duration_minutes", "is_recommended", "question_count",
        ]


class GradeOpenEndedAnswerInputSerializer(serializers.Serializer):
    answer_id = serializers.IntegerField()
    score = serializers.FloatField(min_value=0)
    feedback = serializers.CharField(required=False, allow_blank=True)


class GradeOpenEndedSerializer(serializers.Serializer):
    answers = GradeOpenEndedAnswerInputSerializer(many=True, allow_empty=False)


class InviteCandidateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=255)


class BulkInviteCandidatesSerializer(serializers.Serializer):
    invites = InviteCandidateSerializer(many=True, allow_empty=False)


class AddBundleSectionSerializer(serializers.Serializer):
    bundle_id = serializers.IntegerField()

    def validate_bundle_id(self, bundle_id):
        bundle = AssessmentBundle.objects.filter(id=bundle_id, active=True).first()
        if not bundle:
            raise serializers.ValidationError("Bundle does not exist")
        return bundle


class TalentQuestionBankManageSerializer(serializers.ModelSerializer):
    """Staff-only CRUD for question-bank entries -- backs the
    /admin/assessment/question-bank pages. Exactly one of mcq_question/
    coding_task/open_ended_question is owned 1:1 by the bank entry (see
    TalentQuestionBank.clean), so creating/updating a bank entry
    creates/updates that nested question object directly rather than
    linking to an existing standalone one."""

    mcq_question = GeneralSkillAssessmentMCQSerializer(required=False, allow_null=True)
    coding_task = GeneralSkillAssessmentCodingTaskSerializer(required=False, allow_null=True)
    open_ended_question = OpenEndedQuestionSerializer(required=False, allow_null=True)
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source="role", write_only=True, required=False, allow_null=True
    )
    stack = TechStackSerializer(read_only=True)
    stack_id = serializers.PrimaryKeyRelatedField(
        queryset=TechStack.objects.all(), source="stack", write_only=True, required=False, allow_null=True
    )
    question_type = serializers.SerializerMethodField()

    class Meta:
        model = TalentQuestionBank
        fields = [
            "id", "role", "role_id", "stack", "stack_id", "difficulty_level", "question_type",
            "mcq_question", "coding_task", "open_ended_question", "created_at",
        ]

    def get_question_type(self, obj):
        if obj.mcq_question_id:
            return SkillAssessmentTypes.MCQ
        if obj.coding_task_id:
            return SkillAssessmentTypes.CODING_TASK
        if obj.open_ended_question_id:
            return SkillAssessmentTypes.OPEN_ENDED
        return None

    def validate(self, attrs):
        provided = sum(bool(attrs.get(k)) for k in ("mcq_question", "coding_task", "open_ended_question"))
        if self.instance is None and provided != 1:
            raise serializers.ValidationError(
                "Provide exactly one of mcq_question, coding_task, or open_ended_question."
            )
        if self.instance is not None and provided > 1:
            raise serializers.ValidationError(
                "Provide at most one of mcq_question, coding_task, or open_ended_question."
            )
        return attrs

    def create(self, validated_data):
        mcq_data = validated_data.pop("mcq_question", None)
        coding_data = validated_data.pop("coding_task", None)
        oeq_data = validated_data.pop("open_ended_question", None)

        if mcq_data:
            validated_data["mcq_question"] = GeneralSkillAssessmentMCQQuestion.objects.create(**mcq_data)
        if coding_data:
            test_cases = coding_data.pop("test_cases", []) or []
            task = CodingTask.objects.create(**coding_data)
            for tc in test_cases:
                TestCase.objects.create(coding_task=task, **tc)
            validated_data["coding_task"] = task
        if oeq_data:
            validated_data["open_ended_question"] = OpenEndedQuestion.objects.create(**oeq_data)

        return TalentQuestionBank.objects.create(**validated_data)

    def update(self, instance, validated_data):
        mcq_data = validated_data.pop("mcq_question", None)
        coding_data = validated_data.pop("coding_task", None)
        oeq_data = validated_data.pop("open_ended_question", None)

        if mcq_data and instance.mcq_question_id:
            for k, v in mcq_data.items():
                setattr(instance.mcq_question, k, v)
            instance.mcq_question.save()
        if coding_data and instance.coding_task_id:
            test_cases = coding_data.pop("test_cases", None)
            for k, v in coding_data.items():
                setattr(instance.coding_task, k, v)
            instance.coding_task.save()
            if test_cases is not None:
                instance.coding_task.test_cases.all().delete()
                for tc in test_cases:
                    TestCase.objects.create(coding_task=instance.coding_task, **tc)
        if oeq_data and instance.open_ended_question_id:
            for k, v in oeq_data.items():
                setattr(instance.open_ended_question, k, v)
            instance.open_ended_question.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class AssessmentBundleManageSerializer(serializers.ModelSerializer):
    """Staff-only CRUD for bundles -- backs the /admin/assessment/bundles
    pages. Picks its questions from already-authored TalentQuestionBank rows
    (create those first via the question-bank admin pages)."""

    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), source="role", write_only=True)
    bank_questions = TalentQuestionBankManageSerializer(many=True, read_only=True)
    bank_question_ids = serializers.PrimaryKeyRelatedField(
        queryset=TalentQuestionBank.objects.all(), source="bank_questions",
        many=True, write_only=True, required=False,
    )
    question_count = serializers.ReadOnlyField()

    class Meta:
        model = AssessmentBundle
        fields = [
            "id", "name", "description", "role", "role_id", "difficulty_level",
            "estimated_duration_minutes", "is_recommended", "active",
            "bank_questions", "bank_question_ids", "question_count",
        ]

    def create(self, validated_data):
        bank_questions = validated_data.pop("bank_questions", [])
        bundle = AssessmentBundle.objects.create(**validated_data)
        if bank_questions:
            bundle.bank_questions.set(bank_questions)
        return bundle

    def update(self, instance, validated_data):
        bank_questions = validated_data.pop("bank_questions", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if bank_questions is not None:
            instance.bank_questions.set(bank_questions)
        return instance


class QuestionBankQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionBankQuestion
        fields = ["id", "question", "options", "correct_option_index"]


class QuestionBankSerializer(serializers.Serializer):
    role = serializers.IntegerField()
    job_description = serializers.CharField()
    mcq_questions = serializers.IntegerField(max_value=10)
    difficulty_level = serializers.CharField()
    exclusions = serializers.ListField(child=serializers.IntegerField(), required=False)

    def validate_role(self, role):
        role_obj = Role.objects.filter(id=role).first()
        if not role_obj:
            raise serializers.ValidationError("Role does not exist")
        return role_obj
    
    def validate_job(self, job):
        job_obj = Job.objects.filter(id=job).first()
        if not job_obj:
            raise serializers.ValidationError("Job does not exist")
        return job_obj

    def validate_difficulty_level(self, difficulty_level):
        valid_difficulty_levels = [
            QuestionBankDifficultyLevels.BEGINNER,
            QuestionBankDifficultyLevels.INTERMEDIATE,
            QuestionBankDifficultyLevels.ADVANCED,
        ]
        if difficulty_level not in valid_difficulty_levels:
            raise serializers.ValidationError(
                f'Valid difficulty levels are {",".join(valid_difficulty_levels)}'
            )
        return difficulty_level


class MCQAnswerSerializer(serializers.Serializer):
    mcq_id = serializers.IntegerField()
    selected_option_index = serializers.IntegerField()  # 1-based

    def validate(self, attrs):
        mcq_id = attrs.get("mcq_id")
        selected_option_index = attrs.get("selected_option_index")

        mcq_obj = GeneralSkillAssessmentMCQQuestion.objects.filter(id=mcq_id).first()
        if not mcq_obj:
            raise serializers.ValidationError(f"Matching MCQ for {mcq_id} does not exist")

        # MCQ.options are [{"value": "...", "index": 1..4}, ...]
        options = mcq_obj.options or []
        indexes = {opt.get("index") for opt in options if isinstance(opt, dict)}
        if selected_option_index not in indexes:
            raise serializers.ValidationError(f"Invalid option selected for MCQ {mcq_id}")

        return attrs


class CodingAnswerSerializer(serializers.Serializer):
    coding_task_id = serializers.IntegerField()
    user_answer = serializers.CharField()

    def validate(self, attrs):
        coding_task_id = attrs.get("coding_task_id")
        coding_task = CodingTask.objects.filter(id=coding_task_id).first()
        if not coding_task:
            raise serializers.ValidationError(
                f"Matching Coding Task for {coding_task_id} does not exist"
            )
        return super().validate(attrs)

class OpenEndedAnswerSerializer(serializers.Serializer):
    open_ended_question_id = serializers.IntegerField()
    answer_text = serializers.CharField(allow_blank=True)

    def validate(self, attrs):
        question_id = attrs.get("open_ended_question_id")
        question = OpenEndedQuestion.objects.filter(id=question_id).first()
        if not question:
            raise serializers.ValidationError(f"Matching open-ended question for {question_id} does not exist")
        return super().validate(attrs)


class GeneralSkillAssessmentSectionAnswerSerializer(serializers.Serializer):
    """
    Answers for a single section.
    Now PERMITS partial component submission:
      - You may submit only MCQs, only Coding, only open-ended, or any mix, for this section.
    """
    section_id = serializers.IntegerField()
    mcq_answers = serializers.ListField(
        child=MCQAnswerSerializer(), required=False, allow_empty=False
    )
    coding_task_answers = serializers.ListField(
        child=CodingAnswerSerializer(), required=False, allow_empty=False
    )
    open_ended_answers = serializers.ListField(
        child=OpenEndedAnswerSerializer(), required=False, allow_empty=False
    )
    # legacy free-text (optional)
    coding_task_answer = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        assessment = self.context.get("assessment")
        section_id = attrs.get("section_id")
        mcq_answers = attrs.get("mcq_answers") or []
        coding_task_answers = attrs.get("coding_task_answers") or []
        open_ended_answers = attrs.get("open_ended_answers") or []
        legacy_free = (attrs.get("coding_task_answer") or "").strip()

        if not assessment.sections.filter(id=section_id).exists():
            raise serializers.ValidationError(f"Section {section_id} does not belong to this assessment")

        if not mcq_answers and not coding_task_answers and not open_ended_answers and not legacy_free:
            raise serializers.ValidationError(f"No answers provided for section {section_id}")

        if open_ended_answers:
            question_ids = [item.get("open_ended_question_id") for item in open_ended_answers]
            if len(set(question_ids)) != len(question_ids):
                raise serializers.ValidationError("Duplicate open-ended answers detected")

            valid_question_ids = set(
                GeneralSkillAssessmentSection.objects
                .filter(id=section_id, open_ended_questions__id__in=question_ids)
                .values_list("open_ended_questions__id", flat=True)
                .distinct()
            )
            extra_questions = set(question_ids) - valid_question_ids
            if extra_questions:
                raise serializers.ValidationError(
                    f"{', '.join(map(str, sorted(extra_questions)))} are not valid open-ended questions for section {section_id}"
                )

        if mcq_answers:
            mcq_ids = [item.get("mcq_id") for item in mcq_answers]
            if len(set(mcq_ids)) != len(mcq_ids):
                raise serializers.ValidationError("Duplicate MCQ answers detected")

            valid_mcq_ids = set(
                GeneralSkillAssessmentSectionMCQ.objects
                .filter(section_id=section_id, mcq_id__in=mcq_ids)
                .values_list("mcq_id", flat=True)  # already constrained; no need for DISTINCT usually
            )
            extra_mcqs = set(mcq_ids) - valid_mcq_ids
            if extra_mcqs:
                raise serializers.ValidationError(
                    f"{', '.join(map(str, sorted(extra_mcqs)))} are not valid MCQs for section {section_id}"
                )


        if coding_task_answers:
            task_ids = [item.get("coding_task_id") for item in coding_task_answers]
            if len(set(task_ids)) != len(task_ids):
                raise serializers.ValidationError("Duplicate coding task answers detected")

            # constrain by both section and the provided ids to reduce rows
            valid_task_ids = set(
                GeneralSkillAssessmentSection.objects
                .filter(id=section_id, coding_tasks__id__in=task_ids)
                .values_list("coding_tasks__id", flat=True)
                .distinct()
            )
            extra_tasks = set(task_ids) - valid_task_ids
            if extra_tasks:
                raise serializers.ValidationError(
                    f"{', '.join(map(str, sorted(extra_tasks)))} are not valid coding tasks for section {section_id}"
                )

        return attrs



class GeneralSkillAssessmentAnswerSerializer(serializers.Serializer):
    """
    Accepts PARTIAL submissions.
    Old code required answers for *all* sections — we remove that.
    """
    answers = serializers.ListField(
        child=GeneralSkillAssessmentSectionAnswerSerializer(),
        required=True,
        allow_empty=False,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # pass assessment context down to the section serializer
        self.fields["answers"].child.context.update(self.context)

    def validate(self, attrs):
        assessment = self.context.get("assessment")
        items = attrs.get("answers") or []

        # Provided sections must all belong to this assessment (subset allowed)
        provided_ids = {s.get("section_id") for s in items}
        valid_ids = set(assessment.sections.values_list("id", flat=True))
        invalid = provided_ids - valid_ids
        if invalid:
            raise serializers.ValidationError(
                f"Invalid section ids provided: {', '.join(map(str, sorted(invalid)))}"
            )

        # No “please provide answers for every section” check anymore.
        # Partial/staged submission is now valid.

        return attrs


class QuestionResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreScreeningInterviewQuestionResponse
        fields = [
            "id",
            "question",
            "answer",
            "follow_up_asked",
            "follow_up_question",
            "follow_up_response",
            "value_alignment",
            "strengths",
            "concerns",
            "bias_check",
            "relevance",
            "alignment",
            "self_awareness",
            "adjustments",
            "total",
        ]


class PreScreeningInterviewResultSerializer(serializers.ModelSerializer):
    responses = serializers.SerializerMethodField()

    class Meta:
        model = PreScreeningInterviewSession
        fields = [
            "id",
            "total_points",
            "final_evaluation",
            "summary_comment",
            "created_at",
            "responses",
        ]

    def get_responses(self, obj):
        return QuestionResponseSerializer(
            obj.pre_screening_response.all(), many=True
        ).data


# submissions
class SubmissionSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()
    time_taken_formated = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()

    class Meta:
        model = CandidateAssessmentSubmission
        fields = [
            "id",
            "total_score",
            "time_taken",
            "time_taken_formated",
            "stats",
            "candidate_name",
            "candidate_email",
            "mark_status",
            "is_passed",
            "is_completed",
        ]

    def get_candidate_name(self, instance):
        return get_submission_candidate_name(instance)

    def get_candidate_email(self, instance):
        return get_submission_candidate_email(instance)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Only gate the candidate-facing view (context set by
        # SkillAssessmentResultAPIView) -- recruiter/staff views of the same
        # serializer (GetSubmissionsForASkillAssessment) always see the real
        # score regardless of show_results_to_candidate.
        if self.context.get("gate_for_candidate"):
            assessment = instance.skill_assessment
            if assessment and not assessment.show_results_to_candidate:
                data["total_score"] = None
                data["stats"] = None
                data["results_hidden"] = True
                return data
        data["results_hidden"] = False
        return data

    def get_time_taken_formated(self, instance):
        if not instance.time_taken:
            return "0:00"
        total_minutes = int(instance.time_taken)
        seconds = int(round((float(instance.time_taken) - total_minutes) * 60))
        if seconds == 60:
            total_minutes += 1
            seconds = 0
        return f"{total_minutes}:{seconds:02d}"

    def _prefetch_if_needed(self, instance):
        """Only prefetch here if the view didn't already do it."""
        if self.context.get("prefetched"):
            # View has already done the heavy prefetch; just return the cached queryset
            return instance.skill_assessment_section_submissions.all()

        # Otherwise, do a local prefetch with unique to_attr names to avoid clashes
        return (
            instance.skill_assessment_section_submissions
            .select_related("skill_assessment_section")
            .prefetch_related(
                Prefetch(
                    "coding_task_answers",
                    queryset=CandidateAssessmentCodingAnswer.objects.only("id", "coding_task_id"),
                    to_attr="pf_coding_answers",
                ),
                Prefetch(
                    "candidateassessmentmcqanswer_set",
                    queryset=CandidateAssessmentMCQAnswer.objects
                        .select_related("question")
                        .only("id", "selected_answer_index", "question__correct_option_index"),
                    to_attr="pf_mcq_answers",
                ),
                Prefetch(
                    "skill_assessment_section__mcq_questions_new",
                    queryset=GeneralSkillAssessmentMCQQuestion.objects.only("id", "correct_option_index"),
                    to_attr="pf_mcqs",
                ),
                Prefetch(
                    "skill_assessment_section__coding_tasks",
                    queryset=CodingTask.objects.only("id", "max_score"),
                    to_attr="pf_coding_tasks",
                ),
            )
        )

    def get_stats(self, instance: CandidateAssessmentSubmission):
        section_submissions = self._prefetch_if_needed(instance)

        # Accumulators
        mcq_total = 0
        mcq_attempted = 0
        mcq_correct = 0

        coding_total_tasks = 0
        coding_attempted = 0
        coding_weighted_sum = 0.0
        coding_weight_total = 0.0

        for ss in section_submissions:
            section = ss.skill_assessment_section
            if not section:
                continue

            # Resolve attributes (handle both view-prefetched and local-prefetched names)
            mcq_answers = getattr(ss, "prefetched_mcq_answers", None)
            if mcq_answers is None:
                mcq_answers = getattr(ss, "pf_mcq_answers", None)
            coding_answers = getattr(ss, "prefetched_coding_answers", None)
            if coding_answers is None:
                coding_answers = getattr(ss, "pf_coding_answers", None)

            section_mcqs = getattr(section, "prefetched_mcqs", None)
            if section_mcqs is None:
                section_mcqs = getattr(section, "pf_mcqs", None)

            section_coding_tasks = getattr(section, "prefetched_coding_tasks", None)
            if section_coding_tasks is None:
                section_coding_tasks = getattr(section, "pf_coding_tasks", None)

            # ===== MCQ =====
            if section.type in ["MCQ", "Custom"] and section_mcqs is not None:
                total_here = len(section_mcqs)
                mcq_total += total_here

                answers_list = mcq_answers or []
                attempted_here = sum(1 for a in answers_list if a.selected_answer_index is not None)
                mcq_attempted += attempted_here

                mcq_correct += sum(
                    1 for a in answers_list
                    if (
                        a.selected_answer_index is not None
                        and a.question
                        and a.selected_answer_index == a.question.correct_option_index
                    )
                )

            # ===== CODING =====
            if section.type in ["Coding Task", "Custom"] and section_coding_tasks is not None:
                total_tasks_here = len(section_coding_tasks)
                coding_total_tasks += total_tasks_here

                answers_list = coding_answers or []
                coding_attempted += len(answers_list)

                # Compute percentage using section points if available
                section_possible = float(sum((ct.max_score or 0) for ct in section_coding_tasks)) if total_tasks_here else 0.0
                section_obtained = float(ss.total_score or 0.0)

                section_percent = None
                weight = 0.0

                if section_possible > 0:
                    section_percent = (section_obtained / section_possible) * 100.0
                    weight = section_possible  # weight by points

                # Fallback: completion proxy
                if section_percent is None:
                    if total_tasks_here > 0:
                        section_percent = (len(answers_list) / total_tasks_here) * 100.0
                        weight = float(total_tasks_here)
                    else:
                        section_percent = 0.0
                        weight = 1.0

                coding_weighted_sum += section_percent * weight
                coding_weight_total += weight

        mcq_percent = round((mcq_correct / mcq_total) * 100.0, 2) if mcq_total else 0.0
        coding_percent = round((coding_weighted_sum / coding_weight_total), 2) if coding_weight_total else 0.0

        return {
            "mcq": {
                "attempted": mcq_attempted,
                "correct": mcq_correct,
                "total": mcq_total,
                "percent": mcq_percent,
            },
            "coding": {
                "attempted": coding_attempted,
                "total": coding_total_tasks,
                "percent": coding_percent,
            },
        }


class RecruiterSubmissionAnswersSerializer(serializers.Serializer):
    """Full question-and-answer breakdown for a candidate's completed
    submission, for the recruiter-facing application detail view -- unlike
    SubmissionSerializer's aggregate stats, this includes the actual
    question/option text and the candidate's chosen answer per question."""

    sections = serializers.SerializerMethodField()

    def get_sections(self, submission):
        section_submissions = (
            submission.skill_assessment_section_submissions
            .select_related("skill_assessment_section")
            .order_by("skill_assessment_section_id")
        )

        sections = []
        for ss in section_submissions:
            section = ss.skill_assessment_section
            if not section:
                continue

            entry = {"id": section.id, "name": section.name, "type": section.type}

            if section.type == SkillAssessmentTypes.MCQ:
                answers_by_question = {
                    a.question_id: a.selected_answer_index
                    for a in CandidateAssessmentMCQAnswer.objects.filter(
                        section_submission=ss
                    ).select_related("question")
                }
                questions = []
                for q in section.mcq_questions_new.all():
                    selected = answers_by_question.get(q.id)
                    questions.append({
                        "id": q.id,
                        "question": q.question,
                        "options": q.options,
                        "correct_option_index": q.correct_option_index,
                        "selected_option_index": selected,
                        "is_correct": selected is not None and selected == q.correct_option_index,
                    })
                entry["questions"] = questions

            elif section.type == SkillAssessmentTypes.CODING_TASK:
                answers_by_task = {
                    a.coding_task_id: a.user_answer
                    for a in ss.coding_task_answers.all()
                }
                tasks = []
                for task in section.coding_tasks.all():
                    tasks.append({
                        "id": task.id,
                        "title": task.title,
                        "description": task.description,
                        "candidate_answer": answers_by_task.get(task.id, ""),
                    })
                entry["coding_tasks"] = tasks

            elif section.type == SkillAssessmentTypes.OPEN_ENDED:
                answers_by_question = {
                    a.open_ended_question_id: a
                    for a in CandidateAssessmentOpenEndedAnswer.objects.filter(
                        section_submission=ss
                    ).select_related("open_ended_question")
                }
                questions = []
                for q in section.open_ended_questions.all():
                    answer = answers_by_question.get(q.id)
                    questions.append({
                        "id": q.id,
                        "question": q.question,
                        "grading_guidance": q.grading_guidance,
                        "max_score": q.max_score,
                        "answer_id": answer.id if answer else None,
                        "answer_text": answer.answer_text if answer else "",
                        "ai_suggested_score": answer.ai_suggested_score if answer else None,
                        "ai_suggested_feedback": answer.ai_suggested_feedback if answer else "",
                        "score": answer.score if answer else None,
                        "feedback": answer.feedback if answer else "",
                        "is_graded": answer.is_graded if answer else False,
                    })
                entry["open_ended_questions"] = questions

            sections.append(entry)

        return sections


# serializer for adding mcq questions for talent verification
class AddMCQAssessmentSerializer(serializers.Serializer):
    file = serializers.FileField()
    role = serializers.CharField()  # slug of Role
    difficulty_level = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    duration_minutes = serializers.IntegerField(min_value=1)
    stack=serializers.IntegerField(required=False)  

    # ----- Headings validation -------------------------------------------------
    def is_valid_headings(self, headings):
        h = [str(x).strip().lower() for x in headings]
        n = len(h)
        if n == 8:
            # ['category', 'question', 'option a', 'option b', 'option c', 'option d', 'answer', 'difficulty']
            return h == ["category", "question", "option a", "option b", "option c", "option d", "answer", "difficulty"]
        if n == 6:
            # ['question', 'option a', 'option b', 'option c', 'option d', 'answer']
            return h == ["question", "option a", "option b", "option c", "option d", "answer"]
        if n == 5:
            # ['question', 'option a', 'option b', 'option c', 'answer']
            return h == ["question", "option a", "option b", "option c", "answer"]
        return False

    # ----- Row formatting ------------------------------------------------------
    def format_rows(self, rows, headers):
        formatted_rows, errors = [], []
        H = [str(x).strip().lower() for x in headers]

        for row_index, row in enumerate(rows):
            try:
                # Normalize row values (keep None as None, but cast strings safely)
                vals = [("" if v is None else str(v)).strip() for v in row]

                if len(H) == 8:
                    category, question = vals[0], vals[1]
                    option_a, option_b, option_c, option_d = vals[2:6]
                    answer, row_diff = vals[6], vals[7]  # row_diff currently unused
                elif len(H) == 6:
                    category, row_diff = None, None
                    question = vals[0]
                    option_a, option_b, option_c, option_d = vals[1:5]
                    answer = vals[5]
                elif len(H) == 5:
                    category, row_diff = None, None
                    question = vals[0]
                    option_a, option_b, option_c = vals[1:4]
                    option_d, answer = "", vals[4]
                else:
                    errors.append(f"Invalid header format at row {row_index + 2}")
                    continue

                # Determine correct option index (1-based). Accept letter A-D or exact text match.
                correct_answer_index = None
                if len(answer) == 1 and answer.upper() in ("A", "B", "C", "D"):
                    correct_answer_index = ord(answer.upper()) - ord("A") + 1
                else:
                    opts = [option_a.lower(), option_b.lower(), option_c.lower(), option_d.lower()]
                    target = answer.lower()
                    for idx, opt in enumerate(opts, start=1):
                        if opt and target == opt:
                            correct_answer_index = idx
                            break

                formatted_row = {
                    "question": question,
                    "option_a": option_a,
                    "option_b": option_b,
                    "option_c": option_c,
                    "option_d": option_d,
                    "correct_answer_index": correct_answer_index,
                }
                if category:
                    formatted_row["category"] = category

                formatted_rows.append(formatted_row)

                if not correct_answer_index:
                    present_opts = [o for o in [option_a, option_b, option_c, option_d] if o]
                    errors.append(
                        f"Answer for row {row_index + 2} was not found in the provided options. Options: {present_opts}"
                    )
            except Exception as e:
                errors.append(f"Error processing row {row_index + 2}: {str(e)}")

        return formatted_rows, errors

    # ----- File validation -----------------------------------------------------
    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in (".xlsx", ".csv"):
            raise serializers.ValidationError("File must be a .xlsx or .csv file.")

        headings, rows = [], []

        if ext == ".csv":
            value.seek(0)
            decoded = value.read().decode("utf-8").splitlines()
            reader = csv.reader(decoded)
            all_rows = list(reader)
            if all_rows:
                headings = [str(h).strip().lower() for h in all_rows[0]]
                if not self.is_valid_headings(headings):
                    raise serializers.ValidationError(
                        "Invalid CSV headings. Expected e.g. 'question, option a, option b, option c, option d, answer'."
                    )
                rows = all_rows[1:]
        else:
            wb = openpyxl.load_workbook(value)
            sheet = wb.active
            all_rows = [[cell.value for cell in row] for row in sheet]
            if all_rows:
                headings = [str(h).strip().lower() if h is not None else "" for h in all_rows[0]]
                if not self.is_valid_headings(headings):
                    raise serializers.ValidationError(
                        "Invalid Excel headings. Expected e.g. 'question, option a, option b, option c, option d, answer'."
                    )
                rows = all_rows[1:]

        formatted_rows, errors = self.format_rows(rows, headings)
        if errors:
            # show the first 2 to avoid huge error payloads
            raise serializers.ValidationError(", ".join(errors[:2]))
        return formatted_rows

    # ----- Other field validators ---------------------------------------------
    def validate_role(self, value):
        role = Role.objects.filter(slug=value).first()
        if not role:
            raise serializers.ValidationError("Invalid role")
        return role  # store the Role instance

    def validate_stack(self, value):
        if not value:
            return None
        stack = TechStack.objects.filter(id=value).first()
        if not stack:
            raise serializers.ValidationError("Invalid tech stack")
        return stack
    def validate_difficulty_level(self, value):
        valid = [
            SkillAssessmentDifficultyLevels.JUNIOR,
            SkillAssessmentDifficultyLevels.INTERMEDIATE,
            SkillAssessmentDifficultyLevels.SENIOR,
        ]
        v = (value or "").strip().upper()
        if v not in valid:
            raise serializers.ValidationError(f'Valid difficulty levels are {", ".join(valid)}')
        return v

    # ----- Create --------------------------------------------------------------
    def create(self, validated_data):
        rows = validated_data["file"]             
        role = validated_data["role"]   
        stack=validated_data.get("stack", None)
        difficulty_level = validated_data["difficulty_level"]  
        name = validated_data["name"]
        description = validated_data["description"]
        duration_minutes = validated_data["duration_minutes"]

        with transaction.atomic():
            # 1) Create MCQ questions (bulk)
            mcq_objs = []
            for r in rows:
                options = [
                    {"value": r.get("option_a"), "index": 1},
                    {"value": r.get("option_b"), "index": 2},
                    {"value": r.get("option_c"), "index": 3},
                ]
                if r.get("option_d"):
                    options.append({"value": r.get("option_d"), "index": 4})

                mcq_objs.append(GeneralSkillAssessmentMCQQuestion(
                    is_ai_generated=False,
                    question=r.get("question") or "",
                    options=options,
                    correct_option_index=r.get("correct_answer_index") or 0,  # 0 if unresolved
                ))

            # Bulk create returns PKs on Postgres/Django 3.2+; adjust if needed
            GeneralSkillAssessmentMCQQuestion.objects.bulk_create(mcq_objs)
            # Refresh to ensure IDs are present in all DBs (optional on PG):
            for obj in mcq_objs:
                if not getattr(obj, "id", None):
                    obj.refresh_from_db()

            # 2) Create Assessment
            assessment = GeneralSkillAssessment.objects.create(
                title=name,
                published=True,
                difficulty_level=difficulty_level,  # canonical stored
                description=description,
                duration_minutes=duration_minutes,
                passing_grade=70,
                reference=str(uuid.uuid4().hex)[:15],
                assessment_type=SkillAssessmentTypes.MCQ,
                assessment_stack=stack
            )
            assessment.skillsets.add(role)

            # 3) Create MCQ Section
            mcq_section = GeneralSkillAssessmentSection.objects.create(
                name="Multiple Choice Questions",
                company_skill_assessment=assessment,
                type=SkillAssessmentTypes.MCQ,
            )

            # 4) Link MCQs to section via through model with order
            GeneralSkillAssessmentSectionMCQ.objects.bulk_create([
                GeneralSkillAssessmentSectionMCQ(section=mcq_section, mcq=obj)
                for obj in mcq_objs
            ])

        return assessment

class AddCodingAssessmentSerializer(serializers.Serializer):
    stack = serializers.PrimaryKeyRelatedField(queryset=TechStack.objects.all())
    difficulty_level = serializers.CharField()
    role = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    duration_minutes = serializers.IntegerField()

    def validate_role(self, value):
        role = Role.objects.filter(slug=value).first()
        if not role:
            raise serializers.ValidationError("Invalid role")
        return role
    
    def validate_difficulty_level(self, value):
        valid_difficulty_levels = [
            SkillAssessmentDifficultyLevels.JUNIOR,
            SkillAssessmentDifficultyLevels.INTERMEDIATE,
            SkillAssessmentDifficultyLevels.SENIOR,
        ]
        if value.upper() not in valid_difficulty_levels:
            raise serializers.ValidationError(
                f'Valid difficulty levels are {", ".join(valid_difficulty_levels)}'
            )
        return value.lower()
    
    def create(self, validated_data):
        create_talent_coding_assessment_task_v2.delay(
            validated_data["stack"].id,
            validated_data["role"].id,
            validated_data["difficulty_level"],
            validated_data["name"],
            validated_data["description"],
            validated_data["duration_minutes"]
        )
        return {"message": "Task to create coding assessment has been queued."}

class AddCodingAssessmentSerializer_V2(serializers.Serializer):
    stack = serializers.PrimaryKeyRelatedField(queryset=TechStack.objects.all())
    difficulty_level = serializers.ChoiceField(choices=[
        SkillAssessmentDifficultyLevels.JUNIOR,
        SkillAssessmentDifficultyLevels.INTERMEDIATE,
        SkillAssessmentDifficultyLevels.SENIOR,
    ])

    name = serializers.CharField()
    description = serializers.CharField()
    duration_minutes = serializers.IntegerField(min_value=1)

    # Frontend passes only the MCQ section id now
    mcq_section_id = serializers.IntegerField()

    @staticmethod
    def _lower(v: str) -> str:
        return (v or "").strip().lower()

    def validate_mcq_section_id(self, value):
        section = (
            GeneralSkillAssessmentSection.objects
            .select_related("company_skill_assessment")
            .filter(id=value)
            .first()
        )
        if not section:
            raise serializers.ValidationError("MCQ section not found.")
        if section.type != SkillAssessmentTypes.MCQ:
            raise serializers.ValidationError("Provided section is not an MCQ section.")
        self._mcq_section = section
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        stack = attrs["stack"]
        difficulty = attrs["difficulty_level"]

        mcq_section = getattr(self, "_mcq_section", None)
        parent = mcq_section.company_skill_assessment

        # Stack coherence
        
        if not parent.assessment_stack_id:
            parent.assessment_stack = stack
            parent.save(update_fields=["assessment_stack"])

        # Require exactly one role to infer coding context
        roles = list(parent.skillsets.all()[:2])
        if len(roles) != 1:
            raise serializers.ValidationError(
                "Assessment must have exactly one role in 'skillsets' to infer coding context."
            )

        # Auto-pick an MCQ from this section (most recently linked through row)
        link = (
            mcq_section.section_mcqs
            .select_related("mcq")
            .order_by("-id")  # newest link first; no order/weight fields in your model
            .first()
        )
        if not link:
            raise serializers.ValidationError("The selected MCQ section has no MCQ questions to link.")

        self._assessment = parent
        self._role = roles[0]
        self._auto_mcq = link.mcq
        return attrs

    def create(self, validated_data):
        stack = validated_data["stack"]
        difficulty_canonical = validated_data["difficulty_level"]
        difficulty_lower = self._lower(difficulty_canonical)
        name = validated_data["name"]
        description = validated_data["description"]
        duration_minutes = validated_data["duration_minutes"]

        mcq_section = self._mcq_section
        parent = self._assessment
        role = self._role
        mcq = self._auto_mcq

        with transaction.atomic():
            # Align parent difficulty (store canonical)
            if parent.difficulty_level != difficulty_canonical:
                parent.difficulty_level = difficulty_canonical
                parent.save(update_fields=["difficulty_level"])

            # Ensure a CODING_TASK section exists
            coding_section, _ = GeneralSkillAssessmentSection.objects.get_or_create(
                company_skill_assessment=parent,
                type=SkillAssessmentTypes.CODING_TASK,
                defaults={"name": "Coding Challenge"},
            )

            # Flip MCQ-only → CUSTOM (your enum set has no MIXED)
            if parent.assessment_type == SkillAssessmentTypes.MCQ:
                parent.assessment_type = SkillAssessmentTypes.CUSTOM
                parent.save(update_fields=["assessment_type"])

            # Create MCQ ↔ Coding link placeholder (completed by worker)
            link = MCQToCodingLink.objects.create(
                assessment=parent,
                section=mcq_section,
                mcq=mcq,
                coding_task=None,
            )

            assessment_link = parent.assessment_id or parent.reference or uuid.uuid4().hex[:15]

            # Dispatch worker
            create_talent_coding_assessment_task_v2.delay(
                stack_id=stack.id,
                role_id=role.id,
                difficulty_level=difficulty_lower,   # AI expects lowercase
                name=name,
                description=description,
                duration_minutes=duration_minutes,
                assessment_link=assessment_link,
                coding_section_id=coding_section.id,
                mcq_coding_link_id=link.id,          # auto-picked MCQ link
                mcq_section_id=mcq_section.id,       # extra validation for the worker
            )

        return parent

       
# serializer to start talent verification assessmentS
class StartVerificationAssessmentSerializer(serializers.Serializer):
    role_id           = serializers.IntegerField()
    stack_id          = serializers.IntegerField(required=False)
    difficulty_level  = serializers.CharField()
    mcq_count         = serializers.IntegerField(default=15)
    coding_count      = serializers.IntegerField(default=2)

    def validate(self, data):
        role = Role.objects.filter(id=data['role_id']).first()
        if not role:
            raise serializers.ValidationError("Invalid role_id")
        data['role'] = role

        if role.is_technical:
            stack = TechStack.objects.filter(id=data.get('stack_id')).first()
            if not stack:
                raise serializers.ValidationError("stack_id required for technical roles")
            data['stack'] = stack
        return data
    
    def validate_difficulty_level(self, value):
        valid_difficulty_levels = [
            SkillAssessmentDifficultyLevels.JUNIOR,
            SkillAssessmentDifficultyLevels.INTERMEDIATE,
            SkillAssessmentDifficultyLevels.SENIOR,
        ]
        if value.upper() not in valid_difficulty_levels:
            raise serializers.ValidationError(
                f'Valid difficulty levels are {", ".join(valid_difficulty_levels)}'
            )
        return value.upper()

class AIFeedbackSerializer(serializers.Serializer):
    application_id = serializers.IntegerField()
    talent_name = serializers.CharField()
    role = serializers.CharField()
    resume_analysis_score = serializers.IntegerField(allow_null=True)
    cultural_fit_score = serializers.IntegerField(allow_null=True)
# serializer to start pre-screening interview
class PreScreeningInterviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreScreeningInterviewSession
        fields = [
            "candidate",
            "job_application",
            "assessment",
            "conversation_id",
            "total_points",
            "final_evaluation",
            "agent_comment"
        ]


class InitiateAssessmentPaymentSerializer(serializers.Serializer):
    assessment_id = serializers.IntegerField()
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    
class AIFeedbackSerializer(serializers.Serializer):
    application_id = serializers.IntegerField()
    talent_id = serializers.IntegerField()
    talent_name = serializers.CharField()
    role = serializers.CharField()
    cultural_fitness_score = serializers.IntegerField(allow_null=True)
    overall_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    resume_feedback = serializers.CharField()
    prescreening_feedback = serializers.CharField()
    assessment_score = serializers.FloatField()
    email = serializers.EmailField()
    profile_picture = serializers.URLField(allow_null=True)
    has_passed_tiaago_assessment = serializers.BooleanField()
    assessment_title = serializers.CharField()
    portfolio_slug = serializers.CharField()
    cover_letter= serializers.CharField()
    resume=serializers.URLField()
    resume_role_match_status= serializers.CharField()
    resume_text_authencity= serializers.CharField()
    resume_text_authencity_explanation= serializers.CharField()
    resume_experience_validation= serializers.CharField()
    resume_experience_validation_explanation= serializers.CharField()
    resume_review_score= serializers.IntegerField()
    resume_skill_matching_score= serializers.IntegerField()
    resume_education_certification_score= serializers.IntegerField()
    resume_experience_score= serializers.IntegerField()  
    resume_analysis_score = serializers.IntegerField(allow_null=True)  
    resume_strengths = serializers.CharField(allow_blank=True)
    resume_areas_for_improvement = serializers.CharField(allow_blank=True)
    resume_detailed_analysis = serializers.CharField(allow_blank=True)
    resume_recommendations= serializers.CharField(allow_blank=True)
    resume_experience_relevance_score= serializers.IntegerField(allow_null=True) 
    resume_achievement_quality=serializers.CharField(allow_blank=True)
    time_taken=serializers.CharField()
    difficulty_level=serializers.CharField()
    submission_id = serializers.IntegerField(allow_null=True)
    proctoring_integrity_score = serializers.IntegerField(allow_null=True)
    proctoring_risk_level = serializers.CharField(allow_null=True)
    proctoring_has_violation = serializers.BooleanField()



# serializer to start pre-screening interview
class PreScreeningInterviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreScreeningInterviewSession
        fields = [
            "candidate",
            "job_application",
            "assessment",
            "conversation_id",
            "total_points",
            "final_evaluation",
            "agent_comment"
        ]


class TechStackSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechStack
        fields = ['id', 'stack', 'slug', "difficulty_level"]


class CertificateReadSerializer(serializers.ModelSerializer):
    talent = serializers.SerializerMethodField()
    skill_assessment = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            "id",
            "talent",
            "skill_assessment",
            "certificate_url",
            "issued_at",
        ]

    def get_talent(self, obj):
        # keep it lightweight; expand if you need more fields
        return {
            "id": obj.talent_id,
            "user_id": obj.talent.user_id,
            "full_name": getattr(obj.talent, "full_name", None),
        }

    def get_skill_assessment(self, obj):
        return {
            "id": obj.skill_assessment_id,
            "title": getattr(obj.skill_assessment, "title", None),
            "difficulty_level": getattr(obj.skill_assessment, "difficulty_level", None),
        }


class CertificateWriteSerializer(serializers.ModelSerializer):
    # Accept IDs for write operations
    talent_id = serializers.PrimaryKeyRelatedField(
        queryset=TalentProfile.objects.all(), source="talent", write_only=True
    )
    skill_assessment_id = serializers.PrimaryKeyRelatedField(
        queryset=GeneralSkillAssessment.objects.all(),
        source="skill_assessment",
        write_only=True,
    )

    class Meta:
        model = Certificate
        fields = [
            "talent_id",
            "skill_assessment_id",
            "certificate_url",
        ]

    def validate(self, attrs):
        talent = attrs.get("talent")
        skill_assessment = attrs.get("skill_assessment")
        if Certificate.objects.filter(
            talent=talent, skill_assessment=skill_assessment
        ).exists():
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "Certificate already exists for this talent and assessment."
                    ]
                }
            )
        return attrs

    def to_representation(self, instance):
        # Return the read shape after create/update
        return CertificateReadSerializer(instance, context=self.context).data


class CertificateRenderInitSerializer(serializers.ModelSerializer):
    """
    Returned by the prepare endpoint to give the frontend everything
    needed to render a certificate, plus the certificate id.
    """

    recipient = serializers.SerializerMethodField()
    assessment = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            "id",  # certificate id to PATCH upload later
            "issued_at",
            "certificate_url",  # will be null at this stage
            "recipient",
            "assessment",
        ]

    def get_recipient(self, obj):
        u = getattr(obj.talent, "user", None)
        return {
            "talent_id": obj.talent_id,
            "full_name": getattr(obj.talent, "full_name", None),
            "username": getattr(u, "username", None),
            "email": getattr(u, "email", None),
        }

    def get_assessment(self, obj):
        a = obj.skill_assessment
        return {
            "id": obj.skill_assessment_id,
            "title": getattr(a, "title", None),
            "difficulty_level": getattr(a, "difficulty_level", None),
            "category": getattr(a, "category", None),
        }



class CertificateUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = ["certificate_url"] 

    def validate_certificate_url(self, file):
        max_mb = 25
        if file.size and file.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"File too large. Max is {max_mb}MB.")
        # accept pdf only
        ext = Path(file.name).suffix.lower()
        if ext not in [".pdf"]:
            raise serializers.ValidationError("Only PDF files are allowed.")
        return file

    def _build_filename(self, instance, original_name: str) -> str:
        username = getattr(getattr(instance.talent, "user", None), "username", "user")
        title = getattr(instance.skill_assessment, "title", "assessment")
        level = getattr(instance.skill_assessment, "difficulty_level", "level")

        base = f"{slugify(title)}__{slugify(username)}__{slugify(level)}"
        ext = Path(original_name).suffix.lower() or ".pdf"
        return f"certificates/{instance.skill_assessment_id}/{instance.talent_id}/{base}{ext}"

    def update(self, instance, validated_data):
        new_file = validated_data.get("certificate_url")
        if new_file:
            new_file.name = self._build_filename(instance, new_file.name)
            old = getattr(instance, "certificate_url", None)
            if old and old.name and old.storage.exists(old.name):
                try:
                    old.storage.delete(old.name)
                except Exception:
                    pass

        return super().update(instance, validated_data)

class CertificatePublicSerializer(serializers.ModelSerializer):
    talent_name = serializers.CharField(source="talent.full_name", read_only=True)
    talent_role = serializers.CharField(source="talent.role.name", read_only=True)
    skill_title = serializers.CharField(source="skill_assessment.title", read_only=True)
    certificate_url = serializers.FileField(read_only=True)

    class Meta:
        model = Certificate
        fields = [
            "talent_name",
            "talent_role",
            "skill_title",
            "issued_at",
            "certificate_url",
        ]


class AssessmentCooldownSerializer(serializers.ModelSerializer):
    """Serializer for AssessmentCooldown model"""
    days_remaining = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = AssessmentCooldown
        fields = [
            "id",
            "skill_assessment",
            "failed_at",
            "cooldown_ends_at",
            "days_remaining",
            "is_active"
        ]


# --- No-login candidate invite flow ---------------------------------------
# A candidate reaches these via an unguessable per-assessment `invite_token`
# instead of a Tiaago login session. Identity is resolved server-side from
# `assessment.job_application.applicant`, never from `request.user`.


class AssessmentInviteSectionFormatSerializer(serializers.ModelSerializer):
    """Section name + question count only -- shown on the pre-start "Test
    Format" screen, before any real question content is exposed."""

    question_count = serializers.SerializerMethodField()

    class Meta:
        model = GeneralSkillAssessmentSection
        fields = ["id", "name", "type", "question_count"]

    def get_question_count(self, section):
        if section.type == SkillAssessmentTypes.MCQ:
            return section.mcq_questions.all().count()
        if section.type == SkillAssessmentTypes.CODING_TASK:
            return section.coding_tasks.all().count()
        return 0


class AssessmentInviteDetailSerializer(serializers.Serializer):
    """Everything the pre-start screens need: who the candidate is, what job/
    company this is for, and the test format -- no question content."""

    assessment_title = serializers.CharField(source="title")
    duration_minutes = serializers.IntegerField()
    sections = AssessmentInviteSectionFormatSerializer(many=True)
    job_title = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    already_submitted = serializers.SerializerMethodField()
    proctoring = serializers.SerializerMethodField()
    deadline = serializers.DateTimeField(source="invite_deadline", allow_null=True)
    deadline_formatted = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(source="is_invite_expired")
    is_standalone = serializers.SerializerMethodField()

    def get_is_standalone(self, assessment):
        """True for a recruiter-built, account-less email invite (see
        GeneralSkillAssessment.invited_email) -- as opposed to the
        job-application flow, where the candidate already has a
        TalentProfile. The candidate-facing details step uses this to lock
        the name field, matching email: the recruiter set it, not the
        candidate (see the account-less identity design -- no account is
        ever silently created here)."""
        return not assessment.job_application_id

    def get_deadline_formatted(self, assessment):
        if not assessment.invite_deadline:
            return None
        from django.utils import timezone as dj_timezone

        return dj_timezone.localtime(assessment.invite_deadline).strftime("%A %-d %B %Y at %-I:%M %p")

    def get_proctoring(self, assessment):
        """Job's proctoring settings, for the pre-assessment briefing page to
        render conditionally. Falls back to standalone defaults when there's
        no job (a standalone invite is still proctored). None only if
        proctoring is explicitly off for the job."""
        job = getattr(assessment.job_application, "job", None)
        if assessment.job_application_id and (not job or not job.proctoring_enabled):
            return None
        if not job:
            return dict(STANDALONE_PROCTORING_DEFAULTS)
        return {
            "proctoring_enabled": job.proctoring_enabled,
            "require_fullscreen": job.require_fullscreen,
            "require_webcam": job.require_webcam,
            "webcam_snapshots_enabled": job.webcam_snapshots_enabled,
            "snapshot_interval_seconds": job.snapshot_interval_seconds,
            "max_tab_switches_before_warning": job.max_tab_switches_before_warning,
            "max_tab_switches_before_termination": job.max_tab_switches_before_termination,
            "copy_paste_blocked": job.copy_paste_blocked,
            "right_click_blocked": job.right_click_blocked,
            "devtools_detection_enabled": job.devtools_detection_enabled,
            "force_submit_on_critical_violation": job.force_submit_on_critical_violation,
        }

    def get_job_title(self, assessment):
        job = getattr(assessment.job_application, "job", None)
        return job.title if job else None

    def get_company_name(self, assessment):
        job = getattr(assessment.job_application, "job", None)
        if job:
            return job.company.company_name if job.company_id else None
        return assessment.company.company_name if assessment.company_id else None

    def _talent(self, assessment):
        return resolve_invite_talent(assessment)

    def get_candidate_name(self, assessment):
        talent = self._talent(assessment)
        existing = self.context.get("existing_submission")
        if existing and existing.candidate_display_name:
            return existing.candidate_display_name
        if talent is None:
            return assessment.invited_name
        return talent.full_name or talent.user.get_full_name() or talent.user.username

    def get_candidate_email(self, assessment):
        talent = self._talent(assessment)
        return talent.user.email if talent else assessment.invited_email

    def get_already_submitted(self, assessment):
        existing = self.context.get("existing_submission")
        return bool(existing and existing.is_completed)


class AssessmentInviteConfirmSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, allow_blank=False, trim_whitespace=True)


class AssessmentInviteFeedbackSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class AssessmentSubmissionSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentSubmissionSnapshot
        fields = ["id", "image", "created_at"]
        read_only_fields = fields