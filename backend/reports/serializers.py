from rest_framework import serializers

from .models import Report


class ReportListSerializer(serializers.ModelSerializer):
    """List/summary shape -- excludes the (potentially large) report_data
    payload, matching the report card the list page actually needs."""

    class Meta:
        model = Report
        fields = (
            "id", "name", "report_type", "job_ids", "date_from", "date_to",
            "status", "generated_at", "created_at",
        )


class ReportDetailSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = (
            "id", "name", "report_type", "job_ids", "date_from", "date_to",
            "status", "report_data", "pdf_url", "generated_at", "error_message", "created_at",
        )

    def get_pdf_url(self, obj):
        if not obj.pdf_file:
            return None
        request = self.context.get("request")
        url = obj.pdf_file.url
        return request.build_absolute_uri(url) if request else url


class ReportCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    report_type = serializers.ChoiceField(choices=Report.ReportType.choices)
    job_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=True, default=list)
    date_from = serializers.DateField()
    date_to = serializers.DateField()

    def validate(self, attrs):
        if attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError({"date_to": "date_to must be on or after date_from."})
        if attrs["report_type"] != Report.ReportType.FULL_ACCOUNT and not attrs["job_ids"]:
            raise serializers.ValidationError({"job_ids": "At least one job is required for this report type."})
        if attrs["report_type"] == Report.ReportType.SINGLE_ROLE and len(attrs["job_ids"]) != 1:
            raise serializers.ValidationError({"job_ids": "Single role reports take exactly one job."})
        return attrs
