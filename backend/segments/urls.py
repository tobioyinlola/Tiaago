from django.urls import path

from . import views

urlpatterns = [
    path("admin/", views.SegmentListCreateView.as_view(), name="segments-admin-list-create"),
    path("admin/preview/", views.SegmentPreviewView.as_view(), name="segments-admin-preview"),
    path("admin/<uuid:segment_id>/", views.SegmentDetailView.as_view(), name="segments-admin-detail"),
]
