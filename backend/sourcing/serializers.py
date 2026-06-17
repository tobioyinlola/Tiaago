from rest_framework import serializers

from .models import PipelineCandidate, PipelineCategory


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
        return obj.candidates.count()
