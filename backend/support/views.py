import logging

from django.db.models import F, Max, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from base.mixins.pagination import PaginationHandlerMixin, TiaagoPagination
from create_user.models import CustomUser
from create_user.permissions import get_user_company
from subscriptions.permissions import IsCompanyRepUser
from staff.permissions import get_staff_permissions, is_super_admin, requirePermission
from staff.utils import log_staff_activity
from notifications.models import Notification
from notifications.utils import notify_user
from .models import SupportTicket
from .serializers import (
    PublicContactSubmissionSerializer,
    SupportTicketCreateSerializer,
    SupportTicketReplyCreateSerializer,
    SupportTicketAdminUpdateSerializer,
    SupportTicketListSerializer,
    SupportTicketAdminListSerializer,
    SupportTicketDetailSerializer,
    SupportStaffSerializer,
    create_attachments,
)

logger = logging.getLogger(__name__)


def _get_ticket_for_company(ticket_id, company):
    return SupportTicket.objects.filter(id=ticket_id, company=company).first()


class TicketListCreateView(APIView, PaginationHandlerMixin):
    permission_classes = [IsCompanyRepUser]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response(status=403, data={"error": "No organisation found for this account."})
        qs = SupportTicket.objects.filter(company=company).order_by("-created_at")
        page = self.paginate_queryset(qs)
        serializer = SupportTicketListSerializer(page, many=True)
        return Response(self.get_paginated_response(serializer.data))

    def post(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response(status=403, data={"error": "No organisation found for this account."})

        serializer = SupportTicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        ticket = SupportTicket.objects.create(
            company=company,
            submitted_by=request.user,
            title=data["title"],
            message=data["message"],
            category=data["category"],
        )
        create_attachments(data.get("attachments") or [], ticket=ticket)

        from emails import emails
        try:
            emails.ticket_received_mail(request.user, ticket)
        except Exception:
            logger.exception("Failed to send ticket_received email for %s", ticket.id)

        return Response(
            status=status.HTTP_201_CREATED,
            data=SupportTicketDetailSerializer(ticket).data,
        )


class PublicContactSubmissionView(APIView):
    """POST /api/support/contact/ -- the public site's /contact form. No
    account/company required; creates a SupportTicket with company/
    submitted_by null and source=PUBLIC_CONTACT_FORM (see the model's own
    note on why). Shows up in the same admin support inbox as in-app
    tickets -- AdminTicketListView has no company filter."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PublicContactSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        full_name = f"{data['first_name']} {data['last_name']}".strip()
        ticket = SupportTicket.objects.create(
            source=SupportTicket.Source.PUBLIC_CONTACT_FORM,
            contact_name=full_name,
            contact_email=data["email"],
            title=f"Website contact form: {full_name}"[:120],
            message=data["message"],
            category=SupportTicket.Category.GENERAL,
        )

        from emails import emails
        try:
            emails.public_contact_received_mail(full_name, data["email"], ticket)
        except Exception:
            logger.exception("Failed to send public_contact_received email for %s", ticket.id)

        return Response(status=status.HTTP_201_CREATED, data={"id": str(ticket.id)})


class TicketDetailView(APIView):
    permission_classes = [IsCompanyRepUser]

    def get(self, request, ticket_id):
        company = get_user_company(request.user)
        ticket = _get_ticket_for_company(ticket_id, company) if company else None
        if not ticket:
            return Response(status=404, data={"error": "Ticket not found."})
        return Response(status=200, data=SupportTicketDetailSerializer(ticket).data)


class TicketReplyView(APIView):
    permission_classes = [IsCompanyRepUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, ticket_id):
        company = get_user_company(request.user)
        ticket = _get_ticket_for_company(ticket_id, company) if company else None
        if not ticket:
            return Response(status=404, data={"error": "Ticket not found."})
        if ticket.status in (SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED):
            return Response(
                status=403,
                data={"error": "This ticket is no longer open for replies. Reopen it first."},
            )

        serializer = SupportTicketReplyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        reply = ticket.replies.create(
            sent_by=request.user, is_admin_reply=False, message=data["message"],
        )
        create_attachments(data.get("attachments") or [], ticket=ticket, reply=reply)
        ticket.save(update_fields=["updated_at"])  # auto_now bump

        return Response(status=201, data=SupportTicketDetailSerializer(ticket).data)


class TicketReopenView(APIView):
    permission_classes = [IsCompanyRepUser]

    def post(self, request, ticket_id):
        company = get_user_company(request.user)
        ticket = _get_ticket_for_company(ticket_id, company) if company else None
        if not ticket:
            return Response(status=404, data={"error": "Ticket not found."})
        if ticket.status != SupportTicket.Status.RESOLVED:
            return Response(status=400, data={"error": "Only resolved tickets can be reopened."})

        ticket.status = SupportTicket.Status.IN_PROGRESS
        ticket.resolved_at = None
        ticket.save(update_fields=["status", "resolved_at", "updated_at"])
        return Response(status=200, data=SupportTicketDetailSerializer(ticket).data)


class AdminStaffListView(generics.ListAPIView):
    """Staff-only: list staff accounts for the ticket 'assigned to' picker."""

    serializer_class = SupportStaffSerializer
    permission_classes = [requirePermission("support.view")]
    pagination_class = None
    queryset = CustomUser.objects.filter(user_type=CustomUser.USER_TYPE.STAFF).order_by(
        "first_name", "username"
    )


class AdminTicketListView(generics.ListAPIView):
    """Staff-only: every ticket across every organisation."""

    serializer_class = SupportTicketAdminListSerializer
    permission_classes = [requirePermission("support.view")]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "priority", "category"]
    search_fields = ["title", "company__company_name"]
    ordering_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
    pagination_class = TiaagoPagination
    queryset = SupportTicket.objects.select_related("company", "submitted_by", "assigned_to").all()


def _unread_admin_tickets_queryset():
    """Tickets with activity a staff member hasn't seen yet -- either never
    opened, or the ticket/a non-admin reply is newer than the last time it
    was opened. Deliberately keyed on last_viewed_by_admin_at, not
    updated_at, so an admin's own status/priority edits never count as
    "new"."""
    return SupportTicket.objects.annotate(
        latest_customer_reply_at=Max(
            "replies__created_at",
            filter=Q(replies__is_admin_reply=False, replies__is_internal_note=False),
        )
    ).filter(
        Q(last_viewed_by_admin_at__isnull=True)
        | Q(created_at__gt=F("last_viewed_by_admin_at"))
        | Q(latest_customer_reply_at__gt=F("last_viewed_by_admin_at"))
    )


class AdminTicketUnreadCountView(APIView):
    """GET /api/support/admin/tickets/unread-count/ -- powers the badge on
    the admin Communication nav item, mirroring notifications' own
    unread-count endpoint. See _unread_admin_tickets_queryset for what
    counts as "unread"."""

    permission_classes = [requirePermission("support.view")]

    def get(self, request):
        return Response(status=200, data={"unread_count": _unread_admin_tickets_queryset().distinct().count()})


class AdminTicketDetailView(APIView):
    def get_permissions(self):
        slug = "support.view" if self.request.method == "GET" else "support.manage"
        return [requirePermission(slug)()]

    def get(self, request, ticket_id):
        ticket = SupportTicket.objects.filter(id=ticket_id).first()
        if not ticket:
            return Response(status=404, data={"error": "Ticket not found."})
        ticket.last_viewed_by_admin_at = timezone.now()
        ticket.save(update_fields=["last_viewed_by_admin_at"])
        return Response(
            status=200,
            data=SupportTicketDetailSerializer(ticket, context={"include_internal_notes": True}).data,
        )

    def patch(self, request, ticket_id):
        ticket = SupportTicket.objects.filter(id=ticket_id).first()
        if not ticket:
            return Response(status=404, data={"error": "Ticket not found."})

        serializer = SupportTicketAdminUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_fields = []
        old_status = ticket.status

        if "category" in data:
            ticket.category = data["category"]
            update_fields.append("category")
        if "priority" in data:
            ticket.priority = data["priority"]
            update_fields.append("priority")
        if "assigned_to" in data:
            ticket.assigned_to = data["assigned_to"]
            update_fields.append("assigned_to")
        if "status" in data and data["status"] != old_status:
            new_status = data["status"]
            ticket.status = new_status
            update_fields.append("status")
            if new_status == SupportTicket.Status.RESOLVED:
                ticket.resolved_at = timezone.now()
                update_fields.append("resolved_at")
            elif old_status == SupportTicket.Status.RESOLVED:
                # Moving away from RESOLVED (e.g. admin reopens it) -- clear
                # the stale timestamp, matching TicketReopenView's behaviour.
                ticket.resolved_at = None
                update_fields.append("resolved_at")
            if new_status == SupportTicket.Status.CLOSED:
                ticket.closed_at = timezone.now()
                update_fields.append("closed_at")
            elif old_status == SupportTicket.Status.CLOSED:
                ticket.closed_at = None
                update_fields.append("closed_at")

        update_fields.append("updated_at")
        ticket.save(update_fields=update_fields)

        if "status" in data and data["status"] == SupportTicket.Status.RESOLVED and old_status != SupportTicket.Status.RESOLVED:
            from emails import emails
            try:
                emails.ticket_resolved_mail(ticket.submitted_by, ticket)
            except Exception:
                logger.exception("Failed to send ticket_resolved email for %s", ticket.id)

        if "status" in data and data["status"] != old_status:
            log_staff_activity(
                request.user, "support.status_change", "SupportTicket", ticket.id,
                {"old_status": old_status, "new_status": data["status"]},
            )

        return Response(status=200, data=SupportTicketDetailSerializer(ticket, context={"include_internal_notes": True}).data)


class AdminTicketReplyView(APIView):
    # Staff must at minimum be authenticated staff to reach here; the
    # reply-vs-internal-note distinction is enforced inside post() once we
    # know is_internal_note, since both share this one endpoint.
    permission_classes = [requirePermission("support.view")]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, ticket_id):
        ticket = SupportTicket.objects.filter(id=ticket_id).first()
        if not ticket:
            return Response(status=404, data={"error": "Ticket not found."})

        serializer = SupportTicketReplyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        is_internal_note = data.get("is_internal_note", False)

        required_permission = "support.internal_notes" if is_internal_note else "support.reply"
        if required_permission not in get_staff_permissions(request.user) and not is_super_admin(request.user):
            return Response(
                status=403, data={"error": "Access denied", "required_permission": required_permission}
            )

        reply = ticket.replies.create(
            sent_by=request.user,
            is_admin_reply=not is_internal_note,
            is_internal_note=is_internal_note,
            message=data["message"],
        )
        create_attachments(data.get("attachments") or [], ticket=ticket, reply=reply)

        update_fields = ["updated_at"]
        if not is_internal_note:
            if ticket.status == SupportTicket.Status.OPEN:
                ticket.status = SupportTicket.Status.IN_PROGRESS
                update_fields.append("status")
        ticket.save(update_fields=update_fields)

        if not is_internal_note:
            from emails import emails

            if ticket.submitted_by:
                try:
                    emails.ticket_admin_replied_mail(ticket.submitted_by, ticket, reply)
                except Exception:
                    logger.exception("Failed to send ticket_admin_replied email for %s", ticket.id)

                try:
                    notify_user(
                        ticket.submitted_by,
                        title=f"New reply on {ticket.display_number}",
                        message=reply.message[:200],
                        notification_type=Notification.Type.GENERAL,
                        link_path=f"recruiter/dashboard/support/tickets/{ticket.id}",
                        link_label="View ticket",
                        sent_by=request.user,
                    )
                except Exception:
                    logger.exception("Failed to create in-app notification for ticket %s", ticket.id)
            elif ticket.contact_email:
                # Public contact-form ticket -- no account to notify in-app,
                # email the address they submitted with instead.
                try:
                    emails.public_contact_admin_replied_mail(ticket.contact_name, ticket.contact_email, ticket, reply)
                except Exception:
                    logger.exception("Failed to send public_contact_admin_replied email for %s", ticket.id)

        log_staff_activity(
            request.user,
            "support.internal_note" if is_internal_note else "support.reply",
            "SupportTicket", ticket.id, {"reply_id": reply.id},
        )

        return Response(
            status=201,
            data=SupportTicketDetailSerializer(ticket, context={"include_internal_notes": True}).data,
        )
