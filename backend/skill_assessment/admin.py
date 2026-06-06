from django.contrib import admin
from .models import (
    SkillAssessment,
    GeneralSkillAssessment,
    GeneralSkillAssessmentSection,
    GeneralSkillAssessmentMCQQuestion,
    QuestionBankQuestion,
    CodingTask,
    TestCase,
    CandidateAssessmentSectionSubmission,
    CandidateAssessmentSubmission,
    ResumeAnalysis,
    PendingResumeAnalysis,
    PreScreeningInterviewQuestionResponse,
    PreScreeningAgent,
    PreScreeningInterviewSession,
    TechStack,
    CandidateAssessmentMCQAnswer,
    TalentQuestionBank,
)


@admin.register(SkillAssessment)
class SkillAssessmentAdmin(admin.ModelAdmin):
    list_display = ("id", "talent", "project_taken", "quiz_taken", "has_passed")


@admin.register(QuestionBankQuestion)
class QuestionBankQuestionAdmin(admin.ModelAdmin):
    list_filter = ["role"]
    list_display = ["question", "role", "correct_option_index", "difficulty_level"]


@admin.register(GeneralSkillAssessmentSection)
class GeneralSkillAssessmentSectionAdmin(admin.ModelAdmin):
    list_display = ["name", "company_skill_assessment", "type"]


@admin.register(GeneralSkillAssessment)
class GeneralSkillAssessmentAdmin(admin.ModelAdmin):
    filter_horizontal = ["skillsets"]
    list_display = [
        "company",
        "title",
        "published",
        "difficulty_level",
        "duration_minutes",
        "passing_grade",
        "assessment_type",
        "reference",
    ]


@admin.register(CodingTask)
class CodingTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "difficulty_level", "max_score", "created_at")


@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ("coding_task", "is_sample")


@admin.register(ResumeAnalysis)
class ResumeAnalysisAdmin(admin.ModelAdmin):
    list_display = [
        "job_application",
        "resume_name",
        "resume_review_score",
        "recommendation",
        "created_at",
    ]
    list_select_related = ["job_application"]


@admin.register(PendingResumeAnalysis)
class PendingResumeAnalysisAdmin(admin.ModelAdmin):
    list_display = ["job_application", "resume_name", "created_at"]
    list_select_related = ["job_application"]


class CandidateAssessmentSectionSubmissionInline(admin.TabularInline):
    model = CandidateAssessmentSubmission.skill_assessment_section_submissions.through
    extra = 0
    # fields = ["skill_assessment_section", "coding_task_answer", "mcq_answers"]


class CandidateAssessmentSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        "candidate",
        "skill_assessment",
        "total_score",
        "completed_at",
        "is_completed",
        "is_passed",
        "mark_status",
    ]
    inlines = [CandidateAssessmentSectionSubmissionInline]
    list_select_related = ["skill_assessment", "candidate"]


@admin.register(CandidateAssessmentSectionSubmission)
class CandidateAssessmentSectionSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        "skill_assessment_section",
        "time_taken",
        "total_score",
    ]
    list_select_related = ["skill_assessment_section"]


admin.site.register(CandidateAssessmentMCQAnswer)
admin.site.register(GeneralSkillAssessmentMCQQuestion)
admin.site.register(CandidateAssessmentSubmission, CandidateAssessmentSubmissionAdmin)
admin.site.register(PreScreeningInterviewSession)
admin.site.register(PreScreeningAgent)
admin.site.register(PreScreeningInterviewQuestionResponse)
admin.site.register(TechStack)
admin.site.register(TalentQuestionBank)