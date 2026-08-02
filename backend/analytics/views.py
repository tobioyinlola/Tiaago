from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from subscriptions.permissions import IsStaffUser
from staff.permissions import requirePermission
from . import utils
from .models import PageView


class _AnalyticsBaseView(APIView):
    # Out-of-scope views (overview/funnel/pipeline/assessment intelligence)
    # keep the flat staff-only gate; in-scope views below override this.
    permission_classes = [IsStaffUser]


class OverviewAPIView(_AnalyticsBaseView):
    def get(self, request):
        return Response(status=200, data=utils.get_overview_metrics())


class OrganisationListAPIView(_AnalyticsBaseView):
    permission_classes = [requirePermission("organisations.view")]

    def get(self, request):
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        joined_after = request.query_params.get("joined_after")
        joined_before = request.query_params.get("joined_before")
        wallet_below = request.query_params.get("wallet_below")
        tags_param = request.query_params.get("tags")
        rows, total = utils.get_organisation_list(
            page=page,
            page_size=page_size,
            search=request.query_params.get("q"),
            status_filter=request.query_params.get("status"),
            joined_after=joined_after,
            joined_before=joined_before,
            wallet_below=float(wallet_below) if wallet_below else None,
            ordering=request.query_params.get("ordering", "-created_at"),
            tag_slugs=tags_param.split(",") if tags_param else None,
            tag_match=request.query_params.get("tag_match", "any"),
        )
        num_pages = max(1, -(-total // page_size))
        return Response(status=200, data={
            "current": page,
            "count": total,
            "next": page + 1 if page < num_pages else None,
            "previous": page - 1 if page > 1 else None,
            "results": rows,
        })


class OrganisationDetailAPIView(_AnalyticsBaseView):
    permission_classes = [requirePermission("organisations.view")]

    def get(self, request, company_id):
        data = utils.get_organisation_detail(company_id)
        if not data:
            return Response(status=404, data={"error": "Organisation not found"})
        return Response(status=200, data=data)


class OrganisationAlertsAPIView(_AnalyticsBaseView):
    permission_classes = [requirePermission("organisations.view")]

    def get(self, request):
        return Response(status=200, data=utils.get_organisation_alerts())


class RevenueAPIView(_AnalyticsBaseView):
    permission_classes = [requirePermission("revenue.view")]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        days = 90 if days == 90 else 30
        data = utils.get_revenue_summary(days=days)
        page = int(request.query_params.get("page", 1))
        topup_rows, topup_total = utils.get_wallet_topup_events(page=page, page_size=50)
        num_pages = max(1, -(-topup_total // 50))
        data["wallet_topup_events"] = {
            "current": page,
            "count": topup_total,
            "next": page + 1 if page < num_pages else None,
            "previous": page - 1 if page > 1 else None,
            "results": topup_rows,
        }
        return Response(status=200, data=data)


class FunnelAPIView(_AnalyticsBaseView):
    def get(self, request):
        return Response(status=200, data=utils.get_funnel_summary())


class PipelineAPIView(_AnalyticsBaseView):
    def get(self, request):
        data = dict(utils.get_pipeline_summary())

        zero_pipeline_orgs = data["orgs_with_zero_pipeline_entries"]
        page = int(request.query_params.get("zero_pipeline_page", 1))
        page_size = int(request.query_params.get("zero_pipeline_page_size", 20))
        total = len(zero_pipeline_orgs)
        num_pages = max(1, -(-total // page_size))
        start = (page - 1) * page_size
        data["orgs_with_zero_pipeline_entries"] = {
            "current": page,
            "count": total,
            "next": page + 1 if page < num_pages else None,
            "previous": page - 1 if page > 1 else None,
            "results": zero_pipeline_orgs[start:start + page_size],
        }
        return Response(status=200, data=data)


class GrowthAPIView(_AnalyticsBaseView):
    permission_classes = [requirePermission("revenue.view")]

    def get(self, request):
        return Response(status=200, data=utils.get_growth_summary())


class AssessmentIntelligenceAPIView(_AnalyticsBaseView):
    def get(self, request):
        return Response(status=200, data=utils.get_assessment_intelligence_summary())


class SystemHealthAPIView(_AnalyticsBaseView):
    permission_classes = [requirePermission("system.view")]

    def get(self, request):
        return Response(status=200, data=utils.get_system_health_summary())


class InterviewAnalyticsAPIView(_AnalyticsBaseView):
    def get(self, request):
        return Response(status=200, data=utils.get_interview_analytics_summary())


class TrackVisitAPIView(APIView):
    """Public, unauthenticated beacon the marketing site pings once per
    (browser session, day) -- see app/common/components/VisitBeacon.tsx.
    Deliberately minimal: no bot filtering, just a bounded, deduped counter."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_key = request.data.get("session_key")
        if not isinstance(session_key, str) or not (0 < len(session_key) <= 64):
            return Response(status=status.HTTP_400_BAD_REQUEST, data={"error": "Invalid session_key"})
        PageView.objects.get_or_create(session_key=session_key, visited_date=timezone.now().date())
        return Response(status=status.HTTP_204_NO_CONTENT)


class TrafficAPIView(_AnalyticsBaseView):
    def get(self, request):
        return Response(status=200, data={
            "website_visits": utils.get_website_visits_summary(),
            "daily_signups": utils.get_daily_signups_summary(),
        })
