from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from create_user.models import Company
from staff.permissions import requirePermission
from staff.utils import log_staff_activity
from tags.models import OrganisationTag, Tag, TagAuditLog
from tags.serializers import (
    CustomTagCreateSerializer,
    OrganisationTagSerializer,
    TagAuditLogSerializer,
    TagSerializer,
)
from tags.tasks import evaluate_company_tags, get_last_rule_run


class _TagsBaseView(APIView):
    permission_classes = [requirePermission("tags.view")]


class _TagsManageMixin:
    """Views that only write (no GET) -- everything here needs tags.manage."""

    def get_permissions(self):
        return [requirePermission("tags.manage")()]


def _with_tagged_counts(qs):
    return qs.annotate(
        tagged_organisation_count=Count(
            "organisation_tags", filter=Q(organisation_tags__removed_at__isnull=True), distinct=True
        )
    )


class SystemTagListView(_TagsBaseView):
    def get(self, request):
        tags = _with_tagged_counts(Tag.objects.filter(tag_type=Tag.TagType.SYSTEM)).order_by("category", "name")
        last_run = get_last_rule_run()
        return Response({
            "last_rule_run": last_run.isoformat() if last_run else None,
            "results": TagSerializer(tags, many=True).data,
        })


class SystemTagDeactivateView(_TagsManageMixin, _TagsBaseView):
    def post(self, request, tag_id):
        tag = Tag.objects.filter(id=tag_id, tag_type=Tag.TagType.SYSTEM).first()
        if not tag:
            return Response({"error": "Tag not found"}, status=404)
        tag.is_active = False
        tag.save(update_fields=["is_active"])
        return Response(TagSerializer(tag).data)


class SystemTagActivateView(_TagsManageMixin, _TagsBaseView):
    def post(self, request, tag_id):
        tag = Tag.objects.filter(id=tag_id, tag_type=Tag.TagType.SYSTEM).first()
        if not tag:
            return Response({"error": "Tag not found"}, status=404)
        tag.is_active = True
        tag.save(update_fields=["is_active"])
        return Response(TagSerializer(tag).data)


class CustomTagListCreateView(_TagsBaseView):
    def get_permissions(self):
        slug = "tags.view" if self.request.method == "GET" else "tags.manage"
        return [requirePermission(slug)()]

    def get(self, request):
        tags = _with_tagged_counts(Tag.objects.filter(tag_type=Tag.TagType.CUSTOM)).order_by("-created_at")
        return Response(TagSerializer(tags, many=True).data)

    def post(self, request):
        serializer = CustomTagCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tag = serializer.save(tag_type=Tag.TagType.CUSTOM, category=Tag.Category.CUSTOM, created_by_admin=request.user)
        return Response(TagSerializer(tag).data, status=201)


class CustomTagApplyView(_TagsManageMixin, _TagsBaseView):
    def post(self, request, tag_id):
        tag = Tag.objects.filter(id=tag_id, tag_type=Tag.TagType.CUSTOM).first()
        if not tag:
            return Response({"error": "Custom tag not found"}, status=404)

        organisation_ids = request.data.get("organisation_ids") or []
        existing = set(
            OrganisationTag.objects.filter(
                tag=tag, organisation_id__in=organisation_ids, removed_at__isnull=True
            ).values_list("organisation_id", flat=True)
        )
        to_apply = [oid for oid in organisation_ids if oid not in existing]

        OrganisationTag.objects.bulk_create([
            OrganisationTag(organisation_id=oid, tag=tag, applied_by_admin=request.user) for oid in to_apply
        ])
        TagAuditLog.objects.bulk_create([
            TagAuditLog(
                organisation_id=oid, tag=tag, action=TagAuditLog.Action.APPLIED,
                triggered_by=TagAuditLog.TriggeredBy.ADMIN_MANUAL, admin=request.user,
                reason="Manually applied by admin",
            )
            for oid in to_apply
        ])
        return Response({"applied": len(to_apply), "already_tagged": len(existing)})


class CustomTagRemoveView(_TagsManageMixin, _TagsBaseView):
    def post(self, request, tag_id):
        tag = Tag.objects.filter(id=tag_id, tag_type=Tag.TagType.CUSTOM).first()
        if not tag:
            return Response({"error": "Custom tag not found"}, status=404)

        organisation_id = request.data.get("organisation_id")
        updated = OrganisationTag.objects.filter(
            tag=tag, organisation_id=organisation_id, removed_at__isnull=True
        ).update(removed_at=timezone.now())
        if updated:
            TagAuditLog.objects.create(
                organisation_id=organisation_id, tag=tag, action=TagAuditLog.Action.REMOVED,
                triggered_by=TagAuditLog.TriggeredBy.ADMIN_MANUAL, admin=request.user,
                reason="Manually removed by admin",
            )
        return Response({"removed": bool(updated)})


