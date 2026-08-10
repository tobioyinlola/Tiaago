from django.urls import path

from .views import ReportDetailView, ReportListCreateView, ReportRegenerateView, ReportUploadPdfView

urlpatterns = [
    path("", ReportListCreateView.as_view(), name="report-list-create"),
    path("<int:pk>/", ReportDetailView.as_view(), name="report-detail"),
    path("<int:pk>/regenerate/", ReportRegenerateView.as_view(), name="report-regenerate"),
    path("<int:pk>/upload-pdf/", ReportUploadPdfView.as_view(), name="report-upload-pdf"),
]
