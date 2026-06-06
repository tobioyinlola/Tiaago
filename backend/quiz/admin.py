from django.contrib import admin

from .models import (
    Quiz,
    Question,
    QuizTaker,
    Answer,
    Response
)

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("name", "id", "question_count", "minutes", "slug")

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("label", "get_quizzes", "id",  "created", "updated")

    def get_quizzes(self, obj):
        return [quiz.name for quiz in obj.quiz.all()]

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("get_short_text", "id", "get_short_question", "is_correct", "created", "updated")

    def get_short_text(self, obj):
        return obj.text if len(obj.text) < 35 else (obj.text[:32] + "...")
    get_short_text.short_description = "text"

    def get_short_question(self, obj):
        return obj.question.label if len(obj.question.label) < 35 else (obj.question.label[:32] + "...")
    get_short_question.short_description = "question"

@admin.register(QuizTaker)
class QuizTakerAdmin(admin.ModelAdmin):
    list_display = ("talent", "quiz", "id", "correct_answers", "completed", 'timestamp')

@admin.register(Response)
class ResponseAdmin(admin.ModelAdmin):
    list_display = ("quiztaker", "question", "answer", "id", "created", "updated")