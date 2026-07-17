from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from base.mixins.pagination import TiaagoPagination
from base.permissions import IsCompanyRepOrStaffUser, IsStaffUser
from create_user.permissions import get_user_company
from skill_assessment.models import CandidateAssessmentSubmission
from skill_assessment.views import _get_assessment_by_invite_token

from .models import ProctoringSession, ProctoringEvent
from .scoring import calculate_integrity_score
from .serializers import (
    ProctoringEventBatchInputSerializer,
    CompleteProctoringSessionInputSerializer,
    ProctoringReportSerializer,
    AdminHighRiskSessionSerializer,
)


def _settings_snapshot(job):
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


def _get_submission_for_token(token):
    """Resolve the (assessment, submission) pair for a proctoring endpoint,
    mirroring the identity-resolution pattern used throughout
    skill_assessment/views.py -- never trust request.user, only the token."""
    assessment = _get_assessment_by_invite_token(token)
    if not assessment:
        return None, None
    talent = assessment.job_application.applicant
    submission = CandidateAssessmentSubmission.objects.filter(
        candidate=talent, skill_assessment=assessment
    ).first()
    return assessment, submission


class CreateProctoringSessionView(APIView):
    """POST /proctoring/invite/<token>/session/ -- called once, from the
    briefing page's "Begin assessment" action. Idempotent: reloading the
    briefing page and clicking Begin again returns the existing session."""

    permission_classes = [AllowAny]

    def post(self, request, token):
        assessment, submission = _get_submission_for_token(token)
        if not assessment or not submission:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        job = assessment.job_application.job
        session, _created = ProctoringSession.objects.get_or_create(
            assessment_attempt=submission,
            defaults={
                "candidate": submission.candidate,
                "job": job,
                "started_at": timezone.now(),
                "settings_snapshot": _settings_snapshot(job),
            },
        )
        return Response(status=201, data={"session_id": session.id})


class ProctoringEventBatchView(APIView):
    """POST /proctoring/invite/<token>/sessions/<session_id>/events/ --
    batched event ingestion. Deliberately lightweight: validate + bulk
    insert only, no scoring or other side effects, so it returns quickly
    under frequent 15s-interval flushes."""

    permission_classes = [AllowAny]

    def post(self, request, token, session_id):
        assessment, submission = _get_submission_for_token(token)
        if not assessment or not submission:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        session = ProctoringSession.objects.filter(id=session_id, assessment_attempt=submission).first()
        if not session:
            return Response(status=404, data={"error": "Proctoring session not found."})

        serializer = ProctoringEventBatchInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        events = [
            ProctoringEvent(
                session=session,
                event_type=e["event_type"],
                occurred_at=e["occurred_at"],
                duration_seconds=e.get("duration_seconds"),
                metadata=e.get("metadata") or {},
                severity=e.get("severity", ProctoringEvent.Severity.INFO),
            )
            for e in serializer.validated_data["events"]
        ]
        ProctoringEvent.objects.bulk_create(events)
        return Response(status=201, data={"created": len(events)})


class CompleteProctoringSessionView(APIView):
    """POST /proctoring/invite/<token>/sessions/<session_id>/complete/ --
    called once by the client on normal submission (no terminated_reason) or
    forced submission (terminated_reason set). Computes the integrity score
    server-side from stored events -- never trusts a client-submitted score."""

    permission_classes = [AllowAny]

    def post(self, request, token, session_id):
        assessment, submission = _get_submission_for_token(token)
        if not assessment or not submission:
            return Response(status=404, data={"error": "This assessment invite link is invalid or has expired."})

        session = ProctoringSession.objects.filter(id=session_id, assessment_attempt=submission).first()
        if not session:
            return Response(status=404, data={"error": "Proctoring session not found."})

        if session.status != ProctoringSession.Status.ACTIVE:
            return Response(status=200, data={
                "status": session.status, "integrity_score": session.integrity_score, "risk_level": session.risk_level,
            })

        serializer = CompleteProctoringSessionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        terminated_reason = serializer.validated_data.get("terminated_reason")

        score, risk_level = calculate_integrity_score(session)

        session.status = ProctoringSession.Status.TERMINATED if terminated_reason else ProctoringSession.Status.COMPLETED
        session.ended_at = timezone.now()
        session.integrity_score = score
        session.risk_level = risk_level
        if terminated_reason:
            session.terminated_reason = terminated_reason
        session.save(update_fields=["status", "ended_at", "integrity_score", "risk_level", "terminated_reason", "updated_at"])

        return Response(status=200, data={"status": session.status, "integrity_score": score, "risk_level": risk_level})


class ProctoringReportView(APIView):
    """GET /proctoring/report/<submission_id>/ -- recruiter-facing report for
    one attempt. Company-scoped exactly like CandidateSubmissionSnapshotListView."""

    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request, submission_id):
        session = ProctoringSession.objects.filter(assessment_attempt_id=submission_id).select_related(
            "job", "job__company", "candidate", "candidate__user"
        ).prefetch_related("events").first()
        if not session:
            return Response(status=404, data={"error": "No proctoring session found for this submission."})

        if not request.user.is_staff:
            company = get_user_company(request.user)
            if not company or session.job.company_id != company.id:
                return Response(status=404, data={"error": "No proctoring session found for this submission."})

        return Response(status=200, data=ProctoringReportSerializer(session).data)


class AdminProctoringOverviewView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        qs = ProctoringSession.objects.filter(created_at__gte=month_start)

        total = qs.count()
        avg_score = qs.exclude(integrity_score__isnull=True).aggregate(avg=Avg("integrity_score"))["avg"]

        risk_distribution = {
            level: qs.filter(risk_level=level).count()
            for level, _label in ProctoringSession.RiskLevel.choices
        }

        terminated_qs = qs.filter(status=ProctoringSession.Status.TERMINATED)
        terminated_count = terminated_qs.count()
        termination_reasons = list(
            terminated_qs.exclude(terminated_reason__isnull=True).exclude(terminated_reason="")
            .values("terminated_reason").annotate(count=Count("id")).order_by("-count")
        )

        top_violation = (
            ProctoringEvent.objects.filter(session__in=qs, severity=ProctoringEvent.Severity.VIOLATION)
            .values("event_type").annotate(count=Count("id")).order_by("-count").first()
        )

        return Response(status=200, data={
            "total_sessions": total,
            "average_integrity_score": round(avg_score, 1) if avg_score is not None else None,
            "risk_distribution": risk_distribution,
            "terminated_count": terminated_count,
            "termination_reasons": termination_reasons,
            "most_common_violation": top_violation["event_type"] if top_violation else None,
        })


class AdminHighRiskSessionsView(generics.ListAPIView):
    serializer_class = AdminHighRiskSessionSerializer
    permission_classes = [IsStaffUser]
    pagination_class = TiaagoPagination

    def get_queryset(self):
        return ProctoringSession.objects.filter(
            risk_level__in=[ProctoringSession.RiskLevel.HIGH, ProctoringSession.RiskLevel.CRITICAL]
        ).select_related("job", "job__company", "candidate", "candidate__user").prefetch_related("events").order_by("-created_at")
