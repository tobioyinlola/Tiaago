from rest_framework import serializers

from jobs.models import Job

from .models import AtsCandidate, AtsConnection, AtsJob, AtsProvider


class AtsConnectSessionInputSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=AtsProvider.choices)


class AtsSyncTriggerInputSerializer(serializers.Serializer):
    """Only required on the first call for a given connection -- the
    frontend sends these once Nango's Connect UI reports a successful auth.
    Omit both on a retry of an already-CONNECTED/FAILED connection."""

    nango_connection_id = serializers.CharField(required=False, allow_blank=False)
    provider_config_key = serializers.CharField(required=False, allow_blank=False)


class AtsConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AtsConnection
        fields = (
            "id",
            "provider",
            "status",
            "candidates_synced",
            "jobs_synced",
            "error_message",
            "connected_at",
            "synced_at",
            "disconnected_at",
            "created_at",
        )
        read_only_fields = fields


class AtsJobSerializer(serializers.ModelSerializer):
    candidate_count = serializers.SerializerMethodField()

    class Meta:
        model = AtsJob
        fields = (
            "id",
            "provider",
            "external_id",
            "title",
            "description",
            "location",
            "department",
            "employment_type",
            "status",
            "salary_min",
            "salary_max",
            "salary_currency",
            "ats_created_at",
            "candidate_count",
        )
        read_only_fields = fields

    def get_candidate_count(self, obj):
        return AtsCandidate.objects.filter(
            company=obj.company, provider=obj.provider, ats_job_external_ids__contains=[obj.external_id],
        ).count()


class AtsJobConvertInputSerializer(serializers.Serializer):
    """The fields a synced AtsJob doesn't already have -- everything else
    (role/description/location) is pre-filled from the AtsJob itself by the
    view. Shaped to merge directly into a JobSerializer payload."""

    job_type = serializers.ChoiceField(choices=Job.JobType.choices)
    job_level = serializers.ChoiceField(choices=Job.JobLevel.choices, required=False)
    experience = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=10)
    payment_currency = serializers.ChoiceField(choices=Job.PaymentCurrency.choices)
    payment_range_usd = serializers.ChoiceField(choices=Job.DollarPaymentRange.choices, required=False, allow_null=True)
    payment_range_ngn = serializers.ChoiceField(choices=Job.NairaPaymentRange.choices, required=False, allow_null=True)
    hiring_type = serializers.ChoiceField(choices=Job.HIRING_TYPES, required=False)
    screening_threshold = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)
    passing_grade = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)
    assessment_time_limit = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    assessment_questions = serializers.JSONField(required=False, default=list)
    interview_slots = serializers.JSONField(required=False, default=list)

    def validate(self, attrs):
        currency = attrs["payment_currency"]
        if currency == Job.PaymentCurrency.USD and not attrs.get("payment_range_usd"):
            raise serializers.ValidationError({"payment_range_usd": "USD payment range is required when currency is USD"})
        if currency == Job.PaymentCurrency.NGN and not attrs.get("payment_range_ngn"):
            raise serializers.ValidationError({"payment_range_ngn": "Naira payment range is required when currency is NGN"})
        return attrs
