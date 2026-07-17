from rest_framework import serializers

from campaigns.block_renderer import ensure_footer, render_blocks
from campaigns.models import CampaignSend, EmailCampaign, EmailTemplate


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            "id", "name", "category", "subject_line", "preview_text", "blocks",
            "html_body", "plain_text_body", "merge_tags", "thumbnail_url", "is_preset",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "html_body", "plain_text_body", "is_preset", "created_at", "updated_at"]

    def create(self, validated_data):
        blocks = ensure_footer(validated_data.get("blocks") or [])
        html_body, plain_text_body = render_blocks(blocks)
        validated_data["blocks"] = blocks
        validated_data["html_body"] = html_body
        validated_data["plain_text_body"] = plain_text_body
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "blocks" in validated_data:
            blocks = ensure_footer(validated_data["blocks"])
            html_body, plain_text_body = render_blocks(blocks)
            validated_data["blocks"] = blocks
            validated_data["html_body"] = html_body
            validated_data["plain_text_body"] = plain_text_body
        return super().update(instance, validated_data)


class EmailCampaignSerializer(serializers.ModelSerializer):
    audience_segment_name = serializers.CharField(source="audience_segment.name", read_only=True, default=None)
    audience_tag_name = serializers.CharField(source="audience_tag.name", read_only=True, default=None)
    email_template_name = serializers.CharField(source="email_template.name", read_only=True, default=None)
    recipient_count = serializers.SerializerMethodField()

    class Meta:
        model = EmailCampaign
        fields = [
            "id", "name", "subject_line", "preview_text",
            "audience_type", "audience_segment", "audience_segment_name",
            "audience_tag", "audience_tag_name", "manual_organisation_ids",
            "email_template", "email_template_name", "template_variables",
            "status", "schedule_type", "scheduled_for", "sent_at",
            "created_by_admin", "created_at", "updated_at", "recipient_count",
        ]
        read_only_fields = ["id", "status", "sent_at", "created_by_admin", "created_at", "updated_at"]

    def get_recipient_count(self, obj):
        return CampaignSend.objects.filter(campaign=obj).count()
