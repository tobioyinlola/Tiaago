from django.contrib import admin

from .models import ProctoringSession, ProctoringEvent


@admin.register(ProctoringSession)
class ProctoringSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "candidate", "job", "status", "risk_level", "integrity_score", "started_at")
    list_filter = ("status", "risk_level")
    search_fields = ("candidate__user__email", "job__role__title")


@admin.register(ProctoringEvent)
class ProctoringEventAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "event_type", "severity", "occurred_at")
    list_filter = ("event_type", "severity")
