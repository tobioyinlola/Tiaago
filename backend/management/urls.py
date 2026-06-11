from django.urls import path
from .views import (
    AdminMetricsAPIView,
    EmailTrackListView,
    EmailTrackStatsAPIView,
    resend_webhook,
)

urlpatterns = [
    path("metrics", AdminMetricsAPIView.as_view(), name="admin-metrics"),
    path("resend-webhook/", resend_webhook, name="resend-webhook"),
    path("email-tracks/", EmailTrackListView.as_view(), name="email-track-list"),
    path(
        "email-tracks/stats/",
        EmailTrackStatsAPIView.as_view(),
        name="email-track-stats",
    ),
]
