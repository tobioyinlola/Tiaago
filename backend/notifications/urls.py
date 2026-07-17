from django.urls import path

from . import views

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notifications-list"),
    path("unread-count/", views.UnreadCountView.as_view(), name="notifications-unread-count"),
    path("<uuid:notification_id>/mark-read/", views.MarkNotificationReadView.as_view(), name="notifications-mark-read"),
    path("mark-all-read/", views.MarkAllNotificationsReadView.as_view(), name="notifications-mark-all-read"),
    path("admin/", views.AdminNotificationListCreateView.as_view(), name="notifications-admin-list-create"),
    path("admin/<uuid:notification_id>/", views.AdminNotificationDetailView.as_view(), name="notifications-admin-detail"),
    path("admin/organisations/", views.AdminOrganisationSearchView.as_view(), name="notifications-admin-org-search"),
]
