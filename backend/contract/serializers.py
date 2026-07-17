from django.utils import timezone
from rest_framework import serializers
from .models import Contract

class ContractSerializer(serializers.ModelSerializer):
    talent = serializers.StringRelatedField()
    company = serializers.StringRelatedField()
    role_name = serializers.ReadOnlyField(source="role.title")
    company = serializers.StringRelatedField(read_only=True)
    company_email = serializers.ReadOnlyField(source="company.company_email")
    talent_email = serializers.ReadOnlyField(source="talent.user.email")
    full_name = serializers.SerializerMethodField()
    talent_profile_pic = serializers.SerializerMethodField()
    recruiter_profile_pic = serializers.SerializerMethodField()
    account_name = serializers.ReadOnlyField(source="talent.account_name")
    bank_name = serializers.ReadOnlyField(source="talent.bank_name")
    account_number = serializers.ReadOnlyField(source="talent.account_number")

    class Meta:
        model = Contract
        fields = (
            'id', 'talent', 'company', 'company_email', 'role', 'role_name', 
            'mode', 'value', 'expires', 'created', 'updated',  "talent_email", 
            "full_name", "talent_profile_pic", "recruiter_profile_pic",
            "account_name", "account_number", "bank_name", "talent_salary"
        )
        read_only_fields = ('talent', 'company')

    def validate_expires(self, value):
        if timezone.now() > value:
            raise serializers.ValidationError("Contract expiration has to be in future")
        return value

    def get_full_name(self, obj):
        return obj.talent.user.get_full_name()

    def get_talent_profile_pic(self, obj):
        return obj.talent.user.get_profile_pic()

    def get_recruiter_profile_pic(self, obj):
        return obj.company.company_rep.get_profile_pic()
