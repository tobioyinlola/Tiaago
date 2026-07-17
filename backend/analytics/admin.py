from django.contrib import admin

from .models import AIUsageLog


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = ("service_type", "succeeded", "company", "created_at")
    list_filter = ("service_type", "succeeded")
    search_fields = ("company__company_name",)