class TagOrganisationsView(_TagsBaseView):
    def get(self, request, tag_id):
        tag = Tag.objects.filter(id=tag_id).first()
        if not tag:
            return Response({"error": "Tag not found"}, status=404)
        rows = list(
            OrganisationTag.objects.filter(tag=tag, removed_at__isnull=True)
            .select_related("organisation")
            .order_by("-applied_at")
            .values("organisation_id", "organisation__company_name", "applied_at")
        )
        return Response([
            {"id": r["organisation_id"], "company_name": r["organisation__company_name"], "applied_at": r["applied_at"]}
            for r in rows
        ])


class OrganisationTagsView(_TagsBaseView):
    def get_permissions(self):
        slug = "organisations.view" if self.request.method == "GET" else "organisations.tags.manage"
        return [requirePermission(slug)()]

    def get(self, request, company_id):
        rows = OrganisationTag.objects.filter(
            organisation_id=company_id, removed_at__isnull=True
        ).select_related("tag", "applied_by_admin").order_by("-applied_at")
        return Response(OrganisationTagSerializer(rows, many=True).data)

    def post(self, request, company_id):
        tag_id = request.data.get("tag_id")
        tag = Tag.objects.filter(id=tag_id, tag_type=Tag.TagType.CUSTOM).first()
        if not tag:
            return Response({"error": "Custom tag not found (only custom tags can be applied manually)"}, status=404)
        if not Company.objects.filter(id=company_id).exists():
            return Response({"error": "Organisation not found"}, status=404)

        obj = OrganisationTag.objects.filter(
            organisation_id=company_id, tag=tag, removed_at__isnull=True
        ).first()
        created = obj is None
        if created:
            obj = OrganisationTag.objects.create(
                organisation_id=company_id, tag=tag, applied_by_admin=request.user
            )
        if created:
            TagAuditLog.objects.create(
                organisation_id=company_id, tag=tag, action=TagAuditLog.Action.APPLIED,
                triggered_by=TagAuditLog.TriggeredBy.ADMIN_MANUAL, admin=request.user,
                reason="Manually applied by admin",
            )
            log_staff_activity(
                request.user, "organisations.tags.change", "Company", company_id,
                {"tag": tag.name, "action": "apply"},
            )
        return Response(OrganisationTagSerializer(obj).data, status=201 if created else 200)

    def delete(self, request, company_id):
        tag_id = request.data.get("tag_id") or request.query_params.get("tag_id")
        tag = Tag.objects.filter(id=tag_id).first()
        if not tag:
            return Response({"error": "Tag not found"}, status=404)
        updated = OrganisationTag.objects.filter(
            organisation_id=company_id, tag=tag, removed_at__isnull=True
        ).update(removed_at=timezone.now())
        if updated:
            TagAuditLog.objects.create(
                organisation_id=company_id, tag=tag, action=TagAuditLog.Action.REMOVED,
                triggered_by=TagAuditLog.TriggeredBy.ADMIN_MANUAL, admin=request.user,
                reason="Manually removed by admin",
            )
            log_staff_activity(
                request.user, "organisations.tags.change", "Company", company_id,
                {"tag": tag.name, "action": "remove"},
            )
        return Response({"removed": bool(updated)})


class OrganisationTagTimelineView(_TagsBaseView):
    permission_classes = [requirePermission("organisations.view")]

    def get(self, request, company_id):
        logs = TagAuditLog.objects.filter(organisation_id=company_id).select_related("tag", "admin")[:50]
        return Response(TagAuditLogSerializer(logs, many=True).data)


class OrganisationReevaluateView(_TagsBaseView):
    """Manual "re-run rules now" trigger for a single organisation, exposed
    from the org detail page -- uses the same immediate-eval path as the
    real-time triggers, just admin-initiated rather than event-initiated."""

    permission_classes = [requirePermission("organisations.tags.manage")]

    def post(self, request, company_id):
        if not Company.objects.filter(id=company_id).exists():
            return Response({"error": "Organisation not found"}, status=404)
        evaluate_company_tags.delay(company_id)
        return Response({"status": "queued"})
