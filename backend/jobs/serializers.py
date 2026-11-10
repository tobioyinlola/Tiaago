from rest_framework import serializers
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from datetime import date

from base.utils import get_media_url
from create_user.api.serializers import (
    CompanyDetailSerializer,
    ApplicantDetailSerializer,
)

from create_user.models import Company

from roles.models import Role
from talent_network.choices import TalentNetworkWorkMode
from .models import (
    Job,
    HiringProfile,
    JobApplication,
    ApplicationEligibilityCheck,
    ApplicationWorkSample,
    ApplicationWorkSampleScore,
    ApplicationScenarioResponse,
    ApplicationScenarioScore,
    ApplicationPracticalAssessment,
    JobPracticalAssessmentSlot,
    Portfolio,
    Education,
    Experience,
    Certification,
    Tool,
    Project,
    JobAssessmentTemplate,
    JobAssessmentTemplateSection,
    JobAssessmentTemplateQuestion,
    JobInterviewAvailabilitySlot,
)
from .malware import validate_upload_content
from .practical import book_slot, normalise_policy
from .services import (
    current_workflow_stage,
    normalise_eligibility_declarations,
    normalise_eligibility_requirements,
    profile_eligibility_requirements,
    review_application_eligibility_check,
    sync_application_eligibility_checks,
    eligibility_progression_block_detail,
)


def _derive_job_location(work_mode, country):
    """`location` (free-text "Remote or specific country", still used by
    search/filtering and JobCard/JobDetailsCard display) is no longer a
    field recruiters fill in directly -- it's derived from work_mode +
    country instead, so that data keeps flowing without asking for the
    same information twice on the job-posting form."""
    if country and work_mode != TalentNetworkWorkMode.REMOTE:
        return country
    return "Remote"


def _validate_interview_type(attrs, instance=None):
    """An interview held on the recruiter's own platform is useless without
    the link, and a link on an in-app interview is misleading -- Tiaago
    provisions its own Daily.co room in that case and would ignore it.
    Shared by JobSerializer and JobUpdateSerializer so create and edit cannot
    disagree.
    """
    from scheduler.models import Scheduler

    interview_type = attrs.get(
        "interview_type", getattr(instance, "interview_type", "") or "IN_HOUSE"
    )
    url = (
        attrs.get("interview_meeting_url", getattr(instance, "interview_meeting_url", "") or "")
        or ""
    ).strip()

    if interview_type in Scheduler.EXTERNAL_INTERVIEW_TYPES and not url:
        raise serializers.ValidationError({
            "interview_meeting_url":
                "A meeting link is required when interviews are held on an external platform."
        })
    if interview_type == Scheduler.InterviewType.IN_HOUSE and url:
        raise serializers.ValidationError({
            "interview_meeting_url":
                "In-app interviews use a Tiaago room, so no external meeting link should be set."
        })
    return attrs


def _hiring_profile_summary(job):
    """Return the profile version actually captured by this job.

    A live job must not appear to change merely because the library profile is
    revised later.  Old data created before snapshots existed falls back to
    the linked profile so it remains readable.
    """
    snapshot = job.hiring_profile_snapshot or {}
    if snapshot.get("code"):
        return {
            "code": snapshot["code"],
            "name": snapshot["name"],
            "summary": snapshot.get("summary", ""),
            "version": snapshot["version"],
            "role_family": snapshot["role_family"],
            "industry_context": snapshot.get("industry_context", ""),
            "work_setting": snapshot.get("work_setting", ""),
        }
    if not job.hiring_profile_id:
        return None
    return {
        "code": job.hiring_profile.code,
        "name": job.hiring_profile.name,
        "summary": job.hiring_profile.summary,
        "version": job.hiring_profile_version,
        "role_family": job.hiring_profile.role_family,
        "industry_context": job.hiring_profile.industry_context,
        "work_setting": job.hiring_profile.work_setting,
    }


APPLICATION_CONFIGURATION_VERSION = 1
APPLICATION_CONFIGURATION_FIELDS = ("resume", "linkedin", "cover_letter", "additional_info")
APPLICATION_CONFIGURATION_LABEL_MAX_LENGTH = 120
WORK_SAMPLE_PROMPT_MAX_LENGTH = 800
WORK_SAMPLE_INSTRUCTIONS_MAX_LENGTH = 1200
WORK_SAMPLE_RUBRIC_MAX_CRITERIA = 6
WORK_SAMPLE_CRITERION_LABEL_MAX_LENGTH = 120
WORK_SAMPLE_CRITERION_DESCRIPTION_MAX_LENGTH = 360
WORK_SAMPLE_PASSING_SCORE_DEFAULT = 60
WORK_SAMPLE_MAX_SIZE = 10 * 1024 * 1024
WORK_SAMPLE_ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "csv"}
SCENARIO_PROMPT_MAX_LENGTH = 1200
SCENARIO_INSTRUCTIONS_MAX_LENGTH = 1200
SCENARIO_RESPONSE_LABEL_MAX_LENGTH = 120
SCENARIO_RESPONSE_MAX_LENGTH = 5000
PRACTICAL_ASSESSMENT_TITLE_MAX_LENGTH = 120
PRACTICAL_ASSESSMENT_INSTRUCTIONS_MAX_LENGTH = 1200
WORKFLOW_CONFIGURATION_VERSION = 1
WORKFLOW_STAGE_CODES = {
    "application", "eligibility", "screen", "work_sample", "scenario",
    "assessment", "practical", "interview", "decision", "readiness",
}


def _normalise_application_configuration(value):
    """Validate and return the compact, versioned candidate form contract.

    This intentionally accepts only the small first-release surface.  It
    prevents an API client from storing arbitrary JSON which a later
    candidate form could accidentally interpret as a required field.
    """
    if not isinstance(value, dict):
        raise serializers.ValidationError("Application configuration must be an object.")

    allowed_top_level = {"version", *APPLICATION_CONFIGURATION_FIELDS}
    unknown = set(value) - allowed_top_level
    if unknown:
        raise serializers.ValidationError(
            {key: "This application setting is not supported." for key in sorted(unknown)}
        )
    if value.get("version") != APPLICATION_CONFIGURATION_VERSION:
        raise serializers.ValidationError(
            {"version": f"Only application configuration version {APPLICATION_CONFIGURATION_VERSION} is supported."}
        )

    normalised = {"version": APPLICATION_CONFIGURATION_VERSION}
    for field in APPLICATION_CONFIGURATION_FIELDS:
        raw = value.get(field)
        if not isinstance(raw, dict):
            raise serializers.ValidationError({field: "Provide enabled and required settings."})
        allowed_section_keys = {"enabled", "required"}
        if field == "additional_info":
            allowed_section_keys.add("label")
        unknown_section = set(raw) - allowed_section_keys
        if unknown_section:
            raise serializers.ValidationError(
                {field: f"Unsupported setting: {', '.join(sorted(unknown_section))}."}
            )
        enabled = raw.get("enabled")
        required = raw.get("required")
        if not isinstance(enabled, bool) or not isinstance(required, bool):
            raise serializers.ValidationError({field: "Enabled and required must be true or false."})
        if required and not enabled:
            raise serializers.ValidationError({field: "A hidden field cannot be required."})
        normalised[field] = {"enabled": enabled, "required": required}
        if field == "additional_info":
            label = raw.get("label", "Anything else you'd like us to know?")
            if not isinstance(label, str) or not label.strip():
                raise serializers.ValidationError({field: "Provide a question label."})
            if len(label.strip()) > APPLICATION_CONFIGURATION_LABEL_MAX_LENGTH:
                raise serializers.ValidationError(
                    {field: f"The question label must be {APPLICATION_CONFIGURATION_LABEL_MAX_LENGTH} characters or fewer."}
                )
            normalised[field]["label"] = label.strip()
    return normalised


def _profile_application_configuration(profile):
    """Extract a reviewed profile default without exposing other future
    workflow defaults to the client.  Older profile rows safely fall back to
    the legacy form until their content is upgraded by the data migration.
    """
    defaults = profile.application_defaults or {}
    value = defaults.get("application_configuration")
    if not value:
        return Job().get_application_configuration()
    return _normalise_application_configuration(value)


def _profile_eligibility_requirements(profile):
    """Return the profile's reviewed eligibility defaults as snapshots."""
    return profile_eligibility_requirements(profile)


def _normalise_workflow_configuration(value):
    """Validate a small, ordered workflow contract for a published job."""
    if not isinstance(value, dict) or set(value) - {"version", "stages"}:
        raise serializers.ValidationError("Workflow configuration must contain only version and stages.")
    if value.get("version", WORKFLOW_CONFIGURATION_VERSION) != WORKFLOW_CONFIGURATION_VERSION:
        raise serializers.ValidationError("Only workflow configuration version 1 is supported.")
    stages = value.get("stages")
    if not isinstance(stages, list) or not stages:
        raise serializers.ValidationError("A workflow must contain at least one stage.")
    if any(stage not in WORKFLOW_STAGE_CODES for stage in stages):
        raise serializers.ValidationError("The workflow contains an unsupported stage.")
    if len(stages) != len(set(stages)):
        raise serializers.ValidationError("Workflow stages must not be duplicated.")
    if stages[0] != "application" or stages[-1] not in {"decision", "readiness"}:
        raise serializers.ValidationError("Workflows must start with application and end with decision or readiness.")
    return {"version": WORKFLOW_CONFIGURATION_VERSION, "stages": stages}


def _profile_workflow_configuration(profile):
    defaults = profile.workflow_defaults or {}
    return _normalise_workflow_configuration(defaults or {
        "version": 1,
        "stages": ["application", "screen", "assessment", "interview", "decision"],
    })


def _profile_supports_work_sample(profile):
    methods = (profile.evaluation_defaults or {}).get("methods", [])
    return "work_sample" in methods


def _profile_supports_scenario(profile):
    return "scenario" in (profile.evaluation_defaults or {}).get("methods", [])


def _profile_supports_practical_assessment(profile):
    return "practical_assessment" in (profile.evaluation_defaults or {}).get("methods", [])


def _normalise_practical_assessment_configuration(value):
    """Validate a human-observed practical assessment published with a job."""
    if not isinstance(value, dict):
        raise serializers.ValidationError("Practical assessment configuration must be an object.")
    unknown = set(value) - {"enabled", "required", "title", "instructions", "rubric", "policy"}
    if unknown:
        raise serializers.ValidationError(
            {key: "This practical-assessment setting is not supported." for key in sorted(unknown)}
        )
    enabled = value.get("enabled")
    required = value.get("required")
    title = value.get("title", "Practical assessment")
    instructions = value.get("instructions", "")
    if not isinstance(enabled, bool) or not isinstance(required, bool):
        raise serializers.ValidationError("Enabled and required must be true or false.")
    if required and not enabled:
        raise serializers.ValidationError("A hidden practical assessment cannot be required.")
    if not isinstance(title, str) or not isinstance(instructions, str):
        raise serializers.ValidationError("Practical assessment title and instructions must be text.")
    title, instructions = title.strip(), instructions.strip()
    if enabled and not title:
        raise serializers.ValidationError({"title": "Provide a practical assessment title."})
    if len(title) > PRACTICAL_ASSESSMENT_TITLE_MAX_LENGTH:
        raise serializers.ValidationError({"title": f"Keep the title to {PRACTICAL_ASSESSMENT_TITLE_MAX_LENGTH} characters or fewer."})
    if len(instructions) > PRACTICAL_ASSESSMENT_INSTRUCTIONS_MAX_LENGTH:
        raise serializers.ValidationError({"instructions": f"Keep the instructions to {PRACTICAL_ASSESSMENT_INSTRUCTIONS_MAX_LENGTH} characters or fewer."})
    rubric = _normalise_work_sample_rubric(value.get("rubric"))
    if enabled and not rubric["criteria"]:
        raise serializers.ValidationError({"rubric": "Add at least one observable criterion for this practical assessment."})
    return {
        "enabled": enabled,
        "required": required,
        "title": title,
        "instructions": instructions,
        "rubric": rubric,
        "policy": normalise_policy(value.get("policy")),
    }


