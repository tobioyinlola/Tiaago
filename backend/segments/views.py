from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from segments.evaluation import evaluate_segment
from segments.models import AudienceSegment
from segments.serializers import AudienceSegmentSerializer
from staff.permissions import requirePermission


class _SegmentsBaseView(APIView):
    """Segments reuse the tags.* permission slugs (spec groups Tags and
    Segments together with no separate segments.* namespace)."""

    def get_permissions(self):
        slug = "tags.view" if self.request.method == "GET" else "tags.manage"
        return [requirePermission(slug)()]


def _refresh_estimated_size(segment):
    qs = evaluate_segment(segment.conditions, segment.match_type)
    segment.estimated_size = qs.count()
    segment.last_evaluated_at = timezone.now()
    segment.save(update_fields=["estimated_size", "last_evaluated_at"])
    return segment


class SegmentListCreateView(_SegmentsBaseView):
    def get(self, request):
        segments = AudienceSegment.objects.all()
        return Response(AudienceSegmentSerializer(segments, many=True).data)

    def post(self, request):
        serializer = AudienceSegmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        segment = serializer.save(created_by_admin=request.user)
        segment = _refresh_estimated_size(segment)
        return Response(AudienceSegmentSerializer(segment).data, status=201)


class SegmentDetailView(_SegmentsBaseView):
    def get(self, request, segment_id):
        segment = AudienceSegment.objects.filter(id=segment_id).first()
        if not segment:
            return Response({"error": "Segment not found"}, status=404)
        return Response(AudienceSegmentSerializer(segment).data)

    def patch(self, request, segment_id):
        segment = AudienceSegment.objects.filter(id=segment_id).first()
        if not segment:
            return Response({"error": "Segment not found"}, status=404)
        serializer = AudienceSegmentSerializer(segment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        segment = serializer.save()
        segment = _refresh_estimated_size(segment)
        return Response(AudienceSegmentSerializer(segment).data)

    def delete(self, request, segment_id):
        deleted, _ = AudienceSegment.objects.filter(id=segment_id).delete()
        return Response(status=204 if deleted else 404)


class SegmentPreviewView(_SegmentsBaseView):
    """Live, un-saved preview for the segment builder -- debounced on the
    frontend. Always uses .count() for size, never a full fetch."""

    def get_permissions(self):
        return [requirePermission("tags.view")()]

    def post(self, request):
        conditions = request.data.get("conditions") or []
        match_type = request.data.get("match_type") or "ALL"

        qs = evaluate_segment(conditions, match_type)
        estimated_size = qs.count()
        sample = list(qs.order_by("-created_at").values("id", "company_name")[:5])

        breakdown = None
        if conditions:
            breakdown = [
                {"condition": condition, "count": evaluate_segment([condition], "ALL").count()}
                for condition in conditions
            ]

        return Response({
            "estimated_size": estimated_size,
            "sample_organisations": [{"id": r["id"], "company_name": r["company_name"]} for r in sample],
            "match_type": match_type,
            "breakdown": breakdown,
        })
