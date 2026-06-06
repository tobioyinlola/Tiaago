from django.urls import path

from .views import (
    WorkExperienceListCreateView,
    WorkExperienceDetailView,
    UserWorkExperienceDetailView
)

urlpatterns = [
    path("", WorkExperienceListCreateView.as_view(), name="work-experience-list-create"),
    path("<int:pk>/", WorkExperienceDetailView.as_view(), name="work-experience-detail"),
    path('talents/<int:talent_id>/', UserWorkExperienceDetailView.as_view(), name="user-work-experience-detail"),
]