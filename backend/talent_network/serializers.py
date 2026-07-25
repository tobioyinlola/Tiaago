from rest_framework import serializers

from .choices import TalentNetworkMemberStatus
from .models import JobMatchNotification, TalentNetworkMember


class TalentNetworkJoinSerializer(serializers.ModelSerializer):
    """Public registration form -- see the landing page at
    frontend/app/talent-network/. Only ever creates PENDING_CONFIRMATION
    members; consent must be explicitly true (double opt-in still applies
    on top via the confirmation email)."""

    consent = serializers.BooleanField()

    class Meta:
        model = TalentNetworkMember
        fields = [
            "first_name", "last_name", "email", "phone",
            "country", "state", "city",
            "job_title", "years_experience", "industry", "interested_roles",
            "preferred_work_type", "preferred_locations",
            "communities", "other_community",
            "email_frequency", "consent",
        ]

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("You must agree to receive job opportunities to join the Talent Network.")
        return value

    def validate_interested_roles(self, value):
        if not value:
            raise serializers.ValidationError("Select at least one role you're interested in.")
        return value


class TalentNetworkMemberSerializer(serializers.ModelSerializer):
    """Admin-facing member detail/list serializer."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = TalentNetworkMember
        fields = [
            "id", "full_name", "first_name", "last_name", "email", "phone",
            "country", "state", "city",
            "job_title", "years_experience", "industry", "interested_roles",
            "preferred_work_type", "preferred_locations",
            "communities", "other_community",
            "email_frequency", "consent", "status",
            "created_at", "updated_at", "last_email_sent", "last_opened",
        ]
        read_only_fields = fields


class JobMatchNotificationSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    job_title = serializers.CharField(source="job.role", read_only=True)

    class Meta:
        model = JobMatchNotification
        fields = [
            "id", "job", "job_title", "member", "member_name",
            "match_score", "matched_criteria", "status", "send_channel",
            "sent_at", "opened_at", "clicked_at", "applied_at", "created_at",
        ]
        read_only_fields = fields
