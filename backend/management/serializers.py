from rest_framework import serializers

from .models import EmailTrack


class EmailTrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTrack
        fields = [
            "id",
            "email",
            "email_type",
            "status",
            "delivery_status",
            "provider_message_id",
            "opened_at",
            "clicked_at",
            "created_at",
        ]
