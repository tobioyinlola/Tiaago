from rest_framework.serializers import ModelSerializer

from .models import Role


class RoleSerializer(ModelSerializer):

    class Meta:
        model = Role
        fields = ("id", "title", "is_technical", "slug", "is_recruiter_role")
        read_only_fields = ("id", "slug")
