from django.urls import path

from . import views

urlpatterns = [
    path("templates/", views.EmailTemplateListCreateView.as_view(), name="campaigns-templates-list-create"),
    path("templates/preview/", views.TemplatePreviewView.as_view(), name="campaigns-templates-preview"),
    path("templates/<uuid:template_id>/", views.EmailTemplateDetailView.as_view(), name="campaigns-templates-detail"),
    path("manage/upload-image/", views.CampaignImageUploadView.as_view(), name="campaigns-manage-upload-image"),
    path("audience-preview/", views.CampaignAudiencePreviewView.as_view(), name="campaigns-audience-preview"),
    path("", views.EmailCampaignListCreateView.as_view(), name="campaigns-list-create"),
    path("<uuid:campaign_id>/", views.EmailCampaignDetailView.as_view(), name="campaigns-detail"),
    path("<uuid:campaign_id>/send-test/", views.CampaignSendTestView.as_view(), name="campaigns-send-test"),
    path("<uuid:campaign_id>/send/", views.CampaignSendView.as_view(), name="campaigns-send"),
    path("<uuid:campaign_id>/cancel/", views.CampaignCancelView.as_view(), name="campaigns-cancel"),
    path("<uuid:campaign_id>/analytics/", views.CampaignAnalyticsView.as_view(), name="campaigns-analytics"),
]
