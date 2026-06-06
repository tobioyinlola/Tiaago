from rest_framework import serializers

from .models import (
    CaseStudyProject,
    TalentCaseStudyProject
)

class CaseStudyProjectSerializer(serializers.ModelSerializer):
    role_names = serializers.SerializerMethodField()

    class Meta:
        model = CaseStudyProject
        fields = ('id', 'title', 'about', 'roles', 'role_names')

    def get_role_names(self, obj):
        return [role.title for role in obj.roles.all()]


class TalentAttemptCaseStudySerializer(serializers.ModelSerializer):
    project = serializers.StringRelatedField()
    talent = serializers.StringRelatedField()
    project_id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    
    class Meta:
        model = TalentCaseStudyProject
        fields = (
            'id', 'project_id', 'project', 'user_id', 'talent', 'approved', 'submission', 
            'remark', 'created', 'updated', 'last_attempt')
        read_only_fields = ('project', 'talent', 'approved', 'last_attempt', 'remark')

    def get_project_id(self, obj):
        return obj.project.id

    def get_user_id(self, obj):
        return obj.talent.user.id


class AdminApproveTalentAttemptCaseStudySerializer(serializers.ModelSerializer):
    project = serializers.StringRelatedField()
    talent = serializers.StringRelatedField()

    class Meta:
        model = TalentCaseStudyProject
        fields = ('id', 'project', 'talent', 'approved', 'submission', 'remark', 'created', 'updated', 'last_attempt')
        read_only_fields = ('project', 'talent', 'last_attempt', 'submission')

    def get_project(self, obj):
        return obj.project.title

    def get_talent(self, obj):
        return obj.talent.user.username