def _normalise_work_sample_configuration(value):
    """Validate the intentionally small first work-sample contract."""
    if not isinstance(value, dict):
        raise serializers.ValidationError("Work-sample configuration must be an object.")
    unknown = set(value) - {"enabled", "required", "prompt", "instructions", "rubric"}
    if unknown:
        raise serializers.ValidationError(
            {key: "This work-sample setting is not supported." for key in sorted(unknown)}
        )
    enabled = value.get("enabled")
    required = value.get("required")
    prompt = value.get("prompt", "")
    instructions = value.get("instructions", "")
    if not isinstance(enabled, bool) or not isinstance(required, bool):
        raise serializers.ValidationError("Enabled and required must be true or false.")
    if required and not enabled:
        raise serializers.ValidationError("A hidden work sample cannot be required.")
    if not isinstance(prompt, str) or not isinstance(instructions, str):
        raise serializers.ValidationError("Work-sample prompt and instructions must be text.")
    prompt = prompt.strip()
    instructions = instructions.strip()
    if enabled and not prompt:
        raise serializers.ValidationError({"prompt": "Describe the work sample candidates should submit."})
    if len(prompt) > WORK_SAMPLE_PROMPT_MAX_LENGTH:
        raise serializers.ValidationError({"prompt": f"Keep the prompt to {WORK_SAMPLE_PROMPT_MAX_LENGTH} characters or fewer."})
    if len(instructions) > WORK_SAMPLE_INSTRUCTIONS_MAX_LENGTH:
        raise serializers.ValidationError({"instructions": f"Keep the instructions to {WORK_SAMPLE_INSTRUCTIONS_MAX_LENGTH} characters or fewer."})
    rubric = _normalise_work_sample_rubric(value.get("rubric"))
    return {
        "enabled": enabled,
        "required": required,
        "prompt": prompt,
        "instructions": instructions,
        "rubric": rubric,
    }


def _normalise_work_sample_rubric(value):
    """Return the scorecard stored with a job's work-sample request.

    Criterion IDs are assigned by the server in display order.  This keeps a
    recruiter-facing label from becoming an identifier that a client can
    choose or mutate, while still making the published scorecard safe to
    round-trip through the API.
    """
    if value is None:
        value = {}
    if not isinstance(value, dict):
        raise serializers.ValidationError({"rubric": "A work-sample scorecard must be an object."})
    unknown = set(value) - {"version", "passing_score", "criteria"}
    if unknown:
        raise serializers.ValidationError({"rubric": f"Unsupported scorecard setting: {', '.join(sorted(unknown))}."})
    version = value.get("version", 1)
    if version != 1:
        raise serializers.ValidationError({"rubric": "Only scorecard version 1 is supported."})
    passing_score = value.get("passing_score", WORK_SAMPLE_PASSING_SCORE_DEFAULT)
    if isinstance(passing_score, bool) or not isinstance(passing_score, int) or not 0 <= passing_score <= 100:
        raise serializers.ValidationError({"rubric": "Passing score must be a whole number from 0 to 100."})
    criteria = value.get("criteria", [])
    if not isinstance(criteria, list):
        raise serializers.ValidationError({"rubric": "Scorecard criteria must be a list."})
    if len(criteria) > WORK_SAMPLE_RUBRIC_MAX_CRITERIA:
        raise serializers.ValidationError({"rubric": f"Use at most {WORK_SAMPLE_RUBRIC_MAX_CRITERIA} scorecard criteria."})

    normalised_criteria = []
    for index, criterion in enumerate(criteria, start=1):
        if not isinstance(criterion, dict):
            raise serializers.ValidationError({"rubric": "Each scorecard criterion must be an object."})
        # `code` is accepted only to make an existing published configuration
        # round-trip cleanly; it is deliberately ignored and regenerated.
        unsupported = set(criterion) - {"code", "label", "description", "weight"}
        if unsupported:
            raise serializers.ValidationError({"rubric": f"Unsupported criterion setting: {', '.join(sorted(unsupported))}."})
        label = criterion.get("label", "")
        description = criterion.get("description", "")
        weight = criterion.get("weight")
        if not isinstance(label, str) or not label.strip():
            raise serializers.ValidationError({"rubric": "Every scorecard criterion needs a label."})
        if len(label.strip()) > WORK_SAMPLE_CRITERION_LABEL_MAX_LENGTH:
            raise serializers.ValidationError({"rubric": f"Criterion labels must be {WORK_SAMPLE_CRITERION_LABEL_MAX_LENGTH} characters or fewer."})
        if not isinstance(description, str):
            raise serializers.ValidationError({"rubric": "Criterion descriptions must be text."})
        if len(description.strip()) > WORK_SAMPLE_CRITERION_DESCRIPTION_MAX_LENGTH:
            raise serializers.ValidationError({"rubric": f"Criterion descriptions must be {WORK_SAMPLE_CRITERION_DESCRIPTION_MAX_LENGTH} characters or fewer."})
        if isinstance(weight, bool) or not isinstance(weight, int) or not 1 <= weight <= 100:
            raise serializers.ValidationError({"rubric": "Each criterion weight must be a whole number from 1 to 100."})
        normalised_criteria.append({
            "code": f"criterion-{index}",
            "label": label.strip(),
            "description": description.strip(),
            "weight": weight,
        })
    if normalised_criteria and sum(criterion["weight"] for criterion in normalised_criteria) != 100:
        raise serializers.ValidationError({"rubric": "Scorecard criterion weights must add up to 100."})
    return {
        "version": 1,
        "passing_score": passing_score,
        "criteria": normalised_criteria,
    }


def _normalise_scenario_configuration(value):
    """Validate a short written scenario published as part of a job."""
    if not isinstance(value, dict):
        raise serializers.ValidationError("Scenario configuration must be an object.")
    unknown = set(value) - {"enabled", "required", "prompt", "instructions", "response_label", "rubric"}
    if unknown:
        raise serializers.ValidationError(
            {key: "This scenario setting is not supported." for key in sorted(unknown)}
        )
    enabled = value.get("enabled")
    required = value.get("required")
    prompt = value.get("prompt", "")
    instructions = value.get("instructions", "")
    response_label = value.get("response_label", "Your response")
    if not isinstance(enabled, bool) or not isinstance(required, bool):
        raise serializers.ValidationError("Enabled and required must be true or false.")
    if required and not enabled:
        raise serializers.ValidationError("A hidden scenario cannot be required.")
    if not all(isinstance(value, str) for value in (prompt, instructions, response_label)):
        raise serializers.ValidationError("Scenario prompt, instructions and response label must be text.")
    prompt, instructions, response_label = prompt.strip(), instructions.strip(), response_label.strip()
    if enabled and not prompt:
        raise serializers.ValidationError({"prompt": "Describe the scenario candidates should respond to."})
    if not response_label:
        raise serializers.ValidationError({"response_label": "Provide a label for the candidate response."})
    if len(prompt) > SCENARIO_PROMPT_MAX_LENGTH:
        raise serializers.ValidationError({"prompt": f"Keep the scenario prompt to {SCENARIO_PROMPT_MAX_LENGTH} characters or fewer."})
    if len(instructions) > SCENARIO_INSTRUCTIONS_MAX_LENGTH:
        raise serializers.ValidationError({"instructions": f"Keep the instructions to {SCENARIO_INSTRUCTIONS_MAX_LENGTH} characters or fewer."})
    if len(response_label) > SCENARIO_RESPONSE_LABEL_MAX_LENGTH:
        raise serializers.ValidationError({"response_label": f"Keep the response label to {SCENARIO_RESPONSE_LABEL_MAX_LENGTH} characters or fewer."})
    return {
        "enabled": enabled,
        "required": required,
        "prompt": prompt,
        "instructions": instructions,
        "response_label": response_label,
        "rubric": _normalise_work_sample_rubric(value.get("rubric")),
    }


def _validate_work_sample_file(value):
    if not value:
        return value
    if value.size > WORK_SAMPLE_MAX_SIZE:
        raise serializers.ValidationError("Work sample is too large. The maximum size is 10MB.")
    extension = value.name.rsplit(".", 1)[-1].lower() if "." in value.name else ""
    if extension not in WORK_SAMPLE_ALLOWED_EXTENSIONS:
        raise serializers.ValidationError("Work samples must be PDF, DOCX, XLSX, or CSV files.")
    content_error = validate_upload_content(value, extension)
    if content_error:
        raise serializers.ValidationError(content_error)
    return value


class HiringProfileSerializer(serializers.ModelSerializer):
    """The safe, recruiter-facing profile library response.

    The profile's reviewed application form is included because the job
    wizard lets the recruiter adjust it before publishing.  Other future
    workflow defaults remain server-side until their engines exist.
    """

    application_configuration = serializers.SerializerMethodField()
    eligibility_requirements = serializers.SerializerMethodField()
    work_sample_supported = serializers.SerializerMethodField()
    scenario_supported = serializers.SerializerMethodField()
    practical_assessment_supported = serializers.SerializerMethodField()
    workflow_configuration = serializers.SerializerMethodField()

    def get_application_configuration(self, obj):
        return _profile_application_configuration(obj)

    def get_eligibility_requirements(self, obj):
        return _profile_eligibility_requirements(obj)

    def get_work_sample_supported(self, obj):
        return _profile_supports_work_sample(obj)

    def get_scenario_supported(self, obj):
        return _profile_supports_scenario(obj)

    def get_practical_assessment_supported(self, obj):
        return _profile_supports_practical_assessment(obj)

    def get_workflow_configuration(self, obj):
        return _profile_workflow_configuration(obj)

    class Meta:
        model = HiringProfile
        fields = (
            "code",
            "name",
            "summary",
            "version",
            "role_family",
            "industry_context",
            "work_setting",
            "application_configuration",
            "eligibility_requirements",
            "work_sample_supported",
            "scenario_supported",
            "practical_assessment_supported",
            "workflow_configuration",
        )


