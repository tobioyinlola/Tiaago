from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from base.mixins.pagination import PaginationHandlerMixin
from base.utils import extract_query_from_request
from create_user.models import Company, CompanyTeamMember
from staff.permissions import requirePermission
from staff.utils import log_staff_activity
from .models import Notification, NotificationRead
from .serializers import (
    NotificationSerializer,
    NotificationComposeSerializer,
    NotificationHistorySerializer,
    OrganisationSearchSerializer,
)
from .utils import get_visible_notifications_queryset, get_recipient_user_ids


class NotificationListView(APIView, PaginationHandlerMixin):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = get_visible_notifications_queryset(request.user)
        page = self.paginate_queryset(qs)
        read_ids = set(
            NotificationRead.objects.filter(
                user=request.user, notification_id__in=[n.id for n in page]
            ).values_list("notification_id", flat=True)
        )
        serializer = NotificationSerializer(
            page, many=True, context={"read_notification_ids": read_ids}
        )
        return Response(self.get_paginated_response(serializer.data))


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        visible_ids = get_visible_notifications_queryset(request.user).values_list("id", flat=True)
        read_ids = NotificationRead.objects.filter(
            user=request.user, notification_id__in=visible_ids
        ).values_list("notification_id", flat=True)
        unread_count = len(set(visible_ids) - set(read_ids))
        return Response(status=200, data={"unread_count": unread_count})


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = get_visible_notifications_queryset(request.user).filter(id=notification_id).first()
        if not notification:
            return Response(status=404, data={"error": "Notification not found."})
        NotificationRead.objects.get_or_create(notification=notification, user=request.user)
        return Response(status=200, data={"success": True})


class MarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        visible_ids = list(get_visible_notifications_queryset(request.user).values_list("id", flat=True))
        already_read_ids = set(
            NotificationRead.objects.filter(
                user=request.user, notification_id__in=visible_ids
            ).values_list("notification_id", flat=True)
        )
        to_create = [
            NotificationRead(notification_id=nid, user=request.user)
            for nid in visible_ids
            if nid not in already_read_ids
        ]
        NotificationRead.objects.bulk_create(to_create)
        return Response(status=200, data={"marked_read": len(to_create)})


class AdminOrganisationSearchView(APIView, PaginationHandlerMixin):
    """Staff-only: thin {id, company_name} search for the notification
    target-organisation picker, mirroring CompanyListView's query pattern."""

    permission_classes = [requirePermission("notifications.view")]

    def get(self, request):
        queryset = Company.objects.all()
        q = extract_query_from_request(request)
        if q:
            queryset = queryset.filter(
                Q(company_name__icontains=q) | Q(company_email__icontains=q)
            )
        page = self.paginate_queryset(queryset)
        data = OrganisationSearchSerializer(page, many=True).data
        return Response(self.get_paginated_response(data))


class AdminNotificationListCreateView(APIView, PaginationHandlerMixin):
    def get_permissions(self):
        slug = "notifications.view" if self.request.method == "GET" else "notifications.send"
        return [requirePermission(slug)()]

    def get(self, request):
        qs = Notification.objects.select_related("target_organisation", "segment", "tag", "sent_by").order_by("-created_at")
        page = self.paginate_queryset(qs)
        for notification in page:
            recipients = get_recipient_user_ids(notification)
            notification.recipients_count = len(recipients)
            notification.read_count = NotificationRead.objects.filter(
                notification=notification, user_id__in=recipients
            ).count()
        serializer = NotificationHistorySerializer(page, many=True)
        return Response(self.get_paginated_response(serializer.data))

    def post(self, request):
        serializer = NotificationComposeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        notification = Notification.objects.create(
            type=data["type"],
            title=data["title"],
            message=data["message"],
            link_url=data.get("link_url") or None,
            link_label=data.get("link_label") or None,
            target_scope=data["target_scope"],
            target_organisation=data.get("target_organisation"),
            segment=data.get("segment"),
            tag=data.get("tag"),
            sent_by=request.user,
        )
        recipient_count = len(get_recipient_user_ids(notification))
        log_staff_activity(
            request.user, "notifications.send", "Notification", notification.id,
            {"title": notification.title, "recipient_count": recipient_count},
        )

        return Response(
            status=201,
            data={
                "id": notification.id,
                "title": notification.title,
                "recipient_count": recipient_count,
            },
        )


class AdminNotificationDetailView(APIView):
    permission_classes = [requirePermission("notifications.view")]

    def get(self, request, notification_id):
        notification = Notification.objects.filter(id=notification_id).first()
        if not notification:
            return Response(status=404, data={"error": "Notification not found."})

        recipients = get_recipient_user_ids(notification)
        notification.recipients_count = len(recipients)
        notification.read_count = NotificationRead.objects.filter(
            notification=notification, user_id__in=recipients
        ).count()
        data = NotificationHistorySerializer(notification).data

        org_breakdown = None
        if notification.target_scope == Notification.TargetScope.ORGANISATION and notification.target_organisation:
            company = notification.target_organisation
            org_recipient_ids = recipients
            read_ids = set(
                NotificationRead.objects.filter(
                    notification=notification, user_id__in=org_recipient_ids
                ).values_list("user_id", flat=True)
            )
            org_breakdown = [{
                "company_id": company.id,
                "company_name": company.company_name,
                "recipients": len(org_recipient_ids),
                "opened": len(org_recipient_ids & read_ids),
            }]
        data["organisation_breakdown"] = org_breakdown
        return Response(status=200, data=data)
