from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from subscriptions.models import SubPlan

from .models import Scheduler

User = get_user_model()

class SchedulerSerializer(serializers.ModelSerializer):

    company_logo = serializers.ReadOnlyField(source="company.get_logo_url")
    company_name = serializers.ReadOnlyField(source="company.company_name")

    class Meta:
        model = Scheduler
        fields =(
            'id', 'title', 'meeting_date', 'start_time', 'end_time', 'talent',
            'room_name', 'room_url', 'no_of_participants', 'company',
            'token', 'created_on', "description", "accepted", 
            "company_name", "company_logo", "additional_emails"
        )
        read_only_fields = ('room_name', 'room_url', 'company', 'accepted', "token")


    def validate(self, data):
        now = timezone.now()
        if data["meeting_date"] < now.date():
            raise serializers.ValidationError("Meeting date must be on or after today")
        if data["start_time"] > data["end_time"]:
            raise serializers.ValidationError("end_time must be greater than start_time")
        if data["meeting_date"] == now.date() and data["start_time"] < now.time():
            raise serializers.ValidationError("start_time cannot be before now")
        return super().validate(data)

    def validate_talent(self, value):
        user = value.user

        # check if the talent is verified
        if not user.verified:
            raise serializers.ValidationError("You cannot schedule a call with an unverified user")

        return value

class SchedulerUpdateSerializer(serializers.ModelSerializer):
    talent = serializers.StringRelatedField()
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(max_length=500, required=False)
    company = serializers.StringRelatedField(read_only=True)
    class Meta:
        model = Scheduler
        fields = (
            "id", "title", "meeting_date", "start_time", "end_time", "room_name",
            "room_url", "no_of_participants", "token", "created_on", "company",
            "description", "accepted", "talent"
        )
        read_only_fields = (
            "room_name", "room_url", "token", "company", "talent",
            "meeting_date", "start_time", "end_time", "no_of_participants"
        )

    def validate(self, data):
        meeting_date = data.get('meeting_date', None)
        start_time = data.get('start_time', None)
        end_time = data.get('end_time', None)
        now = timezone.now()

        if not (meeting_date and start_time and end_time):
            return data

        if meeting_date < now.date():
            raise serializers.ValidationError("Meeting date must be on or after today")
        if start_time > end_time:
            raise serializers.ValidationError("end_time must be greater than start_time")
        if meeting_date == now.date() and start_time < now.time():
            raise serializers.ValidationError("start_time cannot be before now")
        return super().validate(data)