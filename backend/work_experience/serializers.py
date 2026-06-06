from rest_framework import serializers
from .models import WorkExperience

class WorkExperienceSerializer(serializers.ModelSerializer):
    talent = serializers.StringRelatedField()
    class Meta:
        model = WorkExperience
        fields = ('id', 'organization', 'role', 'year_from', 'year_to', 'talent', 'organization_logo')
        read_only_fields = ('talent',)