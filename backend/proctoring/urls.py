from django.urls import path

from . import views

urlpatterns = [
    path("invite/<uuid:token>/session/", views.CreateProctoringSessionView.as_view(), name="proctoring-session-create"),
    path(
        "invite/<uuid:token>/sessions/<uuid:session_id>/events/",
        views.ProctoringEventBatchView.as_view(),
        name="proctoring-events-batch",
    ),
    path(
        "invite/<uuid:token>/sessions/<uuid:session_id>/complete/",
        views.CompleteProctoringSessionView.as_view(),
        name="proctoring-session-complete",
    ),
    path("report/<int:submission_id>/", views.ProctoringReportView.as_view(), name="proctoring-report"),
    path("admin/overview/", views.AdminProctoringOverviewView.as_view(), name="proctoring-admin-overview"),
    path("admin/sessions/", views.AdminHighRiskSessionsView.as_view(), name="proctoring-admin-sessions"),
]
