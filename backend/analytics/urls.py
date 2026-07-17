from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewAPIView.as_view(), name="analytics-overview"),
    path("organisations/", views.OrganisationListAPIView.as_view(), name="analytics-organisations"),
    path("organisations/alerts/", views.OrganisationAlertsAPIView.as_view(), name="analytics-organisations-alerts"),
    path("organisations/<int:company_id>/", views.OrganisationDetailAPIView.as_view(), name="analytics-organisation-detail"),
    path("revenue/", views.RevenueAPIView.as_view(), name="analytics-revenue"),
    path("funnel/", views.FunnelAPIView.as_view(), name="analytics-funnel"),
    path("pipeline/", views.PipelineAPIView.as_view(), name="analytics-pipeline"),
    path("growth/", views.GrowthAPIView.as_view(), name="analytics-growth"),
    path("assessments/", views.AssessmentIntelligenceAPIView.as_view(), name="analytics-assessments"),
    path("system/", views.SystemHealthAPIView.as_view(), name="analytics-system"),
]
