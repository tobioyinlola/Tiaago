from django.urls import path

from .copilot_views import CandidateJoinLookupView, CandidateJoinView

urlpatterns = [
    path("join-candidate/", CandidateJoinView.as_view(), name="interview-join-candidate"),
    path("<str:token>/", CandidateJoinLookupView.as_view(), name="interview-candidate-lookup"),
]
