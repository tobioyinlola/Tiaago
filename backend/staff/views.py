import logging

from django.core.cache import cache
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from base.mixins.pagination import TiaagoPagination
from create_user.models import CustomUser

from .models import StaffActivityLog, StaffPermission, StaffRole
from .permissions import (
    invalidate_staff_permissions_cache,
    is_super_admin,
    requirePermission,
    SUPER_ADMIN_SLUG,
)
from .serializers import (
    StaffActivityLogSerializer,
    StaffInviteCreateSerializer,
    StaffMemberDetailSerializer,
    StaffMemberListSerializer,
    StaffPermissionSerializer,
    StaffRoleChangeSerializer,
    StaffRoleSerializer,
    StaffRoleWriteSerializer,
)
from .tasks import send_staff_invite_email
from .utils import log_staff_activity

logger = logging.getLogger("staff")


def _bust_session_cache(user_id):
    cache.delete(f"jwt_user:{user_id}")
    invalidate_staff_permissions_cache(user_id)


class StaffPermissionListAPIView(generics.ListAPIView):
    """Full permission catalogue, grouped for the role-editor checklist."""

    serializer_class = StaffPermissionSerializer
    permission_classes = [requirePermission("staff.roles.manage")]
    pagination_class = None
    queryset = StaffPermission.objects.all()


class StaffRoleListCreateAPIView(generics.ListCreateAPIView):
    queryset = StaffRole.objects.all()

    def get_permissions(self):
        if self.request.method == "GET":
            permission_classes = [requirePermission("staff.view")]
        else:
            permission_classes = [requirePermission("staff.roles.manage")]
        return [p() for p in permission_classes]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return StaffRoleWriteSerializer
        return StaffRoleSerializer

    def perform_create(self, serializer):
        role = serializer.save()
        log_staff_activity(self.request.user, "role.create", "StaffRole", role.id, {"name": role.name})


class StaffRoleDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = StaffRole.objects.all()
    lookup_field = "pk"

    def get_permissions(self):
        if self.request.method == "GET":
            permission_classes = [requirePermission("staff.view")]
        else:
            permission_classes = [requirePermission("staff.roles.manage")]
        return [p() for p in permission_classes]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return StaffRoleWriteSerializer
        return StaffRoleSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.slug == SUPER_ADMIN_SLUG:
            return Response(
                {"error": "The Super Admin role cannot be edited."}, status=status.HTTP_400_BAD_REQUEST
            )
        response = super().update(request, *args, **kwargs)
        # Permission-set changes must take effect immediately for every
        # currently-assigned member, not wait out the 60s cache TTL.
        for member_id in instance.staff_members.values_list("id", flat=True):
            invalidate_staff_permissions_cache(member_id)
        log_staff_activity(
            request.user, "role.permission_change", "StaffRole", instance.id, {"name": instance.name}
        )
        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system_role:
            return Response(
                {"error": "System roles cannot be deleted."}, status=status.HTTP_400_BAD_REQUEST
            )
        member_count = instance.staff_members.count()
        if member_count:
            return Response(
                {
                    "error": f"{member_count} staff member{'s' if member_count != 1 else ''} currently have this "
                             "role. Reassign them to another role before deleting."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        log_staff_activity(request.user, "role.delete", "StaffRole", instance.id, {"name": instance.name})
        return super().destroy(request, *args, **kwargs)


class StaffMemberListAPIView(generics.ListAPIView):
    serializer_class = StaffMemberListSerializer
    permission_classes = [requirePermission("staff.view")]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["staff_role", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["created", "last_login"]
    ordering = ["-created"]
    pagination_class = TiaagoPagination
    queryset = CustomUser.staff_objects.select_related("staff_role", "invited_by_admin").all()


class StaffMemberDetailAPIView(generics.RetrieveAPIView):
    serializer_class = StaffMemberDetailSerializer
    permission_classes = [requirePermission("staff.view")]
    queryset = CustomUser.staff_objects.select_related("staff_role", "invited_by_admin").all()


class StaffInviteCreateAPIView(APIView):
    permission_classes = [requirePermission("staff.invite")]

    def post(self, request):
        serializer = StaffInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        role = StaffRole.objects.get(slug=data["role_slug"])
        if role.slug == SUPER_ADMIN_SLUG and not is_super_admin(request.user):
            return Response(
                {"error": "Only a Super Admin can assign the Super Admin role."},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            user = CustomUser.objects.create_user(
                username=data["email"],
                email=data["email"],
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
                user_type=CustomUser.USER_TYPE.STAFF,
                is_verified=True,
            )
            user.set_unusable_password()
            user.staff_role = role
            user.invited_by_admin = request.user
            user.invited_at = timezone.now()
            user.save(update_fields=["password", "staff_role", "invited_by_admin", "invited_at"])

        inviter_name = request.user.get_full_name() or request.user.email
        send_staff_invite_email.delay(user.id, inviter_name)
        log_staff_activity(
            request.user, "staff.invite", "CustomUser", user.id, {"email": user.email, "role": role.slug}
        )
        return Response(StaffMemberDetailSerializer(user).data, status=status.HTTP_201_CREATED)


class StaffDeactivateAPIView(APIView):
    permission_classes = [requirePermission("staff.manage")]

    def post(self, request, pk):
        target = CustomUser.staff_objects.filter(pk=pk).first()
        if not target:
            return Response({"error": "Staff member not found."}, status=status.HTTP_404_NOT_FOUND)
        if target.id == request.user.id:
            return Response({"error": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if is_super_admin(target):
            active_super_admins = CustomUser.staff_objects.filter(
                staff_role__slug=SUPER_ADMIN_SLUG, is_active=True
            ).count()
            if active_super_admins <= 1:
                return Response(
                    {"error": "You cannot deactivate the last Super Admin account"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        target.is_active = False
        target.session_version = F("session_version") + 1
        target.save(update_fields=["is_active", "session_version"])
        _bust_session_cache(target.id)
        log_staff_activity(request.user, "staff.deactivate", "CustomUser", target.id, {"email": target.email})
        return Response(StaffMemberDetailSerializer(target).data)


class StaffActivateAPIView(APIView):
    permission_classes = [requirePermission("staff.manage")]

    def post(self, request, pk):
        target = CustomUser.staff_objects.filter(pk=pk).first()
        if not target:
            return Response({"error": "Staff member not found."}, status=status.HTTP_404_NOT_FOUND)

        target.is_active = True
        target.save(update_fields=["is_active"])
        log_staff_activity(request.user, "staff.activate", "CustomUser", target.id, {"email": target.email})
        return Response(StaffMemberDetailSerializer(target).data)


class StaffRoleChangeAPIView(APIView):
    permission_classes = [requirePermission("staff.manage")]

    def post(self, request, pk):
        target = CustomUser.staff_objects.filter(pk=pk).first()
        if not target:
            return Response({"error": "Staff member not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StaffRoleChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_role = StaffRole.objects.get(slug=serializer.validated_data["role_slug"])

        if new_role.slug == SUPER_ADMIN_SLUG and not is_super_admin(request.user):
            return Response(
                {"error": "Only a Super Admin can assign the Super Admin role."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Demoting the last active Super Admin away from super_admin has the
        # same lockout effect deactivating them would -- and re-granting the
        # role afterward requires already being a Super Admin, so it would
        # be unrecoverable. Guard this the same way StaffDeactivateAPIView
        # guards deactivation.
        if is_super_admin(target) and new_role.slug != SUPER_ADMIN_SLUG:
            active_super_admins = CustomUser.staff_objects.filter(
                staff_role__slug=SUPER_ADMIN_SLUG, is_active=True
            ).count()
            if active_super_admins <= 1:
                return Response(
                    {"error": "You cannot change the role of the last Super Admin account"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        old_role_slug = target.staff_role.slug if target.staff_role else None
        target.staff_role = new_role
        target.session_version = F("session_version") + 1
        target.save(update_fields=["staff_role", "session_version"])
        _bust_session_cache(target.id)
        log_staff_activity(
            request.user,
            "staff.role_change",
            "CustomUser",
            target.id,
            {"old_role": old_role_slug, "new_role": new_role.slug},
        )
        return Response(StaffMemberDetailSerializer(target).data)


class StaffActivityLogListAPIView(generics.ListAPIView):
    serializer_class = StaffActivityLogSerializer
    permission_classes = [requirePermission("staff.view")]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["actor", "action"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]
    pagination_class = TiaagoPagination
    queryset = StaffActivityLog.objects.select_related("actor").all()
