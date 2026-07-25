from django.contrib import admin

from .models import JobMatchNotification, TalentNetworkAuditLog, TalentNetworkMember


@admin.register(TalentNetworkMember)
class TalentNetworkMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "email", "country", "status", "email_frequency", "created_at")
    list_filter = ("status", "email_frequency", "preferred_work_type")
    search_fields = ("first_name", "last_name", "email", "job_title")


@admin.register(JobMatchNotification)
class JobMatchNotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "member", "match_score", "status", "send_channel", "sent_at")
    list_filter = ("status", "send_channel")
    search_fields = ("member__email", "job__role")


@admin.register(TalentNetworkAuditLog)
class TalentNetworkAuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "action", "target_member", "actor", "created_at")
    list_filter = ("action",)
    readonly_fields = [f.name for f in TalentNetworkAuditLog._meta.fields]