class JobSerializer(serializers.ModelSerializer):
    company = CompanyDetailSerializer(read_only=True)
    # role is a plain CharField on the Job model (free text, not a Role FK) --
    # DRF auto-generates a CharField for it from the model, no override needed.
    role_title = serializers.SerializerMethodField()
    no_of_applications = serializers.IntegerField(read_only=True)
    get_apply_url = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    payment_range = serializers.SerializerMethodField()
    detail_url = serializers.SerializerMethodField()
    payment_range_usd = serializers.ChoiceField(choices=Job.DollarPaymentRange.choices, required=False, allow_null=True)
    payment_range_ngn = serializers.ChoiceField(choices=Job.NairaPaymentRange.choices, required=False, allow_null=True)
    payment_currency = serializers.ChoiceField(choices=Job.PaymentCurrency.choices)
    completed_assessments_count = serializers.IntegerField(read_only=True)
    screening_threshold = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=100
    )
    assessment_time_limit = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    passing_grade = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=100
    )
    # Same 0-100 bound as the assessment pass mark -- an AI interview score
    # outside that range could never be met (or could never be missed).
    ai_interview_pass_mark = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=100
    )
    interview_duration_minutes = serializers.IntegerField(
        required=False, allow_null=True, min_value=5, max_value=480
    )
    # Write-only nested input assembled by the job-creation wizard's final submit.
    # Not model fields -- consumed in create() to build the related template/slot rows.
    assessment_questions = serializers.JSONField(write_only=True, required=False, default=list)
    interview_slots = serializers.JSONField(write_only=True, required=False, default=list)
    # Read-only counterparts -- the edit wizard (JobEditForm) pre-fills its
    # AssessmentGenerationStep/CriteriaAvailabilityStep from these, in the
    # exact shape assessment_questions/interview_slots above accept back on
    # submit. Separate fields (not a read/write split on the same field)
    # since the shapes genuinely differ: this is a full section/question or
    # slot listing, not the wizard's flat submission payload.
    existing_assessment_questions = serializers.SerializerMethodField()
    existing_interview_slots = serializers.SerializerMethodField()
    hiring_profile = serializers.SerializerMethodField()
    hiring_profile_code = serializers.SlugRelatedField(
        source="hiring_profile",
        slug_field="code",
        queryset=HiringProfile.objects.filter(is_active=True),
        write_only=True,
        required=False,
        allow_null=True,
    )
    application_configuration = serializers.JSONField(required=False)
    eligibility_requirements = serializers.JSONField(required=False)
    work_sample_configuration = serializers.JSONField(required=False)
    scenario_configuration = serializers.JSONField(required=False)
    practical_assessment_configuration = serializers.JSONField(required=False)
    workflow_configuration = serializers.JSONField(required=False)

    def validate_application_configuration(self, value):
        return _normalise_application_configuration(value)

    def validate_eligibility_requirements(self, value):
        try:
            return normalise_eligibility_requirements(value)
        except ValueError as error:
            raise serializers.ValidationError(str(error))

    def validate_work_sample_configuration(self, value):
        return _normalise_work_sample_configuration(value)

    def validate_scenario_configuration(self, value):
        return _normalise_scenario_configuration(value)

    def validate_practical_assessment_configuration(self, value):
        return _normalise_practical_assessment_configuration(value)

    def validate_workflow_configuration(self, value):
        return _normalise_workflow_configuration(value)

    def get_existing_assessment_questions(self, obj):
        template = getattr(obj, "assessment_template", None)
        if not template:
            return []
        return [
            {
                "category": section.name,
                "questions": [
                    {
                        "question": q.question,
                        "options": q.options,
                        "correct_option_index": q.correct_option_index,
                        "is_ai_generated": q.is_ai_generated,
                    }
                    for q in section.questions.all()
                ],
            }
            for section in template.sections.all()
        ]

    def get_existing_interview_slots(self, obj):
        return [
            {
                "id": slot.id,
                "date": slot.date,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "is_claimed": slot.is_claimed,
            }
            for slot in obj.interview_availability_slots.all()
        ]

    class Meta:
        model = Job
        fields = (
            "id",
            "public_id",
            "title",
            "role_title",
            "role",
            "hiring_engine",
            "hiring_profile",
            "hiring_profile_code",
            "hiring_profile_version",
            "application_configuration",
            "eligibility_requirements",
            "work_sample_configuration",
            "scenario_configuration",
            "practical_assessment_configuration",
            "workflow_configuration",
            "job_type",
            "job_level",
            "location",
            "role_category",
            "industry",
            "work_mode",
            "country",
            "experience",
            "salary_duration",
            "payment_currency",
            "payment_range",
            "payment_range_usd",
            "payment_range_ngn",
            "about_company",
            "job_requirement",
            "description",
            "hiring_type",
            "get_apply_url",
            "detail_url",
            "apply_token",
            "date_created",
            "company",
            "job_status",
            "no_of_applications",
            "view_count",
            "completed_assessments_count",
            "screening_threshold",
            "assessment_time_limit",
            "passing_grade",
            "assessment_questions",
            "interview_slots",
            "existing_assessment_questions",
            "existing_interview_slots",
            "ai_interview_enabled",
            "ai_interview_duration_minutes",
            "ai_interview_questions_count",
            "ai_interview_window_hours",
            "ai_interview_pass_mark",
            "interview_type",
            "interview_duration_minutes",
            "interview_meeting_url",
            "proctoring_enabled",
            "require_fullscreen",
            "require_webcam",
            "webcam_snapshots_enabled",
            "snapshot_interval_seconds",
            "max_tab_switches_before_warning",
            "max_tab_switches_before_termination",
            "copy_paste_blocked",
            "right_click_blocked",
            "devtools_detection_enabled",
            "force_submit_on_critical_violation",
        )
        read_only_fields = (
            "id",
            "public_id",
            "apply_token",
            "company",
            "title",
            "hiring_engine",
            "hiring_profile",
            "hiring_profile_version",
            "no_of_applications",
            "view_count",
            "completed_assessments_count",
        )
      

    def get_role_title(self, obj):
        return obj.role or ""

    def get_hiring_profile(self, obj):
        return _hiring_profile_summary(obj)

    def get_title(self, obj):
        """Get title from role for backward compatibility"""
        return obj.title


    def get_get_apply_url(self, obj):
        try:
            return obj.get_apply_url()
        except Exception:
            return None
        
    def get_detail_url(self, obj):
        try:
            return obj.get_detail_url()
        except:
            return None


    def get_payment_range(self, obj):
        display_range = obj.get_display_payment_range()
        if obj.payment_currency == Job.PaymentCurrency.USD:
            return f"{display_range}" if display_range else None
        elif obj.payment_currency == Job.PaymentCurrency.NGN:
            return f"{display_range}" if display_range else None
        return None

    def validate(self, attrs):
        # Role validation. JobSerializer.update() is only ever reached via
        # the draft-publish path (JobListCreateView.create) -- regular edits
        # to an already-published job go through JobUpdateSerializer instead
        # -- so role is required in both the create and update case here.
        role = attrs.get("role") or getattr(self.instance, "role", None)
        if not role:
            raise serializers.ValidationError({"role": "Role field is required"})

        _validate_interview_type(attrs, self.instance)

        # Experience check
        experience = attrs.get("experience", getattr(self.instance, "experience", None))
        if experience is not None and (experience < 0 or experience > 10):
            raise serializers.ValidationError("Experience must be between 0 and 10 years")

        currency = attrs.get("payment_currency")
        if not currency:
            raise serializers.ValidationError({"payment_currency": "Payment currency is required"})

        if currency == Job.PaymentCurrency.USD:
            attrs["payment_range_ngn"] = None
            if not attrs.get("payment_range_usd"):
                raise serializers.ValidationError({"payment_range_usd": "USD payment range is required when currency is USD"})
        elif currency == Job.PaymentCurrency.NGN:
            attrs["payment_range_usd"] = None
            if not attrs.get("payment_range_ngn"):
                raise serializers.ValidationError({"payment_range_ngn": "Naira payment range is required when currency is NGN"})
            
        if not self.instance:
            attrs['job_status'] = Job.JobStatus.ACTIVE

        # Capturing a profile is a publish-time operation.  The profile's
        # complete definition is snapshotted so later library edits cannot
        # rewrite an active job's requirements behind a recruiter's back.
        profile_supplied = "hiring_profile" in attrs
        profile = attrs.get("hiring_profile", getattr(self.instance, "hiring_profile", None))
        company = getattr(self.instance, "company", None) or self.context.get("company")
        configuration_supplied = "application_configuration" in attrs
        eligibility_supplied = "eligibility_requirements" in attrs
        work_sample_supplied = "work_sample_configuration" in attrs
        scenario_supplied = "scenario_configuration" in attrs
        practical_supplied = "practical_assessment_configuration" in attrs
        workflow_supplied = "workflow_configuration" in attrs
        if (configuration_supplied or eligibility_supplied or work_sample_supplied or scenario_supplied or practical_supplied or workflow_supplied) and (not profile or not company or not company.hiring_profiles_enabled):
            raise serializers.ValidationError({
                "application_configuration": "Choose an enabled hiring profile before configuring the candidate journey."
            })

        if profile_supplied:
            if not company or not company.hiring_profiles_enabled:
                raise serializers.ValidationError({
                    "hiring_profile_code": "Configurable hiring profiles are not enabled for this company."
                })
            if (
                self.instance
                and self.instance.job_status != Job.JobStatus.DRAFT
                and profile != self.instance.hiring_profile
            ):
                raise serializers.ValidationError({
                    "hiring_profile_code": "A published job's hiring profile cannot be changed. Create a new job for a different profile."
                })
            if profile is None:
                attrs["hiring_engine"] = Job.HiringEngine.LEGACY
                attrs["hiring_profile_version"] = 0
                attrs["hiring_profile_snapshot"] = {}
                attrs["application_configuration"] = {}
                attrs["eligibility_requirements"] = []
                attrs["work_sample_configuration"] = {}
                attrs["scenario_configuration"] = {}
                attrs["practical_assessment_configuration"] = {}
                attrs["workflow_configuration"] = {}
            else:
                attrs["hiring_engine"] = Job.HiringEngine.CONFIGURABLE
                attrs["hiring_profile_version"] = profile.version
                attrs["hiring_profile_snapshot"] = profile.snapshot()
                attrs["application_configuration"] = attrs.get(
                    "application_configuration", _profile_application_configuration(profile)
                )
                attrs["eligibility_requirements"] = attrs.get(
                    "eligibility_requirements", _profile_eligibility_requirements(profile)
                )
                attrs["workflow_configuration"] = attrs.get(
                    "workflow_configuration", _profile_workflow_configuration(profile)
                )

        work_sample_configuration = attrs.get(
            "work_sample_configuration",
            getattr(self.instance, "work_sample_configuration", {}) or {},
        )
        if work_sample_configuration.get("enabled") and not _profile_supports_work_sample(profile):
            raise serializers.ValidationError({
                "work_sample_configuration": "The selected hiring profile does not support a written work sample."
            })
        scenario_configuration = attrs.get(
            "scenario_configuration",
            getattr(self.instance, "scenario_configuration", {}) or {},
        )
        if scenario_configuration.get("enabled") and not _profile_supports_scenario(profile):
            raise serializers.ValidationError({
                "scenario_configuration": "The selected hiring profile does not support a written scenario."
            })
        practical_assessment_configuration = attrs.get(
            "practical_assessment_configuration",
            getattr(self.instance, "practical_assessment_configuration", {}) or {},
        )
        if practical_assessment_configuration.get("enabled") and not _profile_supports_practical_assessment(profile):
            raise serializers.ValidationError({
                "practical_assessment_configuration": "The selected hiring profile does not support an observed practical assessment."
            })
        workflow_configuration = attrs.get(
            "workflow_configuration",
            getattr(self.instance, "workflow_configuration", {}) or {},
        )
        if practical_assessment_configuration.get("enabled") and "practical" not in _normalise_workflow_configuration(
            workflow_configuration
        )["stages"]:
            raise serializers.ValidationError({
                "workflow_configuration": "Include the practical stage when an observed practical assessment is enabled."
            })

        work_mode = attrs.get("work_mode", getattr(self.instance, "work_mode", "") or "")
        country = attrs.get("country", getattr(self.instance, "country", "") or "")
        attrs["location"] = _derive_job_location(work_mode, country)

        return attrs

    def _create_related_objects(self, job, assessment_questions, interview_slots):
        if assessment_questions:
            template = JobAssessmentTemplate.objects.create(
                job=job, status=JobAssessmentTemplate.Status.READY
            )
            for section_order, section_data in enumerate(assessment_questions):
                section = JobAssessmentTemplateSection.objects.create(
                    template=template,
                    name=section_data.get("category") or f"Category {section_order + 1}",
                    order=section_order,
                )
                for question_order, question in enumerate(section_data.get("questions", [])):
                    JobAssessmentTemplateQuestion.objects.create(
                        section=section,
                        question=question["question"],
                        options=question["options"],
                        correct_option_index=question["correct_option_index"],
                        is_ai_generated=question.get("is_ai_generated", True),
                        order=question_order,
                    )

        for slot in interview_slots:
            JobInterviewAvailabilitySlot.objects.create(
                job=job,
                date=slot["date"],
                start_time=slot["start_time"],
                end_time=slot["end_time"],
            )

    def create(self, validated_data):
        assessment_questions = validated_data.pop("assessment_questions", []) or []
        interview_slots = validated_data.pop("interview_slots", []) or []

        with transaction.atomic():
            job = super().create(validated_data)
            self._create_related_objects(job, assessment_questions, interview_slots)

        return job

    def update(self, instance, validated_data):
        """Used when publishing a DRAFT job (see JobListCreateView.create) --
        the draft row already exists, so publishing updates it in place
        rather than creating a second row. A draft never has assessment
        questions/interview slots yet (the draft-autosave endpoint only
        touches flat Job fields), so this is effectively their first
        creation, same as the create() path."""
        assessment_questions = validated_data.pop("assessment_questions", []) or []
        interview_slots = validated_data.pop("interview_slots", []) or []

        with transaction.atomic():
            job = super().update(instance, validated_data)
            self._create_related_objects(job, assessment_questions, interview_slots)

        return job


