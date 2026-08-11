import csv

from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from base.mixins.pagination import TiaagoPagination
from staff.permissions import requirePermission
from utils.gmail_smtp import test_smtp_connection

from .audit import log_audit
from .choices import TalentNetworkMemberStatus
from .models import (
    JobMatchNotification,
    TalentNetworkAuditLog,
    TalentNetworkMember,
    TalentNetworkPageView,
    TalentNetworkSmtpConfig,
)
from .serializers import (
    JobMatchNotificationSerializer,
    TalentNetworkJoinSerializer,
    TalentNetworkMemberSerializer,
    TalentNetworkSmtpConfigSerializer,
    TalentNetworkSmtpSetupSerializer,
)


# ── Public: registration / confirmation / unsubscribe ──────────────────────

class TalentNetworkJoinView(APIView):
    """POST /api/talent-network/join/ -- the public registration form.
    Rate-limited per IP since this is an unauthenticated, publicly-linked
    endpoint (Part 8 security requirement)."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "talent_network_join"

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        existing = TalentNetworkMember.objects.filter(email__iexact=email).first() if email else None

        if existing and existing.status == TalentNetworkMemberStatus.ACTIVE:
            return Response(
                {"message": "You're already part of the TIAAGO Talent Network."}, status=status.HTTP_200_OK
            )

        serializer = TalentNetworkJoinSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)

        member = serializer.save(
            status=TalentNetworkMemberStatus.PENDING_CONFIRMATION,
            email=email or serializer.validated_data["email"],
        )

        from .mailer import send_welcome_confirmation
        send_welcome_confirmation(member)

        log_audit(TalentNetworkAuditLog.Action.SIGNUP, target_member=member, request=request)

        return Response(
            {"message": "Check your email to confirm your spot in the Talent Network."},
            status=status.HTTP_201_CREATED,
        )


class TalentNetworkConfirmView(APIView):
    """GET/POST /api/talent-network/confirm/<token>/ -- double opt-in
    confirmation. GET lets the frontend look up the member's name/email to
    render a confirmation landing page before the member actually confirms;
    POST performs the confirmation."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "talent_network_confirm"

    def get(self, request, token):
        member = get_object_or_404(TalentNetworkMember, confirmation_token=token)
        return Response({"first_name": member.first_name, "email": member.email, "status": member.status})

    def post(self, request, token):
        member = get_object_or_404(TalentNetworkMember, confirmation_token=token)
        if member.status == TalentNetworkMemberStatus.PENDING_CONFIRMATION:
            member.status = TalentNetworkMemberStatus.ACTIVE
            member.save(update_fields=["status"])
            log_audit(TalentNetworkAuditLog.Action.CONFIRM, target_member=member, request=request)
        return Response({"message": "You're officially part of the TIAAGO Talent Network.", "status": member.status})


class TalentNetworkTrackViewView(APIView):
    """POST /api/talent-network/track-view/ -- public, unauthenticated beacon
    the join page pings once per (browser session, day). Deliberately
    minimal, mirroring analytics.views.TrackVisitAPIView's own
    session_key-only, bounded/deduped counter -- kept as this app's own
    endpoint/model (TalentNetworkPageView) rather than reusing that one, so
    this count is independent of the site-wide visit tracker."""

    permission_classes = [AllowAny]

    def post(self, request):
        session_key = request.data.get("session_key")
        if not isinstance(session_key, str) or not (0 < len(session_key) <= 64):
            return Response(status=status.HTTP_400_BAD_REQUEST, data={"error": "Invalid session_key"})
        TalentNetworkPageView.objects.get_or_create(session_key=session_key, visited_date=timezone.now().date())
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Public: email tracking ─────────────────────────────────────────────────

_TRANSPARENT_PIXEL_GIF = (
    b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00"
    b"\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00"
    b"\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b"
)


class TrackOpenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, notification_id):
        JobMatchNotification.objects.filter(id=notification_id).exclude(
            status__in=[JobMatchNotification.Status.OPENED, JobMatchNotification.Status.CLICKED, JobMatchNotification.Status.APPLIED]
        ).update(status=JobMatchNotification.Status.OPENED, opened_at=timezone.now())

        notification = JobMatchNotification.objects.filter(id=notification_id).select_related("member").first()
        if notification:
            TalentNetworkMember.objects.filter(id=notification.member_id).update(last_opened=timezone.now())

        return HttpResponse(_TRANSPARENT_PIXEL_GIF, content_type="image/gif")


class TrackClickView(APIView):
    """GET /api/talent-network/track/click/<id>/ -- fired client-side (a
    fire-and-forget beacon from the job apply page, see ?tn= handling in
    frontend/app/(home)/jobs/[job_id]/apply/page.tsx) rather than being the
    email button's own href. The button links straight to the job's real
    frontend URL (job.get_apply_url()) so it always works even if BASE_URL
    isn't configured for this environment; click analytics are recorded
    once the candidate actually lands on that page instead of via a
    server-side redirect hop through the backend's own (sometimes
    unconfigured/unreachable) public domain."""

    permission_classes = [AllowAny]

    def get(self, request, notification_id):
        notification = JobMatchNotification.objects.filter(id=notification_id).first()
        if not notification:
            return Response(status=status.HTTP_204_NO_CONTENT)
        JobMatchNotification.objects.filter(id=notification.id).exclude(
            status__in=[JobMatchNotification.Status.CLICKED, JobMatchNotification.Status.APPLIED]
        ).update(status=JobMatchNotification.Status.CLICKED, clicked_at=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Admin: overview / members / analytics ──────────────────────────────────

class TalentNetworkOverviewView(APIView):
    """GET /api/talent-network/admin/overview/ -- the Overview cards."""

    permission_classes = [requirePermission("talent_network.view")]

    def get(self, request):
        members = TalentNetworkMember.objects.filter(status=TalentNetworkMemberStatus.ACTIVE)
        week_ago = timezone.now() - timezone.timedelta(days=7)

        top_roles = (
            members.exclude(interested_roles=[])
            .values_list("interested_roles", flat=True)
        )
        role_counts: dict[str, int] = {}
        for roles in top_roles:
            for r in roles:
                role_counts[r] = role_counts.get(r, 0) + 1
        top_roles_list = sorted(role_counts.items(), key=lambda x: -x[1])[:5]

        community_counts: dict[str, int] = {}
        for communities in members.exclude(communities=[]).values_list("communities", flat=True):
            for c in communities:
                community_counts[c] = community_counts.get(c, 0) + 1
        top_communities_list = sorted(community_counts.items(), key=lambda x: -x[1])[:5]

        return Response({
            "total_members": members.count(),
            "new_this_week": members.filter(created_at__gte=week_ago).count(),
            "countries": members.exclude(country="").values("country").distinct().count(),
            "top_roles": [{"role": r, "count": c} for r, c in top_roles_list],
            "top_communities": [{"community": c, "count": n} for c, n in top_communities_list],
            "email_subscribers": members.exclude(email_frequency="").count(),
            "total_page_views": TalentNetworkPageView.objects.count(),
            "page_views_this_week": TalentNetworkPageView.objects.filter(visited_date__gte=week_ago.date()).count(),
        })


class TalentNetworkMemberListView(ListAPIView):
    """GET /api/talent-network/admin/members/ -- Recent Signups table with
    search/filter (role, country, community, experience, industry)."""

    serializer_class = TalentNetworkMemberSerializer
    permission_classes = [requirePermission("talent_network.view")]
    pagination_class = TiaagoPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ["country", "years_experience", "status"]
    search_fields = ["first_name", "last_name", "email", "job_title"]
    ordering_fields = ["created_at", "last_email_sent"]

    def get_queryset(self):
        qs = TalentNetworkMember.objects.all()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(interested_roles__contains=[role])
        community = self.request.query_params.get("community")
        if community:
            qs = qs.filter(communities__contains=[community])
        industry = self.request.query_params.get("industry")
        if industry:
            qs = qs.filter(industry__contains=[industry])
        return qs


class TalentNetworkMemberDetailView(APIView):
    """GET (profile) / PATCH (deactivate/reactivate) / DELETE (soft-delete)
    for a single member -- Part 3's "View Profile" / "Deactivate" / "Delete"
    row actions."""

    permission_classes = [requirePermission("talent_network.manage")]

    def get(self, request, pk):
        member = get_object_or_404(TalentNetworkMember, pk=pk)
        notifications = JobMatchNotification.objects.filter(member=member).select_related("job")[:20]
        return Response({
            "member": TalentNetworkMemberSerializer(member).data,
            "recent_notifications": JobMatchNotificationSerializer(notifications, many=True).data,
        })

    def patch(self, request, pk):
        member = get_object_or_404(TalentNetworkMember, pk=pk)
        new_status = request.data.get("status")
        if new_status == TalentNetworkMemberStatus.DEACTIVATED:
            member.status = TalentNetworkMemberStatus.DEACTIVATED
            member.save(update_fields=["status"])
            log_audit(TalentNetworkAuditLog.Action.DEACTIVATE, actor=request.user, target_member=member, request=request)
        elif new_status == TalentNetworkMemberStatus.ACTIVE:
            member.status = TalentNetworkMemberStatus.ACTIVE
            member.save(update_fields=["status"])
            log_audit(TalentNetworkAuditLog.Action.REACTIVATE, actor=request.user, target_member=member, request=request)
        else:
            return Response({"error": "Unsupported status transition."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TalentNetworkMemberSerializer(member).data)

    def delete(self, request, pk):
        member = get_object_or_404(TalentNetworkMember, pk=pk)
        log_audit(TalentNetworkAuditLog.Action.DELETE, actor=request.user, target_member=member, request=request, email=member.email)
        member.delete()  # soft delete via TimeStampedModel.deleted_at
        return Response(status=status.HTTP_204_NO_CONTENT)


class TalentNetworkExportCsvView(APIView):
    """GET /api/talent-network/admin/members/export/ -- CSV export."""

    permission_classes = [requirePermission("talent_network.view")]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="talent_network_members.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "First Name", "Last Name", "Email", "Phone", "Country", "State", "City",
            "Job Title", "Years Experience", "Industry", "Interested Roles",
            "Preferred Work Type", "Communities", "Email Frequency", "Status", "Joined",
        ])
        for m in TalentNetworkMember.objects.all().iterator():
            writer.writerow([
                _csv_safe(m.first_name), _csv_safe(m.last_name), m.email, m.phone,
                m.country, m.state, m.city, _csv_safe(m.job_title), m.years_experience,
                ", ".join(m.industry), ", ".join(m.interested_roles), m.preferred_work_type,
                ", ".join(m.communities), m.email_frequency, m.status, m.created_at.isoformat(),
            ])
        log_audit(TalentNetworkAuditLog.Action.EXPORT_CSV, actor=request.user, request=request)
        return response


