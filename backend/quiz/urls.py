from django.urls import path

from .views import (
    MyQuizListView,
    QuizListCreateView,
    QuizAttemptsListView,
    QuizDetailView,
    QuestionListCreateViewForQuizDetail,
    QuestionDetailView,
    AttemptQuestionInitializeView,
    AttemptQuestionView
)

urlpatterns = [
    path("", QuizListCreateView.as_view(), name="quiz-list-create"),
    path("me/", MyQuizListView.as_view(), name="my-quiz-list"),
    path("quiz-attempts/", QuizAttemptsListView.as_view(), name="quiz-attempts"),
    path("<slug:slug>/", QuizDetailView.as_view(), name="quiz-detail-view"),
    path(
        "<slug:quiz_slug>/questions/", 
        QuestionListCreateViewForQuizDetail.as_view(), 
        name="question-list-create-for-quiz-detail"
    ),
    path(
        "<slug:quiz_slug>/questions/<int:pk>/", 
        QuestionDetailView.as_view(), 
        name="question-detail"
    ),
    path(
        "attempt-quiz/<slug:quiz_slug>/initialize/", 
        AttemptQuestionInitializeView.as_view(), 
        name="quiz-attempt-initialize"
    ),
    path(
        "attempt-quiz/answer-question/", 
        AttemptQuestionView.as_view(), 
        name="quiz-attempt-answer-question")
]