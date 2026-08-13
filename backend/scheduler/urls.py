from django.urls import path

from .views import (
    ScheduleMeetingView,
    SchedulerMeetingUpdateView,
    SchedulerMeetingDeleteView
)
from .copilot_views import (
    StartInterviewView,
    EndInterviewView,
    InterviewPreparationView,
    RegenerateInterviewPreparationView,
    InterviewNotesView,
    InterviewScorecardView,
    InterviewCompetencyScoreDetailView,
    SubmitInterviewScorecardView,
    InterviewProcessingStatusView,
)
from .list_views import RecruiterInterviewsListView
from .settings_views import CompanyInterviewSettingsView
from .review_views import (
    InterviewReviewView,
    InterviewTranscriptView,
    InterviewSummaryEditView,
    RegenerateInterviewSummaryView,
    InterviewDecisionView,
    InterviewAdvanceRoundView,
    InterviewFeedbackEditView,
    SendInterviewFeedbackView,
)

urlpatterns = [
    path("", ScheduleMeetingView.as_view(), name='schedule-meeting'),
    path("interviews/", RecruiterInterviewsListView.as_view(), name='recruiter-interviews-list'),
    path("<uuid:pk>/", SchedulerMeetingUpdateView.as_view(), name='schedule-meeting-update'),
    path("<uuid:pk>/delete/", SchedulerMeetingDeleteView.as_view(), name='delete-schedule-meeting'),
    path("<uuid:pk>/start/", StartInterviewView.as_view(), name='start-interview'),
    path("<uuid:pk>/end/", EndInterviewView.as_view(), name='end-interview'),
    path("<uuid:pk>/preparation/", InterviewPreparationView.as_view(), name='interview-preparation'),
    path(
        "<uuid:pk>/preparation/regenerate/",
        RegenerateInterviewPreparationView.as_view(),
        name='interview-preparation-regenerate',
    ),
    path("<uuid:pk>/notes/", InterviewNotesView.as_view(), name='interview-notes'),
    path("<uuid:pk>/scorecard/", InterviewScorecardView.as_view(), name='interview-scorecard'),
    path(
        "<uuid:pk>/scorecard/<uuid:competency_score_id>/",
        InterviewCompetencyScoreDetailView.as_view(),
        name='interview-scorecard-detail',
    ),
    path(
        "<uuid:pk>/scorecard/submit/",
        SubmitInterviewScorecardView.as_view(),
        name='interview-scorecard-submit',
    ),
    path(
        "<uuid:pk>/processing-status/",
        InterviewProcessingStatusView.as_view(),
        name='interview-processing-status',
    ),
    path("<uuid:pk>/review/", InterviewReviewView.as_view(), name='interview-review'),
    path("<uuid:pk>/transcript/", InterviewTranscriptView.as_view(), name='interview-transcript'),
    path("<uuid:pk>/summary/", InterviewSummaryEditView.as_view(), name='interview-summary-edit'),
    path(
        "<uuid:pk>/summary/regenerate/",
        RegenerateInterviewSummaryView.as_view(),
        name='interview-summary-regenerate',
    ),
    path("<uuid:pk>/decision/", InterviewDecisionView.as_view(), name='interview-decision'),
    path("<uuid:pk>/advance-round/", InterviewAdvanceRoundView.as_view(), name='interview-advance-round'),
    path("<uuid:pk>/feedback/", InterviewFeedbackEditView.as_view(), name='interview-feedback-edit'),
    path("<uuid:pk>/feedback/send/", SendInterviewFeedbackView.as_view(), name='interview-feedback-send'),
    path("interview-settings/", CompanyInterviewSettingsView.as_view(), name='company-interview-settings'),
]
