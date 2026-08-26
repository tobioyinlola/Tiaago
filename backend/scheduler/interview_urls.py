from django.urls import path

from .copilot_views import (
    CandidateJoinLookupView,
    CandidateJoinView,
    RecruiterJoinLookupView,
    RecruiterTokenEndView,
    RecruiterTokenJoinView,
)

urlpatterns = [
    path("join-candidate/", CandidateJoinView.as_view(), name="interview-join-candidate"),
    path("join-recruiter/", RecruiterTokenJoinView.as_view(), name="interview-join-recruiter"),
    path("end-recruiter/", RecruiterTokenEndView.as_view(), name="interview-end-recruiter"),
    # Must precede the bare "<str:token>/" catch-all below, which would
    # otherwise swallow "recruiter/..." as a candidate token.
    path("recruiter/<str:token>/", RecruiterJoinLookupView.as_view(), name="interview-recruiter-lookup"),
    path("<str:token>/", CandidateJoinLookupView.as_view(), name="interview-candidate-lookup"),
]
