from django.urls import path

from .views import (
    TalentNetworkAnalyticsView,
    TalentNetworkConfirmView,
    TalentNetworkExportCsvView,
    TalentNetworkJoinView,
    TalentNetworkMemberDetailView,
    TalentNetworkMemberListView,
    TalentNetworkOverviewView,
    TalentNetworkSmtpConfigView,
    TalentNetworkSmtpVerifyView,
    TrackClickView,
    TrackOpenView,
)

urlpatterns = [
    # Public
    path("join/", TalentNetworkJoinView.as_view(), name="talent-network-join"),
    path("confirm/<uuid:token>/", TalentNetworkConfirmView.as_view(), name="talent-network-confirm"),
    path("track/open/<int:notification_id>/", TrackOpenView.as_view(), name="talent-network-track-open"),
    path("track/click/<int:notification_id>/", TrackClickView.as_view(), name="talent-network-track-click"),
    # Admin
    path("admin/overview/", TalentNetworkOverviewView.as_view(), name="talent-network-admin-overview"),
    path("admin/members/", TalentNetworkMemberListView.as_view(), name="talent-network-admin-members"),
    path("admin/members/export/", TalentNetworkExportCsvView.as_view(), name="talent-network-admin-members-export"),
    path("admin/members/<int:pk>/", TalentNetworkMemberDetailView.as_view(), name="talent-network-admin-member-detail"),
    path("admin/analytics/", TalentNetworkAnalyticsView.as_view(), name="talent-network-admin-analytics"),
    path("admin/smtp-config/", TalentNetworkSmtpConfigView.as_view(), name="talent-network-admin-smtp-config"),
    path("admin/smtp-config/verify/", TalentNetworkSmtpVerifyView.as_view(), name="talent-network-admin-smtp-verify"),
]
