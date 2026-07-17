from rest_framework import serializers

from create_user.models import CustomUser, Company
from segments.models import AudienceSegment
from tags.models import Tag
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id", "type", "title", "message", "link_url", "link_label",
            "created_at", "is_read",
        )

    def get_is_read(self, obj):
        read_ids = self.context.get("read_notification_ids")
        if read_ids is not None:
            return obj.id in read_ids
        return obj.reads.filter(user=self.context["request"].user).exists()


class NotificationComposeSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=Notification.Type.choices)
    title = serializers.CharField(max_length=80)
    message = serializers.CharField()
    link_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    link_label = serializers.CharField(max_length=60, required=False, allow_blank=True, allow_null=True)
    target_scope = serializers.ChoiceField(choices=Notification.TargetScope.choices)
    target_organisation = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), required=False, allow_null=True
    )
    segment = serializers.PrimaryKeyRelatedField(
        queryset=AudienceSegment.objects.all(), required=False, allow_null=True
    )
    tag = serializers.PrimaryKeyRelatedField(queryset=Tag.objects.all(), required=False, allow_null=True)

    def validate(self, attrs):
        scope = attrs["target_scope"]
        if scope == Notification.TargetScope.ORGANISATION and not attrs.get("target_organisation"):
            raise serializers.ValidationError({"target_organisation": "Select an organisation to target."})
        if scope == Notification.TargetScope.SEGMENT and not attrs.get("segment"):
            raise serializers.ValidationError({"segment": "Select a segment to target."})
        if scope == Notification.TargetScope.TAG and not attrs.get("tag"):
            raise serializers.ValidationError({"tag": "Select a tag to target."})
        return attrs


class _OrgNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "company_name")


class NotificationHistorySerializer(serializers.ModelSerializer):
    target_organisation = _OrgNameSerializer(read_only=True)
    segment_name = serializers.CharField(source="segment.name", read_only=True, default=None)
    tag_name = serializers.CharField(source="tag.name", read_only=True, default=None)
    sent_by_name = serializers.SerializerMethodField()
    recipients_count = serializers.IntegerField(read_only=True)
    read_count = serializers.IntegerField(read_only=True)
    read_rate_pct = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id", "type", "title", "message", "link_url", "link_label",
            "target_scope", "target_organisation", "segment_name", "tag_name", "sent_by_name",
            "recipients_count", "read_count", "read_rate_pct", "created_at",
        )

    def get_sent_by_name(self, obj):
        if not obj.sent_by:
            return None
        return (obj.sent_by.get_full_name() or "").strip() or obj.sent_by.username

    def get_read_rate_pct(self, obj):
        if not obj.recipients_count:
            return 0
        return round((obj.read_count / obj.recipients_count) * 100, 1)


class OrganisationSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "company_name")
