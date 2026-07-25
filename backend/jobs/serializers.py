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

from create_user.models import Company, CustomUser, TalentProfile

from roles.models import Role
from .models import (
    Job,
    JobApplication,
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
    # Write-only nested input assembled by the job-creation wizard's final submit.
    # Not model fields -- consumed in create() to build the related template/slot rows.
    assessment_questions = serializers.JSONField(write_only=True, required=False, default=list)
    interview_slots = serializers.JSONField(write_only=True, required=False, default=list)


    class Meta:
        model = Job
        fields = (
            "id",
            "public_id",
            "title",
            "role_title",
            "role",
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
        read_only_fields = ("id", "public_id", "apply_token", "company", "title", "no_of_applications", "view_count", "completed_assessments_count")
      

    def get_role_title(self, obj):
        return obj.role or ""

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

    class Meta:
        model = Job
        fields = (
            "id",
            "public_id",
            "title",
            "role",
            "role_title",
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
        )
        read_only_fields = (
            "id",
            "public_id",
            "role_title",
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

    def get_role_title(self, obj):
        return obj.role or ""

    def get_title(self, obj):
        return obj.role or ""



class JobApplicationSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    applicant = ApplicantDetailSerializer(read_only=True)
    company_name = serializers.ReadOnlyField(source="job.company.company_name")
    company_logo = serializers.ReadOnlyField(source="job.company.get_logo_url")
    resume = serializers.FileField(required=False, write_only=True)
    cover_letter = serializers.CharField(required=False, allow_blank=True, max_length=3000)

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
            "created",
            "last_updated",
            "resume",
        )

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

    def validate(self, attrs):
        job = self.context.get('job')
        if job and job.job_status != Job.JobStatus.ACTIVE:
            status_display = dict(Job.JobStatus.choices)[job.job_status]
            raise serializers.ValidationError(
                f"This job is currently {status_display.lower()} and not accepting applications"
            )
        return attrs

    def create(self, validated_data):
        resume = validated_data.pop('resume', None)
        cover_letter = validated_data.get('cover_letter', '')
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

        return application


GUEST_APPLY_MAX_RESUME_SIZE = 5 * 1024 * 1024  # 5MB, per the no-login application form's own limit


class GuestJobApplicationSerializer(serializers.Serializer):
    """No-login job application: takes the candidate's details directly on the
    form (name/email/phone/LinkedIn/resume) instead of assuming a logged-in
    TalentProfile already has them. Resolves (or silently provisions) a
    CustomUser + TalentProfile by email so the resulting JobApplication is a
    completely ordinary row -- same table, same downstream pipeline, same
    recruiter-facing Applications list as any other application."""

    full_name = serializers.CharField(max_length=255, allow_blank=False, trim_whitespace=True)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=30, allow_blank=False, trim_whitespace=True)
    linkedin_url = serializers.URLField()
    resume = serializers.FileField()
    cover_letter = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    additional_info = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    terms_accepted = serializers.BooleanField()

    def validate_email(self, value):
        return value.strip().lower()

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError("You must agree to the Terms & Conditions and Privacy Policy.")
        return value

    def validate_resume(self, value):
        if value.size > GUEST_APPLY_MAX_RESUME_SIZE:
            raise serializers.ValidationError("Resume file size too large. Max size is 5MB.")
        file_extension = value.name.split(".")[-1].lower()
        allowed_extensions = settings.WHITELISTED_RESUME_FORMAT.keys()
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(f"Only {', '.join(allowed_extensions)} files are allowed.")
        return value

    def validate(self, attrs):
        job = self.context["job"]
        if job.job_status != Job.JobStatus.ACTIVE:
            status_display = dict(Job.JobStatus.choices)[job.job_status]
            raise serializers.ValidationError(
                f"This job is currently {status_display.lower()} and not accepting applications"
            )

        return attrs

    def _split_name(self, full_name):
        parts = full_name.strip().split(None, 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""
        return first_name, last_name

    def create(self, validated_data):
        job = self.context["job"]
        first_name, last_name = self._split_name(validated_data["full_name"])

        with transaction.atomic():
            # Every email is accepted, no exceptions -- zero login friction.
            # If this email already has an account (e.g. they applied before,
            # or signed up separately), reuse it instead of erroring, so the
            # application still goes through under that same account. Never
            # block the candidate here.
            user = CustomUser.objects.filter(email__iexact=validated_data["email"]).first()
            if not user:
                user = CustomUser.objects.create_user(
                    username=validated_data["email"],
                    email=validated_data["email"],
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=validated_data["phone_number"],
                    user_type=CustomUser.USER_TYPE.TALENT,
                    is_verified=False,
                    password=None,
                )

            # Never overwrite an existing account's profile from this
            # unauthenticated form -- anyone could submit someone else's
            # email with different details. Only a brand-new profile gets
            # populated from what was submitted here.
            talent_profile = TalentProfile.objects.filter(user=user).first()
            if not talent_profile:
                talent_profile = TalentProfile.objects.create(
                    user=user,
                    full_name=validated_data["full_name"].strip(),
                    linkedin_url=validated_data["linkedin_url"],
                    resume=validated_data["resume"],
                )

            application = JobApplication.objects.create(
                applicant=talent_profile,
                job=job,
                cover_letter=validated_data.get("cover_letter", ""),
                additional_info=validated_data.get("additional_info", ""),
                is_external_application=False,
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
        )
        read_only_fields = (
            "applicant",
            "job",
            "company",
            "applied_date",
            "cover_letter",
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
    cover_letter = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=2000,
        write_only=True)
    

    class Meta:
        model = JobApplication
        fields = ['id', 'applicant', 'job','job_token', 'resume', 'cover_letter', 'status', 'applied_date', 'is_external_application', 'verification_prompted', 'verification_completed']
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