from django.contrib import admin

from .models import AtsCandidate, AtsConnection, AtsJob


@admin.register(AtsConnection)
class AtsConnectionAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "provider", "status", "candidates_synced", "jobs_synced", "created_at")
    list_filter = ("provider", "status")
    search_fields = ("company__company_name", "nango_connection_id")
    readonly_fields = [f.name for f in AtsConnection._meta.fields]


@admin.register(AtsCandidate)
class AtsCandidateAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "provider",
        "first_name",
        "last_name",
        "email",
        "current_title",
        "current_company",
        "stage",
        "last_synced_at",
    )
    list_filter = ("provider",)
    search_fields = ("first_name", "last_name", "email", "external_id", "current_company")


@admin.register(AtsJob)
class AtsJobAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "provider", "title", "status", "location", "last_synced_at")
    list_filter = ("provider", "status")
    search_fields = ("title", "external_id")