class JobDraftSerializer(serializers.ModelSerializer):
    """Loosely-validated serializer for the job-creation wizard's
    auto-save-as-you-go draft -- just stores whatever the recruiter has
    filled in so far as opaque JSON, no field-level validation, since a
    draft is by definition incomplete. Real validation happens at publish
    time via JobSerializer."""

    class Meta:
        model = Job
        fields = ("id", "draft_data", "job_status", "last_updated")
        read_only_fields = ("id", "job_status", "last_updated")


class JobInterviewAvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobInterviewAvailabilitySlot
        fields = ("id", "job", "date", "start_time", "end_time", "is_claimed")
        read_only_fields = fields


class JobUpdateSerializer(serializers.ModelSerializer):
    job_status = serializers.ChoiceField(choices=Job.JobStatus.choices, required=False)
    role_title = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    screening_threshold = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=100
    )
    assessment_time_limit = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    passing_grade = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=100
    )
    # Same 0-100 bound as the assessment pass mark -- an AI interview score
    # outside that range could never be met (or could never be missed).
    ai_interview_pass_mark = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=100
    )
    interview_duration_minutes = serializers.IntegerField(
        required=False, allow_null=True, min_value=5, max_value=480
    )
    # Write-only, same shape as JobSerializer's -- edit-wizard equivalent of
    # the create-wizard's final submit. Omitted entirely (not present in the
    # request body) means "leave as-is"; see update() below.
    assessment_questions = serializers.JSONField(write_only=True, required=False)
    interview_slots = serializers.JSONField(write_only=True, required=False)
    hiring_profile = serializers.SerializerMethodField(read_only=True)
    # Publishing captures this form contract. Editing it after candidates
    # have started could invalidate an active attempt, so the initial release
    # exposes it for review but only permits configuration at publish time.
    application_configuration = serializers.JSONField(read_only=True)
    eligibility_requirements = serializers.JSONField(read_only=True)
    work_sample_configuration = serializers.JSONField(read_only=True)
    scenario_configuration = serializers.JSONField(read_only=True)
    practical_assessment_configuration = serializers.JSONField(read_only=True)
    workflow_configuration = serializers.JSONField(read_only=True)

    class Meta:
        model = Job
        fields = (
            "id",
            "public_id",
            "title",
            "role",
            "role_title",
            "hiring_engine",
            "hiring_profile",
            "hiring_profile_version",
            "application_configuration",
            "eligibility_requirements",
            "work_sample_configuration",
            "scenario_configuration",
            "practical_assessment_configuration",
            "workflow_configuration",
            "job_status",
            "job_type",
            "job_level",
            "location",
            "role_category",
            "industry",
            "work_mode",
            "country",
            "experience",
            "salary_duration",
            "payment_currency",
            "payment_range_usd",
            "payment_range_ngn",
            "about_company",
            "job_requirement",
            "description",
            "hiring_type",
            "screening_threshold",
            "assessment_time_limit",
            "passing_grade",
            "assessment_questions",
            "interview_slots",
            "ai_interview_enabled",
            "ai_interview_duration_minutes",
            "ai_interview_questions_count",
            "ai_interview_window_hours",
            "ai_interview_pass_mark",
            "interview_type",
            "interview_duration_minutes",
            "interview_meeting_url",
            "proctoring_enabled",
            "require_fullscreen",
            "require_webcam",
            "webcam_snapshots_enabled",
            "snapshot_interval_seconds",
            "max_tab_switches_before_warning",
            "max_tab_switches_before_termination",
            "copy_paste_blocked",
            "right_click_blocked",
            "devtools_detection_enabled",
            "force_submit_on_critical_violation",
        )
        read_only_fields = (
            "id",
            "public_id",
            "role_title",
            "hiring_engine",
            "hiring_profile",
            "hiring_profile_version",
            "application_configuration",
            "eligibility_requirements",
        )

    def validate_job_status(self, value):
        if value not in [
            Job.JobStatus.ACTIVE,
            Job.JobStatus.ON_HOLD,
            Job.JobStatus.HIRED,
            Job.JobStatus.EXPIRED
        ]:
            raise serializers.ValidationError("Invalid job status")
        return value

    def validate(self, attrs):
        # location is derived, not recruiter-set -- only recompute it when
        # this partial update actually touches one of its inputs.
        if "work_mode" in attrs or "country" in attrs:
            work_mode = attrs.get("work_mode", getattr(self.instance, "work_mode", "") or "")
            country = attrs.get("country", getattr(self.instance, "country", "") or "")
            attrs["location"] = _derive_job_location(work_mode, country)

        if "interview_type" in attrs or "interview_meeting_url" in attrs:
            _validate_interview_type(attrs, self.instance)
        return attrs

    def get_role_title(self, obj):
        return obj.role or ""

    def get_hiring_profile(self, obj):
        return _hiring_profile_summary(obj)

    def get_title(self, obj):
        return obj.role or ""

    def _replace_assessment_template(self, job, assessment_questions):
        """Wholesale-replaces the job's JobAssessmentTemplate. Safe to do
        even for a job with existing candidates -- send_assessment_link
        deep-clones this template into a per-application GeneralSkillAssessment
        row at invite time (see its docstring), so already-created candidate
        assessments are independent copies, never retroactively affected by
        editing the template afterwards."""
        JobAssessmentTemplate.objects.filter(job=job).delete()
        if not assessment_questions:
            return
        template = JobAssessmentTemplate.objects.create(
            job=job, status=JobAssessmentTemplate.Status.READY
        )
        for section_order, section_data in enumerate(assessment_questions):
            section = JobAssessmentTemplateSection.objects.create(
                template=template,
                name=section_data.get("category") or f"Category {section_order + 1}",
                order=section_order,
            )
            for question_order, question in enumerate(section_data.get("questions", [])):
                JobAssessmentTemplateQuestion.objects.create(
                    section=section,
                    question=question["question"],
                    options=question["options"],
                    correct_option_index=question["correct_option_index"],
                    is_ai_generated=question.get("is_ai_generated", True),
                    order=question_order,
                )

    def _replace_unclaimed_interview_slots(self, job, interview_slots):
        """Replaces only the still-unclaimed slots -- a slot a candidate has
        already booked (is_claimed=True) is never touched/deleted by an
        edit, since that would silently cancel a confirmed interview."""
        JobInterviewAvailabilitySlot.objects.filter(job=job, is_claimed=False).delete()
        for slot in interview_slots:
            JobInterviewAvailabilitySlot.objects.create(
                job=job,
                date=slot["date"],
                start_time=slot["start_time"],
                end_time=slot["end_time"],
            )

    def update(self, instance, validated_data):
        # Popped (not left for super().update()) regardless of presence --
        # neither is a real Job model field. Only acted on when the key was
        # actually present in the request body (sentinel default of "unset"
        # via pop(..., _UNSET) below) -- omitting the key entirely means
        # "leave the existing template/slots as they are", matching every
        # other optional field's partial-update semantics here.
        _UNSET = object()
        assessment_questions = validated_data.pop("assessment_questions", _UNSET)
        interview_slots = validated_data.pop("interview_slots", _UNSET)

        with transaction.atomic():
            job = super().update(instance, validated_data)
            if assessment_questions is not _UNSET:
                self._replace_assessment_template(job, assessment_questions or [])
            if interview_slots is not _UNSET:
                self._replace_unclaimed_interview_slots(job, interview_slots or [])

        return job



class ApplicationEligibilityCheckSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationEligibilityCheck
        fields = (
            "id",
            "requirement_code",
            "requirement_label",
            "requirement_description",
            "is_required",
            "declaration",
            "status",
            "reviewer_name",
            "reviewer_reason",
            "reviewed_at",
        )
        read_only_fields = fields

    def get_reviewer_name(self, obj):
        if not obj.reviewer_id:
            return None
        return obj.reviewer.get_full_name().strip() or obj.reviewer.email


class ApplicationEligibilityCheckReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(
            ApplicationEligibilityCheck.Status.PASS,
            ApplicationEligibilityCheck.Status.FAIL,
            ApplicationEligibilityCheck.Status.NEEDS_REVIEW,
            ApplicationEligibilityCheck.Status.NOT_APPLICABLE,
        )
    )
    reason = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["status"] in {
            ApplicationEligibilityCheck.Status.FAIL,
            ApplicationEligibilityCheck.Status.NEEDS_REVIEW,
        } and not attrs.get("reason", "").strip():
            raise serializers.ValidationError({"reason": "Add a reason for a failed or unresolved requirement."})
        return attrs

    def update(self, instance, validated_data):
        return review_application_eligibility_check(
            instance,
            status=validated_data["status"],
            reviewer=self.context["request"].user,
            reason=validated_data.get("reason", ""),
        )


def _work_sample_weighted_score(scores):
    """Return a percentage score from stored 0–5 ratings, or None if blank."""
    scores = list(scores)
    if not scores:
        return None
    return round(sum((score.score / 5) * score.weight for score in scores), 1)


class ApplicationWorkSampleScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationWorkSampleScore
        fields = (
            "criterion_code",
            "criterion_label",
            "criterion_description",
            "weight",
            "score",
            "reviewer_note",
        )
        read_only_fields = fields


class ApplicationWorkSampleSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    scores = ApplicationWorkSampleScoreSerializer(many=True, read_only=True)
    weighted_score = serializers.SerializerMethodField()

    def get_reviewer_name(self, obj):
        if not obj.reviewer_id:
            return None
        return obj.reviewer.get_full_name() or obj.reviewer.email

    def get_weighted_score(self, obj):
        return _work_sample_weighted_score(obj.scores.all())

    class Meta:
        model = ApplicationWorkSample
        # Deliberately excludes `file`: sample storage remains private and is
        # only opened by the permission-checked download endpoint.
        fields = (
            "id",
            "original_filename",
            "content_type",
            "candidate_note",
            "status",
            "scan_status",
            "reviewer_name",
            "reviewer_reason",
            "reviewed_at",
            "scores",
            "weighted_score",
            "created_at",
        )
        read_only_fields = fields


class ApplicationWorkSampleReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(
            ApplicationWorkSample.Status.PASS,
            ApplicationWorkSample.Status.FAIL,
            ApplicationWorkSample.Status.NEEDS_REVIEW,
        )
    )
    reviewer_reason = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    scores = serializers.DictField(
        child=serializers.IntegerField(min_value=0, max_value=5),
        required=False,
    )
    score_notes = serializers.DictField(
        child=serializers.CharField(max_length=1000, allow_blank=True),
        required=False,
    )

    def _criteria(self):
        rubric = self.instance.application.job.get_work_sample_configuration().get("rubric", {})
        criteria = rubric.get("criteria", [])
        return rubric, criteria if isinstance(criteria, list) else []

    def validate(self, attrs):
        status = attrs["status"]
        reason = (attrs.get("reviewer_reason") or "").strip()
        if (
            isinstance(self.instance, ApplicationWorkSample)
            and status == ApplicationWorkSample.Status.PASS
            and self.instance.scan_status != ApplicationWorkSample.ScanStatus.CLEAN
        ):
            raise serializers.ValidationError({
                "status": "This work sample cannot be accepted until it has passed the malware scan."
            })
        if status in {ApplicationWorkSample.Status.FAIL, ApplicationWorkSample.Status.NEEDS_REVIEW} and not reason:
            raise serializers.ValidationError({"reviewer_reason": "Add a reason for this review decision."})

        rubric, criteria = self._criteria()
        scores = attrs.get("scores")
        score_notes = attrs.get("score_notes", {})
        if not criteria:
            if scores is not None or score_notes:
                raise serializers.ValidationError({"scores": "This work sample does not have a scorecard."})
            return attrs

        criterion_codes = [criterion.get("code") for criterion in criteria]
        if len(criterion_codes) != len(set(criterion_codes)) or not all(criterion_codes):
            raise serializers.ValidationError("This job's work-sample scorecard is invalid.")
        if scores is None and score_notes:
            raise serializers.ValidationError({"score_notes": "Add score notes together with criterion scores."})
        if scores is not None:
            supplied_codes = set(scores)
            expected_codes = set(criterion_codes)
            if supplied_codes != expected_codes:
                raise serializers.ValidationError({
                    "scores": "Score every criterion in this job's scorecard exactly once."
                })
            unknown_note_codes = set(score_notes) - expected_codes
            if unknown_note_codes:
                raise serializers.ValidationError({"score_notes": "Notes can only be added to scorecard criteria."})

            weighted_score = round(sum(
                (scores[criterion["code"]] / 5) * criterion["weight"]
                for criterion in criteria
            ), 1)
            attrs["weighted_score"] = weighted_score
            if status == ApplicationWorkSample.Status.PASS and weighted_score < rubric.get("passing_score", WORK_SAMPLE_PASSING_SCORE_DEFAULT):
                raise serializers.ValidationError({
                    "status": (
                        f"The weighted score is {weighted_score}%, below this job's "
                        f"{rubric.get('passing_score', WORK_SAMPLE_PASSING_SCORE_DEFAULT)}% passing score."
                    )
                })
        elif status in {ApplicationWorkSample.Status.PASS, ApplicationWorkSample.Status.FAIL}:
            raise serializers.ValidationError({"scores": "Score every criterion before recording a final decision."})
        return attrs

    def update(self, instance, validated_data):
        validated_data.pop("weighted_score", None)
        scores = validated_data.pop("scores", None)
        score_notes = validated_data.pop("score_notes", {})
        _rubric, criteria = self._criteria()
        with transaction.atomic():
            instance.status = validated_data["status"]
            instance.reviewer_reason = (validated_data.get("reviewer_reason") or "").strip()
            instance.reviewer = self.context["request"].user
            instance.reviewed_at = timezone.now()
            instance.save(update_fields=("status", "reviewer_reason", "reviewer", "reviewed_at", "updated_at"))
            if scores is not None:
                instance.scores.all().delete()
                ApplicationWorkSampleScore.objects.bulk_create([
                    ApplicationWorkSampleScore(
                        sample=instance,
                        criterion_code=criterion["code"],
                        criterion_label=criterion["label"],
                        criterion_description=criterion.get("description", ""),
                        weight=criterion["weight"],
                        score=scores[criterion["code"]],
                        reviewer_note=score_notes.get(criterion["code"], "").strip(),
                    )
                    for criterion in criteria
                ])
        return instance


class ApplicationScenarioScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationScenarioScore
        fields = (
            "criterion_code",
            "criterion_label",
            "criterion_description",
            "weight",
            "score",
            "reviewer_note",
        )
        read_only_fields = fields


class ApplicationScenarioResponseSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    scores = ApplicationScenarioScoreSerializer(many=True, read_only=True)
    weighted_score = serializers.SerializerMethodField()

    def get_reviewer_name(self, obj):
        if not obj.reviewer_id:
            return None
        return obj.reviewer.get_full_name() or obj.reviewer.email

    def get_weighted_score(self, obj):
        return _work_sample_weighted_score(obj.scores.all())

    class Meta:
        model = ApplicationScenarioResponse
        fields = (
            "id",
            "response",
            "status",
            "reviewer_name",
            "reviewer_reason",
            "reviewed_at",
            "scores",
            "weighted_score",
            "created_at",
        )
        read_only_fields = fields


class ApplicationScenarioResponseReviewSerializer(ApplicationWorkSampleReviewSerializer):
    """Scores a scenario with the same rubric contract as a work sample."""

    def _criteria(self):
        rubric = self.instance.application.job.get_scenario_configuration().get("rubric", {})
        criteria = rubric.get("criteria", [])
        return rubric, criteria if isinstance(criteria, list) else []

    def update(self, instance, validated_data):
        validated_data.pop("weighted_score", None)
        scores = validated_data.pop("scores", None)
        score_notes = validated_data.pop("score_notes", {})
        _rubric, criteria = self._criteria()
        with transaction.atomic():
            instance.status = validated_data["status"]
            instance.reviewer_reason = (validated_data.get("reviewer_reason") or "").strip()
            instance.reviewer = self.context["request"].user
            instance.reviewed_at = timezone.now()
            instance.save(update_fields=("status", "reviewer_reason", "reviewer", "reviewed_at", "updated_at"))
            if scores is not None:
                instance.scores.all().delete()
                ApplicationScenarioScore.objects.bulk_create([
                    ApplicationScenarioScore(
                        scenario_response=instance,
                        criterion_code=criterion["code"],
                        criterion_label=criterion["label"],
                        criterion_description=criterion.get("description", ""),
                        weight=criterion["weight"],
                        score=scores[criterion["code"]],
                        reviewer_note=score_notes.get(criterion["code"], "").strip(),
                    )
                    for criterion in criteria
                ])
        return instance


class JobPracticalAssessmentSlotSerializer(serializers.ModelSerializer):
    """A recruiter-managed, capacity-controlled in-person assessment slot."""

    scheduled_count = serializers.SerializerMethodField()

    def get_scheduled_count(self, obj):
        if hasattr(obj, "scheduled_count"):
            return obj.scheduled_count
        return obj.appointments.filter(
            status=ApplicationPracticalAssessment.Status.SCHEDULED
        ).count()

    def validate(self, attrs):
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts_at and starts_at <= timezone.now():
            raise serializers.ValidationError({"starts_at": "Choose a future practical-assessment slot."})
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({"ends_at": "The slot must end after it starts."})
        return attrs

    class Meta:
        model = JobPracticalAssessmentSlot
        fields = (
            "id",
            "starts_at",
            "ends_at",
            "location",
            "capacity",
            "instructions",
            "is_active",
            "scheduled_count",
            "created_at",
        )
        read_only_fields = ("id", "scheduled_count", "created_at")


class ApplicationPracticalAssessmentSerializer(serializers.ModelSerializer):
    """An observed assessment record. It never represents a credential."""

    slot = JobPracticalAssessmentSlotSerializer(read_only=True)
    assessor_name = serializers.SerializerMethodField()
    weighted_score = serializers.SerializerMethodField()

    def get_assessor_name(self, obj):
        if not obj.assessor_id:
            return None
        return obj.assessor.get_full_name().strip() or obj.assessor.email

    def get_weighted_score(self, obj):
        scorecard = obj.scorecard if isinstance(obj.scorecard, list) else []
        scored_criteria = [
            criterion for criterion in scorecard
            if isinstance(criterion, dict) and isinstance(criterion.get("score"), int)
        ]
        if not scored_criteria:
            return None
        return round(sum((criterion["score"] / 5) * criterion["weight"] for criterion in scored_criteria), 1)

    class Meta:
        model = ApplicationPracticalAssessment
        fields = (
            "id",
            "attempt_number",
            "slot",
            "status",
            "outcome",
            "rubric_snapshot",
            "scorecard",
            "weighted_score",
            "assessor_name",
            "observations",
            "critical_failure",
            "critical_failure_reason",
            "completed_at",
            "booked_by",
            "status_reason",
            "status_changed_by",
            "status_changed_at",
            "policy_override_reason",
            "created_at",
        )
        read_only_fields = fields


class ApplicationPracticalAssessmentAssignSerializer(serializers.Serializer):
    """Books a candidate into one of the job's practical-assessment slots.

    The hiring team is held to the job's attempt and retest policy unless it
    records an ``override_reason``, which is stored on the appointment.
    """

    slot_id = serializers.PrimaryKeyRelatedField(
        queryset=JobPracticalAssessmentSlot.objects.select_related("job")
    )
    override_reason = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, attrs):
        application = self.context["application"]
        slot = attrs["slot_id"]
        configuration = application.job.get_practical_assessment_configuration()
        if not configuration["enabled"]:
            raise serializers.ValidationError({"slot_id": "This job does not have a practical assessment enabled."})
        if slot.job_id != application.job_id:
            raise serializers.ValidationError({"slot_id": "Choose a slot for this application’s job."})
        if not slot.is_active or slot.starts_at <= timezone.now():
            raise serializers.ValidationError({"slot_id": "Choose an active future practical-assessment slot."})
        return attrs

    def create(self, validated_data):
        return book_slot(
            self.context["application"].id,
            validated_data["slot_id"].id,
            booked_by=ApplicationPracticalAssessment.BookedBy.RECRUITER,
            override_reason=validated_data.get("override_reason", ""),
        )


