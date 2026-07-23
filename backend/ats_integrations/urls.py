from django.urls import path

from . import views

urlpatterns = [
    path("available-integrations/", views.AtsAvailableIntegrationsView.as_view(), name="ats-available-integrations"),
    path("connect-session/", views.AtsConnectSessionView.as_view(), name="ats-connect-session"),
    path("connections/", views.AtsConnectionListView.as_view(), name="ats-connection-list"),
    path("connections/<int:pk>/", views.AtsConnectionDetailView.as_view(), name="ats-connection-detail"),
    path("connections/<int:pk>/sync/", views.AtsSyncTriggerView.as_view(), name="ats-connection-sync"),
]
