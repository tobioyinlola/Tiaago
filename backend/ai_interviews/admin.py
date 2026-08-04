from django.contrib import admin

from .models import AIInterview, AIInterviewQuestion, AIInterviewTranscriptSegment


class AIInterviewQuestionInline(admin.TabularInline):
    model = AIInterviewQuestion
    extra = 0
    fields = ("question_number", "question_type", "question_text", "was_asked", "score", "signal_strength")
    readonly_fields = ("question_number", "question_type", "question_text")


@admin.register(AIInterview)
class AIInterviewAdmin(admin.ModelAdmin):
    list_display = (
        "id", "candidate", "job", "organisation", "status",
        "summary_status", "recruiter_decision", "overall_score", "created_at",
    )
    list_filter = ("status", "summary_status", "recruiter_decision")
    search_fields = ("candidate__full_name", "job__role", "organisation__company_name", "livekit_room_name")
    inlines = [AIInterviewQuestionInline]


@admin.register(AIInterviewTranscriptSegment)
class AIInterviewTranscriptSegmentAdmin(admin.ModelAdmin):
    list_display = ("interview", "speaker", "timestamp_ms")
    list_filter = ("speaker",)