class ApplicationPracticalAssessmentReviewSerializer(serializers.Serializer):
    """Records the assessor’s scorecard and any safety-critical failure."""

    outcome = serializers.ChoiceField(
        choices=(
            ApplicationPracticalAssessment.Outcome.PASS,
            ApplicationPracticalAssessment.Outcome.FAIL,
        )
    )
    observations = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    critical_failure = serializers.BooleanField(required=False, default=False)
    critical_failure_reason = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    scores = serializers.DictField(
        child=serializers.IntegerField(min_value=0, max_value=5),
        required=False,
    )
    score_notes = serializers.DictField(
        child=serializers.CharField(max_length=1000, allow_blank=True),
        required=False,
    )

    def _rubric(self):
        rubric = self.instance.rubric_snapshot if isinstance(self.instance.rubric_snapshot, dict) else {}
        criteria = rubric.get("criteria", [])
        return rubric, criteria if isinstance(criteria, list) else []

    def validate(self, attrs):
        if self.instance.status != ApplicationPracticalAssessment.Status.SCHEDULED:
            raise serializers.ValidationError("Only a scheduled practical assessment can be completed.")

        outcome = attrs["outcome"]
        observations = (attrs.get("observations") or "").strip()
        critical_failure = attrs.get("critical_failure", False)
        critical_failure_reason = (attrs.get("critical_failure_reason") or "").strip()
        if critical_failure:
            if outcome != ApplicationPracticalAssessment.Outcome.FAIL:
                raise serializers.ValidationError({"outcome": "A critical failure must result in a failed assessment."})
            if not critical_failure_reason:
                raise serializers.ValidationError({"critical_failure_reason": "Record why this was a critical failure."})
        elif critical_failure_reason:
            raise serializers.ValidationError({"critical_failure_reason": "Only record a critical-failure reason when a critical failure occurred."})
        if outcome == ApplicationPracticalAssessment.Outcome.FAIL and not (observations or critical_failure_reason):
            raise serializers.ValidationError({"observations": "Record the assessor’s observations for a failed assessment."})

        rubric, criteria = self._rubric()
        scores = attrs.get("scores")
        score_notes = attrs.get("score_notes", {})
        if not criteria:
            if scores is not None or score_notes:
                raise serializers.ValidationError({"scores": "This practical assessment does not have a scorecard."})
            return attrs

        criterion_codes = [criterion.get("code") for criterion in criteria]
        if len(criterion_codes) != len(set(criterion_codes)) or not all(criterion_codes):
            raise serializers.ValidationError("This practical assessment’s published scorecard is invalid.")
        expected_codes = set(criterion_codes)
        if scores is None:
            if score_notes:
                raise serializers.ValidationError({"score_notes": "Add score notes together with criterion scores."})
            if not critical_failure:
                raise serializers.ValidationError({"scores": "Score every criterion before recording this decision."})
            return attrs
        if set(scores) != expected_codes:
            raise serializers.ValidationError({"scores": "Score every criterion in this assessment’s scorecard exactly once."})
        if set(score_notes) - expected_codes:
            raise serializers.ValidationError({"score_notes": "Notes can only be added to scorecard criteria."})

        weighted_score = round(sum(
            (scores[criterion["code"]] / 5) * criterion["weight"]
            for criterion in criteria
        ), 1)
        attrs["weighted_score"] = weighted_score
        if outcome == ApplicationPracticalAssessment.Outcome.PASS and weighted_score < rubric.get(
            "passing_score", WORK_SAMPLE_PASSING_SCORE_DEFAULT
        ):
            raise serializers.ValidationError({
                "outcome": (
                    f"The weighted score is {weighted_score}%, below this assessment’s "
                    f"{rubric.get('passing_score', WORK_SAMPLE_PASSING_SCORE_DEFAULT)}% passing score."
                )
            })
        return attrs

    def update(self, instance, validated_data):
        scores = validated_data.pop("scores", None)
        score_notes = validated_data.pop("score_notes", {})
        validated_data.pop("weighted_score", None)
        _rubric, criteria = self._rubric()
        scorecard = []
        if scores is not None:
            scorecard = [
                {
                    "code": criterion["code"],
                    "label": criterion["label"],
                    "description": criterion.get("description", ""),
                    "weight": criterion["weight"],
                    "score": scores[criterion["code"]],
                    "assessor_note": score_notes.get(criterion["code"], "").strip(),
                }
                for criterion in criteria
            ]
        instance.status = ApplicationPracticalAssessment.Status.COMPLETED
        instance.outcome = validated_data["outcome"]
        instance.observations = (validated_data.get("observations") or "").strip()
        instance.critical_failure = validated_data.get("critical_failure", False)
        instance.critical_failure_reason = (validated_data.get("critical_failure_reason") or "").strip()
        instance.scorecard = scorecard
        instance.assessor = self.context["request"].user
        instance.completed_at = timezone.now()
        instance.save(
            update_fields=(
                "status", "outcome", "observations", "critical_failure",
                "critical_failure_reason", "scorecard", "assessor", "completed_at", "updated_at",
            )
        )
        return instance


class ApplicationReadinessSerializer(serializers.ModelSerializer):
    """Company-only readiness record for a candidate who accepted an offer."""

    candidate_name = serializers.ReadOnlyField(source="candidate_full_name")
    candidate_email = serializers.ReadOnlyField()
    job_title = serializers.ReadOnlyField(source="job.title")
    updated_by_name = serializers.SerializerMethodField()
    blocker_detail = serializers.SerializerMethodField()

    def get_updated_by_name(self, obj):
        if not obj.readiness_updated_by_id:
            return None
        return obj.readiness_updated_by.get_full_name().strip() or obj.readiness_updated_by.email

    def get_blocker_detail(self, obj):
        if obj.readiness_status in {
            JobApplication.ReadinessStatus.READY_TO_START,
            JobApplication.ReadinessStatus.STARTED,
        }:
            return ""
        return eligibility_progression_block_detail(obj)

    class Meta:
        model = JobApplication
        fields = (
            "id",
            "candidate_name",
            "candidate_email",
            "job_title",
            "readiness_status",
            "readiness_target_start_date",
            "readiness_note",
            "readiness_updated_at",
            "readiness_started_at",
            "updated_by_name",
            "blocker_detail",
        )
        read_only_fields = fields


class ApplicationReadinessUpdateSerializer(serializers.Serializer):
    """Moves an accepted candidate through company-controlled readiness."""

    readiness_status = serializers.ChoiceField(
        choices=(
            JobApplication.ReadinessStatus.CHECKS_OUTSTANDING,
            JobApplication.ReadinessStatus.READY_TO_START,
            JobApplication.ReadinessStatus.STARTED,
        )
    )
    readiness_target_start_date = serializers.DateField(required=False, allow_null=True)
    readiness_note = serializers.CharField(max_length=1200, required=False, allow_blank=True)

    def validate(self, attrs):
        application = self.instance
        status = attrs["readiness_status"]
        if application.status != JobApplication.JobApplicationStatus.OFFER_ACCEPTED:
            raise serializers.ValidationError(
                "Only a candidate who has accepted an offer can enter the readiness process."
            )
        if application.readiness_status == JobApplication.ReadinessStatus.STARTED:
            raise serializers.ValidationError("A recorded start is final in this workflow.")

        target_start_date = attrs.get(
            "readiness_target_start_date", application.readiness_target_start_date
        )
        note = (attrs.get("readiness_note") or "").strip()
        if status in {
            JobApplication.ReadinessStatus.READY_TO_START,
            JobApplication.ReadinessStatus.STARTED,
        } and not target_start_date:
            raise serializers.ValidationError({
                "readiness_target_start_date": "Set the agreed start date before marking this candidate ready or started."
            })
        if status == JobApplication.ReadinessStatus.CHECKS_OUTSTANDING and not (note or application.readiness_note):
            raise serializers.ValidationError({
                "readiness_note": "Record the next readiness action or outstanding item."
            })
        if status == JobApplication.ReadinessStatus.READY_TO_START:
            blocker = eligibility_progression_block_detail(application)
            if blocker:
                raise serializers.ValidationError({"readiness_status": blocker})
        if status == JobApplication.ReadinessStatus.STARTED:
            if application.readiness_status != JobApplication.ReadinessStatus.READY_TO_START:
                raise serializers.ValidationError({
                    "readiness_status": "Mark the candidate ready to start before recording an actual start."
                })
            blocker = eligibility_progression_block_detail(application)
            if blocker:
                raise serializers.ValidationError({"readiness_status": blocker})
        return attrs

    def update(self, instance, validated_data):
        next_status = validated_data["readiness_status"]
        instance.readiness_status = next_status
        if "readiness_target_start_date" in validated_data:
            instance.readiness_target_start_date = validated_data["readiness_target_start_date"]
        if "readiness_note" in validated_data:
            instance.readiness_note = (validated_data["readiness_note"] or "").strip()
        instance.readiness_updated_by = self.context["request"].user
        instance.readiness_updated_at = timezone.now()
        if next_status == JobApplication.ReadinessStatus.STARTED:
            instance.readiness_started_at = instance.readiness_started_at or timezone.now()
        instance.save(
            update_fields=(
                "readiness_status",
                "readiness_target_start_date",
                "readiness_note",
                "readiness_updated_by",
                "readiness_updated_at",
                "readiness_started_at",
                "last_updated",
            )
        )
        return instance


class JobApplicationSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    applicant = serializers.SerializerMethodField()
    company_name = serializers.ReadOnlyField(source="job.company.company_name")
    company_logo = serializers.ReadOnlyField(source="job.company.get_logo_url")
    resume = serializers.FileField(required=False, write_only=True)
    cover_letter = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    eligibility_declarations = serializers.JSONField(required=False, write_only=True)
    eligibility_checks = ApplicationEligibilityCheckSerializer(many=True, read_only=True)
    work_samples = ApplicationWorkSampleSerializer(many=True, read_only=True)
    scenario_response = ApplicationScenarioResponseSerializer(read_only=True)
    practical_assessments = ApplicationPracticalAssessmentSerializer(many=True, read_only=True)
    workflow_stage = serializers.SerializerMethodField()

    def get_workflow_stage(self, obj):
        return current_workflow_stage(obj)

    class Meta:
        model = JobApplication
        fields = (
            "id",
            "applicant",
            "job",
            "company_name",
            "company_logo",
            "applied_date",
            "cover_letter",
            "status",
            "readiness_status",
            "readiness_target_start_date",
            "readiness_updated_at",
            "readiness_started_at",
            "created",
            "last_updated",
            "resume",
            "eligibility_declarations",
            "eligibility_checks",
            "work_samples",
            "scenario_response",
            "practical_assessments",
            "workflow_stage",
        )

    def get_applicant(self, obj):
        """Same shape ApplicantDetailSerializer produces for a real
        TalentProfile, synthesized from the guest's submitted details when
        this application has none -- so recruiter-facing UI built against
        that shape (e.g. TalentApplicationCard.tsx, which reads
        application.applicant.name/resume/... with no null guards) keeps
        working unchanged for guest applicants instead of getting a bare
        null it was never written to handle."""
        if obj.applicant_id:
            return ApplicantDetailSerializer(obj.applicant, context=self.context).data
        request = self.context.get("request")
        resume_url = None
        if obj.guest_resume:
            resume_url = (
                request.build_absolute_uri(obj.guest_resume.url) if request else obj.guest_resume.url
            )
        return {
            "id": None,
            "name": obj.guest_full_name,
            "email": obj.guest_email,
            "country": "",
            "phone_number": obj.guest_phone_number,
            "resume": resume_url,
            "profile_pic": None,
            "experience_level": "",
            "role": None,
            "has_passed_assessment": False,
            "verified_skillsets": [],
            "created_at": obj.applied_date,
            "updated_at": obj.last_updated,
            "is_guest": True,
        }

    def validate_resume(self, value):
        if value:
            # Check if the file size is within limits
            if value.size > settings.UPLOAD_FILE_MAX_SIZE:
                raise serializers.ValidationError(
                    "Resume file size too large. Max size is 1MB."
                )

            # Get the file extension and check if it's allowed
            file_extension = value.name.split(".")[-1].lower()
            allowed_extensions = settings.WHITELISTED_RESUME_FORMAT.keys()
            if file_extension not in allowed_extensions:
                raise serializers.ValidationError(f"Only {', '.join(allowed_extensions)} files are allowed.")

        return value

    def validate_eligibility_declarations(self, value):
        if not isinstance(value, dict) or any(not isinstance(declaration, bool) for declaration in value.values()):
            raise serializers.ValidationError("Eligibility declarations must be a map of requirement codes to true or false.")
        return value

    def validate(self, attrs):
        job = self.context.get('job')
        if job and job.job_status != Job.JobStatus.ACTIVE:
            status_display = dict(Job.JobStatus.choices)[job.job_status]
            raise serializers.ValidationError(
                f"This job is currently {status_display.lower()} and not accepting applications"
            )
        if job:
            try:
                attrs["eligibility_declarations"] = normalise_eligibility_declarations(
                    job.get_eligibility_requirements(),
                    attrs.get("eligibility_declarations", {}),
                )
            except ValueError as error:
                raise serializers.ValidationError({"eligibility_declarations": str(error)})
        return attrs

    def create(self, validated_data):
        resume = validated_data.pop('resume', None)
        cover_letter = validated_data.get('cover_letter', '')
        eligibility_declarations = validated_data.pop("eligibility_declarations", {})
        # Set is_external_application to False for normal applications
        validated_data['is_external_application'] = False
        application = super().create(validated_data)
        
        # Update talent's resume if provided
        if resume:
            talent_profile = application.applicant
            talent_profile.resume = resume
            talent_profile.save()

        # Update cover letter
        application.cover_letter = cover_letter
        application.save()
        sync_application_eligibility_checks(application, eligibility_declarations)

        return application


