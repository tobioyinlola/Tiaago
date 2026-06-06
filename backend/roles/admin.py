from django.contrib import admin

from .models import Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("title", "is_technical", "id")
    search_fields = ["title"]
    list_filter = ["is_technical"]
