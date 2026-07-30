"""Company-level Interview Copilot settings
(/recruiter/dashboard/settings/interviews)."""

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_401_UNAUTHORIZED

from create_user.permissions import get_user_company

from .models import CompanyInterviewSettings

EDITABLE_FIELDS = (
    "recording_enabled_default",
    "recording_retention_days",
    "ai_copilot_enabled",
    "copilot_live_transcription_enabled",
    "copilot_suggestions_enabled",
    "copilot_evidence_capture_enabled",
    "copilot_post_interview_summary_enabled",
    "default_duration_minutes",
    "notify_recruiter_reminder",
    "notify_recruiter_summary_ready",
    "notify_candidate_feedback_sent",
)


def _serialize(settings_obj):
    return {field: getattr(settings_obj, field) for field in EDITABLE_FIELDS}


class CompanyInterviewSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response({"error": "No company associated with this account."}, status=HTTP_401_UNAUTHORIZED)
        settings_obj, _created = CompanyInterviewSettings.objects.get_or_create(company=company)
        return Response(_serialize(settings_obj), status=HTTP_200_OK)

    def patch(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response({"error": "No company associated with this account."}, status=HTTP_401_UNAUTHORIZED)
        settings_obj, _created = CompanyInterviewSettings.objects.get_or_create(company=company)

        update_fields = []
        for field in EDITABLE_FIELDS:
            if field in request.data:
                setattr(settings_obj, field, request.data[field])
                update_fields.append(field)
        if update_fields:
            settings_obj.save(update_fields=update_fields)
        return Response(_serialize(settings_obj), status=HTTP_200_OK)
