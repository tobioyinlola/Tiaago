from django.contrib import admin

from .models import AIUsageLog, PageView


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = ("service_type", "succeeded", "company", "created_at")
    list_filter = ("service_type", "succeeded")
    search_fields = ("company__company_name",)


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ("session_key", "visited_date", "created_at")
    list_filter = ("visited_date",)
    search_fields = ("session_key",)
