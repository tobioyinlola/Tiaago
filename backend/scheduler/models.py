import uuid
from django.db import models

from create_user.models import (
    TalentProfile,
    Company
)


class Scheduler(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    title = models.CharField(max_length=255)
    meeting_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    room_id = models.UUIDField(default=uuid.uuid4, editable=True, null=True, blank=True)
    room_name = models.CharField(max_length=45, blank=True, default='')
    room_url = models.URLField(blank=True, null=True)
    no_of_participants = models.PositiveIntegerField(
        default=5
    )
    accepted = models.BooleanField(default=None, null=True, blank=True)
    token = models.TextField(blank=True, default="")
    description = models.TextField(max_length=500)
    additional_emails = models.TextField(max_length=500, default="", blank=True)
    reminder_task_id = models.CharField(max_length=255, blank=True, null=True, help_text="Celery task ID for reminder email")
    others_task_id = models.CharField(max_length=255, blank=True, null=True, help_text="Celery task ID for others email")
    talent = models.ForeignKey(
        TalentProfile,
        related_name="schedules",
        on_delete=models.CASCADE,
    )
    company = models.ForeignKey(
        Company,
        related_name="schedules",
        on_delete=models.CASCADE
    )
    created_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title + ' ' + \
            self.start_time.strftime('%H:%M') + ' ' + self.end_time.strftime('%H:%M') + ' on ' + self.meeting_date.strftime('%Y-%m-%d %H:%M')