from django.urls import path

from .views import (
    ScheduleMeetingView,
    SchedulerMeetingUpdateView,
    SchedulerMeetingDeleteView
)

urlpatterns = [
    path("", ScheduleMeetingView.as_view(), name='schedule-meeting'),
    path("<uuid:pk>/", SchedulerMeetingUpdateView.as_view(), name='schedule-meeting-update'),
    path("<uuid:pk>/delete/", SchedulerMeetingDeleteView.as_view(), name='delete-schedule-meeting'),
]