GUEST_APPLY_MAX_RESUME_SIZE = 5 * 1024 * 1024  # 5MB, per the no-login application form's own limit


class GuestJobApplicationSerializer(serializers.Serializer):
    """No-login job application: takes the candidate's details directly on
    the form (name/email/phone/LinkedIn/resume) and stores them straight on
    the JobApplication row (guest_full_name/guest_email/...) instead of
    assuming a logged-in TalentProfile already has them. Deliberately
    creates no CustomUser/TalentProfile at all -- applying as a guest must
    never create an account. See JobApplication.candidate_full_name/
    candidate_email/etc. and as_email_recipient() for how downstream code
    (resume screening, assessment invites, AI interviews, recruiter UI)
    reads a guest's identity in place of applicant.*."""

    full_name = serializers.CharField(max_length=255, allow_blank=False, trim_whitespace=True)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=30, allow_blank=False, trim_whitespace=True)
    linkedin_url = serializers.URLField(required=False, allow_blank=True)
    resume = serializers.FileField(required=False, allow_null=True)
    cover_letter = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    additional_info = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    work_sample = serializers.FileField(required=False, allow_null=True, write_only=True)
    work_sample_note = serializers.CharField(required=False, allow_blank=True, max_length=1000, write_only=True)
    scenario_response = serializers.CharField(required=False, allow_blank=True, max_length=SCENARIO_RESPONSE_MAX_LENGTH, write_only=True)
    eligibility_declarations = serializers.JSONField(required=False, write_only=True)
    terms_accepted = serializers.BooleanField()

    def validate_email(self, value):
        return value.strip().lower()

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError("You must agree to the Terms & Conditions and Privacy Policy.")
        return value

    def validate_eligibility_declarations(self, value):
        if not isinstance(value, dict) or any(not isinstance(declaration, bool) for declaration in value.values()):
            raise serializers.ValidationError("Eligibility declarations must be a map of requirement codes to true or false.")
        return value

    def validate_resume(self, value):
        if not value:
            return value
        if value.size > GUEST_APPLY_MAX_RESUME_SIZE:
            raise serializers.ValidationError("Resume file size too large. Max size is 5MB.")
        file_extension = value.name.split(".")[-1].lower()
        allowed_extensions = settings.WHITELISTED_RESUME_FORMAT.keys()
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(f"Only {', '.join(allowed_extensions)} files are allowed.")
        return value

    def validate_work_sample(self, value):
        return _validate_work_sample_file(value)

    def validate(self, attrs):
        job = self.context["job"]
        if job.job_status != Job.JobStatus.ACTIVE:
            status_display = dict(Job.JobStatus.choices)[job.job_status]
            raise serializers.ValidationError(
                f"This job is currently {status_display.lower()} and not accepting applications"
            )
        email = attrs.get("email", "").strip().lower()
        if JobApplication.objects.filter(job=job, applicant__isnull=True, guest_email__iexact=email).exists():
            raise serializers.ValidationError("You've already applied to this job.")
        # Also block a guest re-application from someone who already applied
        # to this job with a real account under the same email -- neither
        # unique constraint on JobApplication catches this (one row has
        # applicant set, the other doesn't), so without this check the
        # recruiter would see the same person twice and get billed twice
        # for the same candidate's resume screening/assessment.
        if JobApplication.objects.filter(job=job, applicant__user__email__iexact=email).exists():
            raise serializers.ValidationError(
                "You've already applied to this job with an account. Please log in to view your application."
            )

        configuration = job.get_application_configuration()
        required_values = {
            "resume": attrs.get("resume"),
            "linkedin": (attrs.get("linkedin_url") or "").strip(),
            "cover_letter": (attrs.get("cover_letter") or "").strip(),
            "additional_info": (attrs.get("additional_info") or "").strip(),
        }
        errors = {}
        for field, value in required_values.items():
            if configuration[field]["required"] and not value:
                label = {
                    "resume": "CV / resume",
                    "linkedin": "LinkedIn profile URL",
                    "cover_letter": "Cover letter",
                    "additional_info": configuration["additional_info"]["label"],
                }[field]
                errors["linkedin_url" if field == "linkedin" else field] = f"{label} is required for this job."
        if errors:
            raise serializers.ValidationError(errors)

        work_sample_configuration = job.get_work_sample_configuration()
        work_sample = attrs.get("work_sample")
        if work_sample_configuration["enabled"] and work_sample_configuration["required"] and not work_sample:
            raise serializers.ValidationError({"work_sample": "A work sample is required for this job."})
        if work_sample and not work_sample_configuration["enabled"]:
            raise serializers.ValidationError({"work_sample": "This job is not accepting work samples."})

        scenario_configuration = job.get_scenario_configuration()
        scenario_response = (attrs.get("scenario_response") or "").strip()
        if scenario_configuration["enabled"] and scenario_configuration["required"] and not scenario_response:
            raise serializers.ValidationError({"scenario_response": "A response to this scenario is required for this job."})
        if scenario_response and not scenario_configuration["enabled"]:
            raise serializers.ValidationError({"scenario_response": "This job is not accepting scenario responses."})
        attrs["scenario_response"] = scenario_response

        try:
            attrs["eligibility_declarations"] = normalise_eligibility_declarations(
                job.get_eligibility_requirements(),
                attrs.get("eligibility_declarations", {}),
            )
        except ValueError as error:
            raise serializers.ValidationError({"eligibility_declarations": str(error)})

        return attrs

    def create(self, validated_data):
        job = self.context["job"]
        eligibility_declarations = validated_data.pop("eligibility_declarations", {})
        work_sample = validated_data.pop("work_sample", None)
        work_sample_note = validated_data.pop("work_sample_note", "")
        scenario_response = validated_data.pop("scenario_response", "")
        application = JobApplication.objects.create(
            applicant=None,
            job=job,
            guest_full_name=validated_data["full_name"].strip(),
            guest_email=validated_data["email"],
            guest_phone_number=validated_data["phone_number"],
            guest_linkedin_url=validated_data.get("linkedin_url", ""),
            guest_resume=validated_data.get("resume"),
            cover_letter=validated_data.get("cover_letter", ""),
            additional_info=validated_data.get("additional_info", ""),
            is_external_application=False,
        )
        sync_application_eligibility_checks(application, eligibility_declarations)
        if work_sample:
            sample = ApplicationWorkSample.objects.create(
                application=application,
                file=work_sample,
                original_filename=work_sample.name[:255],
                content_type=(getattr(work_sample, "content_type", "") or "")[:120],
                candidate_note=work_sample_note.strip(),
            )
            from .tasks import scan_application_work_sample

            transaction.on_commit(lambda sample_id=sample.id: scan_application_work_sample.delay(sample_id))
        if scenario_response:
            ApplicationScenarioResponse.objects.create(
                application=application,
                response=scenario_response,
            )
        return application


class GuestJobApplicationResponseSerializer(serializers.ModelSerializer):
    """Confirmation-only response for the no-login apply endpoint -- never
    the full JobApplicationSerializer, since that includes the applicant's
    full profile (name, resume, verified skillsets, etc.). Since guest apply
    resolves an existing account by email with no proof of ownership, that
    would hand a stranger's real profile data back to whoever submitted
    the form."""

    class Meta:
        model = JobApplication
        fields = ("id", "job", "status", "applied_date", "created")
        read_only_fields = fields


class JobApplicationUpdateStatusSerializer(serializers.ModelSerializer):
    # You can only update the status of a job application.
    job = serializers.StringRelatedField(read_only=True)
    applicant = serializers.StringRelatedField(read_only=True)
    company = serializers.ReadOnlyField(source="job.company.company_name")
    status = serializers.ChoiceField(
        choices=JobApplication.JobApplicationStatus.choices
    )
    eligibility_checks = ApplicationEligibilityCheckSerializer(many=True, read_only=True)

    class Meta:
        model = JobApplication
        fields = (
            "id",
            "applicant",
            "job",
            "cover_letter",
            "company",
            "applied_date",
            "status",
            "created",
            "last_updated",
            "eligibility_checks",
        )
        read_only_fields = (
            "applicant",
            "job",
            "company",
            "applied_date",
            "cover_letter",
            "eligibility_checks",
        )


class JobTokenValidationSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate(self, value):
        try:
            job = Job.objects.get(
                apply_token=value,
            )
            if (job.external_apply_token_expires and timezone.now() > job.external_apply_token_expires):
                raise serializers.ValidationError("This job link has expired")
            return value
        
        except Job.DoesNotExist:
            raise serializers.ValidationError("Invalid Job token")


