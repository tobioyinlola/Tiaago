from rest_framework import serializers
from create_user.models import CustomUser, SocialMediaLink


class CustomUserSerializer(serializers.ModelSerializer):
    profile_pic_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "user_type",
            "phone_number",
            "country",
            "bio",
            "profile_pic_url",
            "meeting_token",
            "verified",
            "created",
            "referral_code",
            "auth_provider",
        )
    def get_profile_pic_url(self, obj):
        if obj.profile_pic and hasattr(obj.profile_pic, 'url'):
            return obj.profile_pic.url
        return None


class SocialMediaLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialMediaLink
        fields = ["name", "url", "id"]

class DummySerializer(serializers.Serializer):
    message = serializers.CharField(default="This is a dummy serializer for Swagger documentation purposes.")
    status = serializers.CharField(default="success")

    class Meta:
        fields = ['message', 'status']
        
