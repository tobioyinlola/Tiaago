from django.urls import path
from .views import AdminMetricsAPIView, resend_webhook

urlpatterns = [
    path("metrics", AdminMetricsAPIView.as_view(), name="admin-metrics"),
    path("resend-webhook/", resend_webhook, name="resend-webhook"),
]