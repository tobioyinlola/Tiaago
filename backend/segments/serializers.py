from rest_framework import serializers

from segments.models import AudienceSegment


class AudienceSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudienceSegment
        fields = [
            "id", "name", "description", "conditions", "match_type",
            "estimated_size", "last_evaluated_at", "created_by_admin", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "estimated_size", "last_evaluated_at", "created_by_admin", "created_at", "updated_at"]