def _csv_safe(value):
    """Same CSV/formula-injection guard as subscriptions.views._csv_safe --
    member-supplied names/titles land in an admin's spreadsheet, so this is
    a real injection path, not theoretical."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


class TalentNetworkAnalyticsView(APIView):
    """GET /api/talent-network/admin/analytics/ -- Part 7 analytics."""

    permission_classes = [requirePermission("talent_network.view")]

    def get(self, request):
        notifications = JobMatchNotification.objects.all()
        sent = notifications.exclude(status=JobMatchNotification.Status.QUEUED).exclude(status=JobMatchNotification.Status.FAILED)
        sent_count = sent.count()
        opened_count = sent.filter(
            status__in=[JobMatchNotification.Status.OPENED, JobMatchNotification.Status.CLICKED, JobMatchNotification.Status.APPLIED]
        ).count()
        clicked_count = sent.filter(
            status__in=[JobMatchNotification.Status.CLICKED, JobMatchNotification.Status.APPLIED]
        ).count()
        applied_count = sent.filter(status=JobMatchNotification.Status.APPLIED).count()

        top_jobs = (
            notifications.values("job_id", "job__role")
            .annotate(match_count=Count("id"), applied=Count("id", filter=Q(status=JobMatchNotification.Status.APPLIED)))
            .order_by("-match_count")[:10]
        )
        top_recruiters = (
            notifications.values("job__company_id", "job__company__company_name")
            .annotate(match_count=Count("id"), applied=Count("id", filter=Q(status=JobMatchNotification.Status.APPLIED)))
            .order_by("-match_count")[:10]
        )
        members_growth = (
            TalentNetworkMember.objects.filter(status=TalentNetworkMemberStatus.ACTIVE)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        return Response({
            "open_rate": round(opened_count / sent_count * 100, 1) if sent_count else None,
            "click_rate": round(clicked_count / sent_count * 100, 1) if sent_count else None,
            "application_rate": round(applied_count / sent_count * 100, 1) if sent_count else None,
            "top_performing_jobs": list(top_jobs),
            "top_recruiters": list(top_recruiters),
            "members_growth": list(members_growth),
        })


# ── Admin: platform SMTP config ─────────────────────────────────────────────

class TalentNetworkSmtpConfigView(APIView):
    """GET/POST/DELETE /api/talent-network/admin/smtp-config/ -- the
    platform-wide Gmail SMTP connection used to send Talent Network emails
    (see talent_network.mailer). Singleton: POST always replaces whatever
    row exists rather than creating a second one, same update_or_create
    pattern as sourcing.views.SmtpConfigView (its per-company equivalent)."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [requirePermission("talent_network.view")()]
        return [requirePermission("talent_network.manage")()]

    def get(self, request):
        config = TalentNetworkSmtpConfig.objects.first()
        return Response({"data": TalentNetworkSmtpConfigSerializer(config).data if config else None})

    def post(self, request):
        serializer = TalentNetworkSmtpSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        gmail_address = serializer.validated_data["gmail_address"]
        app_password = serializer.validated_data["app_password"]

        ok, error_msg = test_smtp_connection(gmail_address, app_password)
        if not ok:
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        # Singleton -- reuse the existing row if one exists instead of ever
        # having two, since callers (talent_network.mailer) look up "the"
        # config with .first().
        config = TalentNetworkSmtpConfig.objects.first()
        created = config is None
        if config is None:
            config = TalentNetworkSmtpConfig()
        config.gmail_address = gmail_address
        config.is_verified = True
        config.verified_at = timezone.now()
        config.created_by = request.user
        config.app_password = app_password
        config.save()

        log_audit(TalentNetworkAuditLog.Action.SETTINGS_UPDATE, actor=request.user, request=request)

        return Response(
            {"success": True, "data": TalentNetworkSmtpConfigSerializer(config).data},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        TalentNetworkSmtpConfig.objects.all().delete()
        log_audit(TalentNetworkAuditLog.Action.SETTINGS_UPDATE, actor=request.user, request=request)
        return Response({"success": True})


class TalentNetworkSmtpVerifyView(APIView):
    permission_classes = [requirePermission("talent_network.manage")]

    def post(self, request):
        config = TalentNetworkSmtpConfig.objects.first()
        if config is None:
            return Response({"error": "No SMTP configuration found."}, status=status.HTTP_404_NOT_FOUND)

        ok, error_msg = test_smtp_connection(config.gmail_address, config.app_password)
        if ok:
            config.is_verified = True
            config.verified_at = timezone.now()
            config.save(update_fields=["is_verified", "verified_at"])
            return Response({"success": True, "message": "SMTP connection verified."})
        else:
            config.is_verified = False
            config.save(update_fields=["is_verified"])
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
