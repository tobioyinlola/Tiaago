"""Recruiter-facing interviews list (Upcoming / Live / Needs Review /
Completed tabs) backing /recruiter/dashboard/interviews."""

from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_403_FORBIDDEN

from base.mixins.pagination import TiaagoPagination
from create_user.permissions import get_user_company

from .models import Scheduler

TABS = ("upcoming", "live", "needs_review", "completed")


def _base_queryset(company):
    return (
        Scheduler.objects.filter(company=company)
        .exclude(status=Scheduler.Status.CANCELLED)
        .select_related("talent", "preparation", "summary")
    )


def _tab_queryset(company, tab):
    qs = _base_queryset(company)
    if tab == "live":
        return qs.filter(status=Scheduler.Status.IN_PROGRESS)
    if tab == "needs_review":
        return qs.filter(status=Scheduler.Status.COMPLETED).filter(
            Q(summary__isnull=True) | Q(summary__submitted_at__isnull=True)
        )
    if tab == "completed":
        return qs.filter(status=Scheduler.Status.COMPLETED, summary__submitted_at__isnull=False)
    # upcoming (default)
    return qs.filter(status__in=[Scheduler.Status.SCHEDULED, Scheduler.Status.ROOM_CREATED])


def _serialize(interview, tab):
    talent = interview.talent
    data = {
        "id": str(interview.id),
        "candidate_name": talent.full_name if talent else "",
        "job_title": interview.job_title or interview.title,
        "meeting_date": interview.meeting_date,
        "start_time": interview.start_time,
        "duration_minutes": interview.duration_minutes,
        "status": interview.status,
        "interview_type": interview.interview_type,
        "recording_enabled": interview.recording_enabled,
        "prep_ready": (
            hasattr(interview, "preparation")
            and interview.preparation.generation_status == "READY"
        ),
    }
    if tab == "live":
        data["candidate_waiting"] = interview.candidate_joined_at is not None
    if tab == "needs_review":
        data["ended_at"] = interview.ended_at
    if tab == "completed":
        summary = getattr(interview, "summary", None)
        data["recommendation"] = summary.recommendation if summary else None
        data["overall_score"] = summary.overall_score if summary else None
    return data


class RecruiterInterviewsListView(APIView):
    """GET /api/schedulers/interviews/?tab=upcoming|live|needs_review|completed
    Returns { tab, count, results, tab_counts: {upcoming, live, needs_review, completed} }."""

    permission_classes = [IsAuthenticated]
    pagination_class = TiaagoPagination

    def get(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response({"error": "No company associated."}, status=HTTP_403_FORBIDDEN)

        tab = request.GET.get("tab", "upcoming")
        if tab not in TABS:
            tab = "upcoming"

        tab_counts = {t: _tab_queryset(company, t).count() for t in TABS}

        queryset = _tab_queryset(company, tab).order_by(
            "start_time" if tab == "upcoming" else "-meeting_date"
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        results = [_serialize(interview, tab) for interview in page]
        response = paginator.get_paginated_response(results)
        response.data["tab"] = tab
        response.data["tab_counts"] = tab_counts
        return response
