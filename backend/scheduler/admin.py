from django.contrib import admin

from .models import Scheduler

@admin.register(Scheduler)
class SchedulerAdmin(admin.ModelAdmin):
    list_display = ("title", "id", "meeting_date", "start_time", "end_time", "talent")
