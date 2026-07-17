from rest_framework import serializers

from tags.models import OrganisationTag, Tag, TagAuditLog


class TagSerializer(serializers.ModelSerializer):
    tagged_organisation_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Tag
        fields = [
            "id", "name", "slug", "description", "colour", "tag_type", "category",
            "is_active", "created_at", "created_by_admin", "tagged_organisation_count",
        ]
        read_only_fields = ["id", "slug", "tag_type", "created_at", "created_by_admin"]


class CustomTagCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["name", "description", "colour"]

    def validate_name(self, value):
        if Tag.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A tag with this name already exists.")
        return value


class OrganisationTagSerializer(serializers.ModelSerializer):
    tag = TagSerializer(read_only=True)
    applied_by_admin_name = serializers.SerializerMethodField()

    class Meta:
        model = OrganisationTag
        fields = ["id", "tag", "applied_at", "removed_at", "applied_by_admin_name"]

    def get_applied_by_admin_name(self, obj):
        if obj.applied_by_admin_id:
            return obj.applied_by_admin.get_full_name() or obj.applied_by_admin.email
        return None


class TagAuditLogSerializer(serializers.ModelSerializer):
    tag_name = serializers.CharField(source="tag.name", read_only=True)
    tag_slug = serializers.CharField(source="tag.slug", read_only=True)
    admin_name = serializers.SerializerMethodField()

    class Meta:
        model = TagAuditLog
        fields = ["id", "tag_name", "tag_slug", "action", "triggered_by", "admin_name", "reason", "occurred_at"]

    def get_admin_name(self, obj):
        if obj.admin_id:
            return obj.admin.get_full_name() or obj.admin.email
        return None
