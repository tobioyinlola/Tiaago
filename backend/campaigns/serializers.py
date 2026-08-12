from rest_framework import serializers

from campaigns.block_renderer import ensure_footer, render_blocks
from campaigns.models import CampaignEmail, CampaignSend, EmailCampaign, EmailTemplate


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


class CampaignEmailSerializer(serializers.ModelSerializer):
    email_template_name = serializers.CharField(source="email_template.name", read_only=True, default=None)

    class Meta:
        model = CampaignEmail
        fields = [
            "id", "campaign", "sequence_number", "email_template", "email_template_name",
            "subject", "preview_text", "from_name", "reply_to",
            "send_delay_type", "send_delay_hours", "send_delay_days", "condition_type",
            "status", "sent_at", "total_sent", "total_opened", "total_clicked", "created_at",
        ]
        read_only_fields = ["id", "status", "sent_at", "total_sent", "total_opened", "total_clicked", "created_at"]


class EmailCampaignSerializer(serializers.ModelSerializer):
    audience_segment_name = serializers.CharField(source="audience_segment.name", read_only=True, default=None)
    audience_tag_name = serializers.CharField(source="audience_tag.name", read_only=True, default=None)
    recipient_count = serializers.SerializerMethodField()
    emails = CampaignEmailSerializer(many=True, read_only=True)

    class Meta:
        model = EmailCampaign
        fields = [
            "id", "name", "audience_pool",
            "audience_type", "audience_segment", "audience_segment_name",
            "audience_tag", "audience_tag_name", "manual_organisation_ids",
            "tn_role_categories", "tn_industries", "tn_years_experience", "tn_work_type",
            "status", "schedule_type", "scheduled_for", "sent_at",
            "created_by_admin", "created_at", "updated_at", "recipient_count", "emails",
        ]
        read_only_fields = ["id", "status", "sent_at", "created_by_admin", "created_at", "updated_at"]

    def get_recipient_count(self, obj):
        # Distinct recipients, not distinct sends -- a sequence gives one
        # recipient multiple CampaignSend rows (one per step).
        return CampaignSend.objects.filter(campaign=obj).values("recipient_email").distinct().count()
