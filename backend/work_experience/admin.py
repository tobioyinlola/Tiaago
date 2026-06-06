from django.contrib import admin

from .models import WorkExperience

@admin.register(WorkExperience)
class WorkExperienceAdmin(admin.ModelAdmin):
    model = WorkExperience
    list_display = ('organization', 'id', 'role', 'year_from', 'year_to', 'talent', 'organization_logo')