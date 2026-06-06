from django.urls import path
from .views import AdminMetricsAPIView

urlpatterns = [
    path("metrics", AdminMetricsAPIView.as_view(), name="admin-metrics")
]