class ExternalJobApplicationSerializer(serializers.ModelSerializer):
    job_token = serializers.UUIDField(write_only=True)
    resume = serializers.FileField(required=False)
    eligibility_declarations = serializers.JSONField(required=False, write_only=True)
    cover_letter = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=2000,
        write_only=True)
    

    class Meta:
        model = JobApplication
        fields = ['id', 'applicant', 'job','job_token', 'resume', 'cover_letter', 'eligibility_declarations', 'status', 'applied_date', 'is_external_application', 'verification_prompted', 'verification_completed']
        read_only_fields = ['id', 'applicant', 'job', 'status', 'applied_date', 'is_external_application', 'verification_prompted', 'verification_completed']

    def validate(self, data):
        request = self.context.get('request')
        user = request.user

        if not user.is_authenticated:
            raise serializers.ValidationError("You must be logged in to apply.")

        try:
            job = Job.objects.get(
                    apply_token=data.pop('job_token'),
                )
            # Check if job is active
            if job.job_status != Job.JobStatus.ACTIVE:
                status_display = dict(Job.JobStatus.choices)[job.job_status]
                raise serializers.ValidationError(
                    f"This job is currently {status_display.lower()} and not accepting applications"
                )
            
            # Check if token is expired
            if (job.external_apply_token_expires and timezone.now() > job.external_apply_token_expires):
                raise serializers.ValidationError("This job link has expired")
            
            data['job'] = job
            try:
                data["eligibility_declarations"] = normalise_eligibility_declarations(
                    job.get_eligibility_requirements(),
                    data.get("eligibility_declarations", {}),
                )
            except ValueError as error:
                raise serializers.ValidationError({"eligibility_declarations": str(error)})
            return data

        except Job.DoesNotExist:
            raise serializers.ValidationError("Invalid job token or job not open to external applications")


            
    def create(self, validated_data):
        request = self.context.get('request')
        applicant = request.user.talentprofile if request and hasattr(request.user, 'talentprofile') else None

        if not applicant:
            raise serializers.ValidationError("User must be authenticated and have a talent profile")

        job = validated_data['job']

        if JobApplication.objects.filter(applicant=applicant, job=job).exists():
            raise serializers.ValidationError("You have already applied for this job.")

        resume = validated_data.pop('resume', None)
        cover_letter = validated_data.pop('cover_letter', '')
        eligibility_declarations = validated_data.pop("eligibility_declarations", {})

        if resume:
            # Update talent's resume if provided
            applicant.resume = resume
            applicant.save()

        verification_prompted = not job.external_skip_verification

        # Create job application with explicit cover letter
        application = JobApplication.objects.create(
            **validated_data,
            is_external_application=True,
            status=JobApplication.JobApplicationStatus.APPLIED,
            verification_prompted=verification_prompted,
            applicant=applicant,
            cover_letter=cover_letter
        )
        
        # Make sure the cover letter is saved
        if cover_letter:
            application.cover_letter = cover_letter
            application.save()

        sync_application_eligibility_checks(application, eligibility_declarations)
            
        return application


class JobApplicationVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = "__all__"

    def update(self, instance, validated_data):
        if not instance.is_external_application:
            raise serializers.ValidationError("Only external applications can update verification status")

        instance.verification_completed = validated_data.get(
                'verification_completed',
                instance.verification_completed
            )
        instance.save()
        return instance


####### Portfolio #######
class CertificationSerializer(serializers.ModelSerializer):
    certificate_url = serializers.ImageField(source="certificate", read_only=True)

    class Meta:
        model = Certification
        fields = [
            "certificate",
            "certificate_url",
            "title",
            "skill_level",
            "issued_by",
            "id",
        ]





class EducationSerializer(serializers.ModelSerializer):

    start_date = serializers.DateField(input_formats=['%Y', '%Y-%m-%d'])
    end_date = serializers.DateField(input_formats=['%Y', '%Y-%m-%d'])

    class Meta:
        model = Education
        fields = "__all__"
        read_only_fields = ["id", "portfolio", "deleted_at"]

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if isinstance(start_date, int):
            start_date = date(start_date, 1, 1)
            attrs["start_date"] = start_date
        if isinstance(end_date, int):
            end_date = date(end_date, 1, 1)
            attrs["end_date"] = end_date

        if not start_date:
            raise serializers.ValidationError("Start date is required")
        if not end_date:
            raise serializers.ValidationError("End date is required")

        if end_date <= start_date:
            raise serializers.ValidationError("The end_date cannot be less than start_date")

        return attrs


class ExperienceSerializer(serializers.ModelSerializer):
    company_logo = serializers.ImageField(required=False, allow_null=True)
    company_logo_url = serializers.URLField(required=False, allow_null=True)

    class Meta:
        model = Experience
        fields = "__all__"
        read_only_fields = ["id", "portfolio"]

    def validate(self, attrs):
        data = super().validate(attrs)
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if not start_date:
            raise serializers.ValidationError("Start date is required")
        if end_date and end_date <= start_date:
            raise serializers.ValidationError("The end_date can not be less than start")
        if start_date > timezone.now().date():
            raise serializers.ValidationError("Start date is invalid")
        if end_date and end_date > timezone.now().date():
            raise serializers.ValidationError("End date is invalid")
        return data

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Prefer file if present, else use URL
        from base.utils import get_media_url
        if instance.company_logo:
            rep["company_logo"] = get_media_url(instance.company_logo)
        elif instance.company_logo_url:
            rep["company_logo"] = get_media_url(instance.company_logo_url)
        else:
            rep["company_logo"] = None
        return rep


class ToolSerializer(serializers.ModelSerializer):
    icon = serializers.SerializerMethodField()

    class Meta:
        model = Tool
        fields = ["name", "category", "icon", "id"]

    def get_icon(self, obj: Tool):
        return get_media_url(obj.icon)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        #representation["icon"] = get_media_url(instance.icon)
        return representation


class ProjectSerializer(serializers.ModelSerializer):
    image = serializers.URLField(allow_blank=True, allow_null=True, required=False)

    class Meta:
        model = Project
        fields = ['id', 'name', 'image', 'link']
        read_only_fields = ['id']



class PortfolioSerializer(serializers.ModelSerializer):
    experience = ExperienceSerializer(many=True, required=False, allow_empty=True, read_only=True)
    certifications = CertificationSerializer(many=True, required=False)
    education = EducationSerializer(many=True, required=False, allow_empty=True)
    verified_skillsets = serializers.SerializerMethodField()
    banner = serializers.ImageField(required=False, allow_null=True)
    projects = ProjectSerializer(many=True)
    role = serializers.SerializerMethodField()
    project_links = serializers.JSONField(required=False)
    tools = serializers.PrimaryKeyRelatedField(many=True, queryset=Tool.objects.all(), required=False)
    about = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = [
            "banner",
            "about",
            "projects",
            "project_links",
            "tools",
            "experience",
            "certifications",
            "education",
            "slug",
            "verified_skillsets",
            "role",
        ]
        read_only_fields = ["certifications", "slug"]

    #def get_banner(self, obj: Portfolio):
    #    return get_media_url(obj.banner)

    def update(self, instance, validated_data):
        tools_data = validated_data.pop('tools', None)
  
        banner = validated_data.pop('banner', None)

        if banner is not None:
            instance.banner = banner

        portfolio = super().update(instance, validated_data)

        if tools_data is not None:
            portfolio.tools.set(tools_data)
        
        portfolio.save()
        return portfolio

    def validate_banner(self, value):
        if value:
            # Check if the image size is within limits
            if value.size > settings.UPLOAD_FILE_MAX_SIZE:
                raise serializers.ValidationError(
                    "Banner image size too large. Max size is 1MB."
                )

            # Get the file extension
            file_extension = value.name.split(".")[-1].lower()
            # Check if the file extension is allowed
            if (
                not file_extension
                or file_extension not in settings.WHITELISTED_IMAGE_TYPES.keys()
            ):
                raise serializers.ValidationError("Only JPEG and PNG files are allowed.")

            # check the content type
            if value.content_type not in settings.WHITELISTED_IMAGE_TYPES.values():
                raise serializers.ValidationError("Invalid image content-type")

        return value

    def get_verified_skillsets(self, obj):
        from skill_assessment.models import CandidateAssessmentSubmission
        
        verified_skillsets = CandidateAssessmentSubmission.objects.filter(
            candidate=obj.talent, is_passed=True
        ).values_list(
            "skill_assessment__title", 
            "skill_assessment__difficulty_level"
        )
        
        # Format skillsets with difficulty level
        formatted_skillsets = []
        for skillset_title, difficulty_level in verified_skillsets:
            if skillset_title and difficulty_level:
                # Map difficulty levels to more user-friendly names
                level_mapping = {
                    "JUNIOR": "Junior",
                    "INTERMEDIATE": "Intermediate", 
                    "SENIOR": "Expert/Professional"
                }
                friendly_level = level_mapping.get(difficulty_level, difficulty_level)
                formatted_skillsets.append(f"{skillset_title} – {friendly_level}")
        
        return formatted_skillsets

    def _format_experience_level(self, experience_level):
        """Format experience level to be more user-friendly"""
        if not experience_level:
            return None
            
        # Map common experience level values to user-friendly names
        level_mapping = {
            "JUNIOR": "Junior",
            "INTERMEDIATE": "Intermediate", 
            "SENIOR": "Senior",
        }
        
        # Try to match the exact value first
        if experience_level.upper() in level_mapping:
            return level_mapping[experience_level.upper()]
        
        # If no exact match, return the original value capitalized
        return experience_level.title()

    def create(self, validated_data):
        projects_data = validated_data.pop('projects', [])
        role_id = validated_data.pop('role_id', None)
        role_name = validated_data.pop('role_name', None)

        # Handle role assignment
        if role_id:
            try:
                validated_data['role'] = Role.objects.get(id=role_id)
            except Role.DoesNotExist:
                raise serializers.ValidationError(f"Role with id {role_id} does not exist")
        elif role_name:
            try:
                validated_data['role'] = Role.objects.get(title__iexact=role_name)
            except Role.DoesNotExist:
                raise serializers.ValidationError(f"Role with name '{role_name}' does not exist")
        
        # Create the portfolio
        portfolio = super().create(validated_data)

        # Create projects
        for project_data in projects_data:
            Project.objects.create(portfolio=portfolio, **project_data)

        return portfolio     


    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["tools"] = ToolSerializer(instance.tools.all(), many=True).data
        representation["banner"] = get_media_url(instance.banner)
        representation["profile_picture"] = instance.talent.user.get_profile_pic()
        representation["is_verified"] = instance.talent.has_passed_tiaago_assessment
        representation["talent_id"] = instance.talent.id
        representation["user_id"] = instance.talent.user.id


        return representation
    
    def get_about(self, obj):
        """Get about from related user profile"""
        try:
            return obj.talent.user.bio or ""
        except AttributeError:
            return ""
    
    def get_role(self, obj):
        """Get role information from portfolio"""
        role = getattr(obj.talent, 'role', None)
        if role:
            return {
                "id": role.id,
                "title": role.title,
                "slug": role.slug,
                "is_technical": role.is_technical,
            }
        return None


class GenericJobSerializer(serializers.ModelSerializer):
    company = CompanyDetailSerializer()
    get_apply_url = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField() 
    payment_range = serializers.SerializerMethodField()
    no_of_applications = serializers.IntegerField(read_only=True)


    class Meta:
        model = Job
        fields = [
            "id",
            "title",
            "role",
            "job_type",
            "job_level",
            "location",
            "experience",
            "salary_duration",
            "payment_currency",
            "payment_range",
            "payment_range_usd",
            "payment_range_ngn",
            "about_company",
            "job_requirement",
            "description",
            "hiring_type",
            "no_of_applications",
            "get_apply_url",
            "apply_token",
            "date_created",
            "company",
            "job_status",
        ]

    def get_title(self, obj):
        """Get title from role for backward compatibility"""
        return obj.title

    def get_get_apply_url(self, obj):
        try:
            return obj.get_apply_url()
        except Exception:
            return None
        
        
    def get_payment_range(self, obj):
        return obj.get_display_payment_range()
    


class CompanySerializer(serializers.ModelSerializer):
    bio = serializers.CharField(source="company_rep.bio", read_only=True)
    profile_pic = serializers.CharField(source="company_rep.get_profile_pic", read_only=True)
    jobs = JobSerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = ["id", "company_name", "country", "profile_pic", "bio", "website", "jobs"]
        read_only_fields = ["id", "jobs"]
