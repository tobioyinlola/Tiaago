from django.contrib import admin
from django.utils.html import format_html

from .models import PipelineCandidate, PipelineCategory


@admin.register(PipelineCategory)
class PipelineCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "is_active", "candidate_count", "removal_status", "created_at")
    list_filter = ("is_active", "company")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at", "deleted_at")

    def get_queryset(self, request):
        return PipelineCategory.all_objects.all()

    def candidate_count(self, obj):
        return PipelineCandidate.all_objects.filter(
            category=obj, deleted_at__isnull=True
        ).count()
    candidate_count.short_description = "Active Candidates"

    def removal_status(self, obj):
        if obj.deleted_at:
            return format_html('<span style="color:#B42318;font-weight:600;">Removed</span>')
        return format_html('<span style="color:#027A48;">Active</span>')
    removal_status.short_description = "Status"


@admin.register(PipelineCandidate)
class PipelineCandidateAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "role", "status", "category", "company", "removal_status", "created_at")
    list_filter = ("status", "company", "category")
    search_fields = ("name", "email", "role")
    readonly_fields = ("created_at", "updated_at", "deleted_at")

    def get_queryset(self, request):
        return PipelineCandidate.all_objects.select_related("category", "company").all()

    def removal_status(self, obj):
        if obj.deleted_at:
            return format_html('<span style="color:#B42318;font-weight:600;">Removed</span>')
        return format_html('<span style="color:#027A48;">Active</span>')
    removal_status.short_description = "Visibility"
