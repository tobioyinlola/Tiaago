from django.urls import path

from .views import (
    AIInterviewAgentDataView,
    AIInterviewCompleteView,
    AIInterviewJoinLookupView,
    AIInterviewSegmentView,
    AIInterviewStartSessionView,
    AIInterviewStatusView,
    EligiblePreviewJobsView,
    RecruiterAIInterviewDecisionView,
    RecruiterAIInterviewDetailView,
    RecruiterAIInterviewListView,
    RecruiterAIInterviewTranscriptView,
    TriggerAIInterviewPreviewView,
)

urlpatterns = [
    # Public, candidate-token authenticated.
    path("join/<str:token>/", AIInterviewJoinLookupView.as_view(), name="ai-interview-join-lookup"),
    path("join/<str:token>/start/", AIInterviewStartSessionView.as_view(), name="ai-interview-start-session"),

    # Internal, shared-secret authenticated (interview_agent/ process only).
    path("<uuid:pk>/agent-data/", AIInterviewAgentDataView.as_view(), name="ai-interview-agent-data"),
    path("<uuid:pk>/segment/", AIInterviewSegmentView.as_view(), name="ai-interview-segment"),
    path("<uuid:pk>/status/", AIInterviewStatusView.as_view(), name="ai-interview-status"),
    path("<uuid:pk>/complete/", AIInterviewCompleteView.as_view(), name="ai-interview-complete"),

    # Recruiter dashboard, session authenticated.
    path("eligible-preview-jobs/", EligiblePreviewJobsView.as_view(), name="ai-interview-eligible-preview-jobs"),
    path("trigger-preview/", TriggerAIInterviewPreviewView.as_view(), name="ai-interview-trigger-preview"),
    path("", RecruiterAIInterviewListView.as_view(), name="ai-interview-list"),
    path("<uuid:pk>/", RecruiterAIInterviewDetailView.as_view(), name="ai-interview-detail"),
    path("<uuid:pk>/transcript/", RecruiterAIInterviewTranscriptView.as_view(), name="ai-interview-transcript"),
    path("<uuid:pk>/decision/", RecruiterAIInterviewDecisionView.as_view(), name="ai-interview-decision"),
]
