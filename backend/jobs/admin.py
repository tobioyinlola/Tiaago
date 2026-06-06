from django.contrib import admin

from .models import (
    Job,
    JobApplication,
    Portfolio,
    Education,
    Experience,
    Certification,
    Tool,
    TalentScreening,
    SkillAssessmentScreening,
    CandidateResumeScreening,
    InterviewScreening,
    Project,
)


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    model = Job
    autocomplete_fields = ["role"]
    list_display = ("title", "id", "company", "job_status", "job_type")


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    model = JobApplication
    list_display = ("applicant", "job", "applied_date", "status")


class ExperienceInline(admin.TabularInline):
    model = Experience
    extra = 1


class EducationInline(admin.TabularInline):
    model = Education
    extra = 1


class CertificationInline(admin.TabularInline):
    model = Certification
    extra = 1


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ["talent", "role", "slug", "created_at"]
    list_filter = ["role", "created_at"]
    search_fields = ["talent__full_name", "talent__user__email", "role__title"]
    autocomplete_fields = ["role", "talent"]
    inlines = [ExperienceInline, EducationInline, CertificationInline]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('talent__user', 'role')


@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "icon"]


@admin.register(TalentScreening)
class TalentScreeningAdmin(admin.ModelAdmin):
    list_display = ["job_application", "is_paid_screening"]
    list_select_related = ["job_application"]


@admin.register(SkillAssessmentScreening)
class SkillAssessmentScreeningAdmin(admin.ModelAdmin):
    list_display = [
        "talent_screening",
        "fee",
        "skill_assessment",
        "skill_assessment_submission",
        "is_paid",
    ]
    list_select_related = [
        "talent_screening",
        "skill_assessment",
        "skill_assessment_submission",
    ]


@admin.register(CandidateResumeScreening)
class CandidateResumeScreeningAdmin(admin.ModelAdmin):
    list_display = [
        "talent_screening",
        "fee",
        "resume_analysis",
        "is_paid",
    ]
    list_select_related = ["talent_screening", "resume_analysis"]


@admin.register(InterviewScreening)
class InterviewScreeningAdmin(admin.ModelAdmin):
    list_display = [
        "talent_screening",
        "fee",
        "meeting",
        "is_paid",
    ]

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "portfolio", "link"]
    list_select_related = ["portfolio"]

    