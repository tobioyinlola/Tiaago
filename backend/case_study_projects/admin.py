from django.contrib import admin

from .models import CaseStudyProject, TalentCaseStudyProject

@admin.register(CaseStudyProject)
class CaseStudyProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'pk', 'about', 'created', 'updated',)

@admin.register(TalentCaseStudyProject)
class TalentAttemptCaseStudyProjectAdmin(admin.ModelAdmin):
    list_display = (
        'project', 'pk', 'talent', 'approved', 'submission', 
        'remark', 'last_attempt', 'created', 'updated'
    )
