import mimetypes

from django.conf import settings
from rest_framework import serializers

from .models import GmailSmtpConfig, OutreachEmail, PipelineCandidate, PipelineCategory, PipelineInviteLink


class PipelineCandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineCandidate
        fields = (
            "id",
            "name",
            "email",
            "phone_number",
            "role",
            "country",
            "years_of_expr",
            "linkedin_profile",
            "summary",
            "current_company",
            "education",
            "skills",
            "experience",
            "avatar",
            "portfolio_url",
            "resume",
            "experience_level",
            "current_pay",
            "pay_currency",
            "status",
            "category",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class AddToPipelineSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.CharField(max_length=255, required=False, default="")
    phone_number = serializers.CharField(max_length=50, required=False, default="")
    role = serializers.CharField(max_length=255, required=False, default="")
    country = serializers.CharField(max_length=100, required=False, default="")
    years_of_expr = serializers.IntegerField(required=False, default=0)
    linkdIn_profile = serializers.CharField(max_length=500, required=False, default="")
    summary = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    current_company = serializers.CharField(max_length=255, required=False, default="")
    education = serializers.CharField(required=False, allow_blank=True, default="")
    skills = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    experience = serializers.ListField(required=False, default=list)
    avatar = serializers.CharField(max_length=500, required=False, default="")
    category = serializers.IntegerField(required=False, allow_null=True, default=None)

    def create(self, validated_data):
        validated_data["linkedin_profile"] = validated_data.pop("linkdIn_profile", "")
        category_id = validated_data.pop("category", None)
        if category_id:
            validated_data["category_id"] = category_id
        validated_data["summary"] = validated_data.get("summary") or ""
        return PipelineCandidate.objects.create(**validated_data)


class BulkAddToPipelineSerializer(serializers.Serializer):
    candidates = AddToPipelineSerializer(many=True)


class UpdatePipelineEntrySerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=PipelineCandidate.Status.choices,
        required=False,
    )
    category = serializers.IntegerField(required=False, allow_null=True)


class PipelineCategorySerializer(serializers.ModelSerializer):
    candidate_count = serializers.SerializerMethodField()

    class Meta:
        model = PipelineCategory
        fields = (
            "id",
            "name",
            "description",
            "is_active",
            "candidate_count",
            "created_at",
        )
        read_only_fields = ("id", "candidate_count", "created_at")

    def get_candidate_count(self, obj):
        return obj.candidates.filter(deleted_at__isnull=True).count()


class PipelineInviteLinkSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = PipelineInviteLink
        fields = (
            "id",
            "token",
            "category",
            "category_name",
            "is_active",
            "invite_url",
            "created_at",
        )
        read_only_fields = ("id", "token", "invite_url", "created_at")

    def get_invite_url(self, obj):
        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        return f"{frontend}/i/{obj.short_code}"


class InviteTokenValidationSerializer(serializers.Serializer):
    category_name = serializers.CharField()
    company_name = serializers.CharField()
    is_active = serializers.BooleanField()


class InviteSubmissionSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=255)
    last_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=50, required=False, default="")
    linkedin_profile = serializers.URLField(max_length=500, required=False, default="")
    portfolio_url = serializers.URLField(required=False, default="")
    resume = serializers.FileField(required=False, allow_null=True, default=None)
    current_role = serializers.CharField(max_length=255, required=False, default="")
    experience_level = serializers.CharField(max_length=50, required=False, default="")
    country = serializers.CharField(max_length=100, required=False, default="")
    current_pay = serializers.CharField(max_length=50, required=False, default="")
    pay_currency = serializers.CharField(max_length=10, required=False, default="USD")
    skills = serializers.CharField(required=False, default="", allow_blank=True)
    summary = serializers.CharField(required=False, default="", allow_blank=True)

    def validate_resume(self, value):
        if value:
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError(
                    "Resume file size too large. Max size is 5MB."
                )
            file_extension = value.name.split(".")[-1].lower()
            if file_extension != "pdf":
                raise serializers.ValidationError(
                    "Only PDF files are allowed."
                )
            mime_type, _ = mimetypes.guess_type(value.name)
            if (
                mime_type != "application/pdf"
                and value.content_type != "application/pdf"
            ):
                raise serializers.ValidationError("Only PDF files are allowed.")
        return value

    def create(self, validated_data):
        invite_link = self.context["invite_link"]
        user = self.context["user"]

        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")
        name = f"{first_name} {last_name}".strip()

        skills_str = validated_data.pop("skills", "")
        skills = [s.strip() for s in skills_str.split(",") if s.strip()] if skills_str else []

        phone = validated_data.pop("phone", "")
        current_role = validated_data.pop("current_role", "")

        candidate = PipelineCandidate.objects.create(
            name=name,
            email=validated_data.get("email", ""),
            phone_number=phone,
            role=current_role,
            country=validated_data.get("country", ""),
            linkedin_profile=validated_data.get("linkedin_profile", ""),
            portfolio_url=validated_data.get("portfolio_url", ""),
            resume=validated_data.get("resume"),
            experience_level=validated_data.get("experience_level", ""),
            current_pay=validated_data.get("current_pay", ""),
            pay_currency=validated_data.get("pay_currency", "USD"),
            skills=skills,
            summary=validated_data.get("summary", ""),
            status=PipelineCandidate.Status.NEW,
            category=invite_link.category,
            company=invite_link.company,
            user=user,
            invite_link=invite_link,
        )
        return candidate


class GmailSmtpConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GmailSmtpConfig
        fields = ("id", "gmail_address", "is_verified", "verified_at", "last_used_at", "created_at")
        read_only_fields = ("id", "is_verified", "verified_at", "last_used_at", "created_at")


class GmailSmtpSetupSerializer(serializers.Serializer):
    gmail_address = serializers.EmailField(required=False, default="")
    app_password = serializers.CharField(min_length=8, max_length=64)


class SendOutreachSerializer(serializers.Serializer):
    candidate_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    subject = serializers.CharField(max_length=500)
    body = serializers.CharField()


class OutreachEmailSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source="candidate.name", read_only=True)

    class Meta:
        model = OutreachEmail
        fields = ("id", "candidate_name", "recipient_email", "subject", "status", "sent_at", "error_reason", "created_at")
        read_only_fields = fields
