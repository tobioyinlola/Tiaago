from rest_framework import serializers

from .models import AtsConnection, AtsProvider


class AtsConnectSessionInputSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=AtsProvider.choices)


class AtsSyncTriggerInputSerializer(serializers.Serializer):
    """Only required on the first call for a given connection -- the
    frontend sends these once Nango's Connect UI reports a successful auth.
    Omit both on a retry of an already-CONNECTED/FAILED connection."""

    nango_connection_id = serializers.CharField(required=False, allow_blank=False)
    provider_config_key = serializers.CharField(required=False, allow_blank=False)


class AtsConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AtsConnection
        fields = (
            "id",
            "provider",
            "status",
            "candidates_synced",
            "jobs_synced",
            "error_message",
            "connected_at",
            "synced_at",
            "disconnected_at",
            "created_at",
        )
        read_only_fields = fields
