from django.urls import path

from . import tracking_views

urlpatterns = [
    path("track/open/<uuid:send_id>/", tracking_views.TrackOpenView.as_view(), name="email-track-open"),
    path("track/click/<uuid:send_id>/", tracking_views.TrackClickView.as_view(), name="email-track-click"),
    path("unsubscribe/", tracking_views.UnsubscribeView.as_view(), name="email-unsubscribe"),
]
