from django.urls import path

from .views import (
    JobListCreateView,
    GenerateAssessmentQuestionsView,
    JobAssessmentGenerationStatusView,
    JobInterviewSlotListView,
    JobInterviewSlotClaimView,
    GuestInterviewSlotListView,
    GuestInterviewSlotClaimView,
    JobApplicationListView,
    JobApplyView,
    JobRetrieveUpdateView,
    JobApplicationRetrieveUpdateView,
    PortfolioExperienceCreateView,
    ToolsListAPIView,
    PortfolioRetreiveAPIView,
    JobDetailView,
    JobDetailByPublicIdView,
    JobByTokenAPIView,
    JobTrackViewAPIView,
    JobApplyByIdView,
    JobApplyByTokenView,
    ExternalJobApplyRedirectView,
    JobDeleteView,
    ApplyToPendingJobView,
    PortfolioCreateView,
    PortfolioRetrieveUpdateView,
    PortfolioProjectCreateView,
    PortfolioProjectListView,
    PortfolioProjectDetailView,
    ExternalJobApplicationView,
    JobApplicationOtpVerificationView,
    JobApplicationResendOtpView,
    PortfolioExperienceListView,
    PortfolioExperienceDetailView,
    PortfolioExperienceCreateView,
    PortfolioEducationCreateView,
    PortfolioEducationListView,
    PortfolioEducationDetailView,
    CompanyProfileView,
    JobDraftSaveView,
    DashboardStatsView,
)

urlpatterns = [
    path("", JobListCreateView.as_view(), name="job-list-create"),
    path("dashboard-stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("draft/", JobDraftSaveView.as_view(), name="job-draft-save"),
    path("generate-assessment-questions/", GenerateAssessmentQuestionsView.as_view(), name="generate-assessment-questions"),
    path(
        "generate-assessment-questions/<uuid:request_id>/status/",
        JobAssessmentGenerationStatusView.as_view(),
        name="assessment-generation-status",
    ),
    path("job-detail/<int:pk>", JobDetailView.as_view(), name="generic-job-detail"),
    path("job-detail/by-public-id/<str:public_id>", JobDetailByPublicIdView.as_view(), name="generic-job-detail-by-public-id"),
    path(
        "job-applications/",
        JobApplicationListView.as_view(),
        name="job-applications-list",
    ),
    path(
        "job-applications/<int:pk>/",
        JobApplicationRetrieveUpdateView.as_view(),
        name="job-application-detail",
    ),

    path("companies/<str:company_name>/", CompanyProfileView.as_view(), name="company-profile"),
    # Portfolio URLs
    path("portfolio/", PortfolioRetrieveUpdateView.as_view(), name="portfolio-detail"),
    path("portfolio/create/", PortfolioCreateView.as_view(), name="portfolio-create"),
    path("portfolio/<slug:slug>/details/", PortfolioRetreiveAPIView.as_view(), name="portfolio-public-detail"),
    path("portfolio/tools/", ToolsListAPIView.as_view(), name="tools-list"),
    # Portfolio Project URLs
    path("portfolio/projects/", PortfolioProjectListView.as_view(), name="portfolio-project-list"),
    path("portfolio/projects/create/", PortfolioProjectCreateView.as_view(), name="portfolio-project-create"),
    path("portfolio/projects/<int:pk>/", PortfolioProjectDetailView.as_view(), name="portfolio-project-detail"),

    #Experince
    path("portfolio/experiences/", PortfolioExperienceListView.as_view(), name="portfolio-experience-list"),
    path("portfolio/experiences/create/", PortfolioExperienceCreateView.as_view(), name="portfolio-experience-create"),
    path("portfolio/experiences/<int:pk>/", PortfolioExperienceDetailView.as_view(), name="portfolio-experience-detail"),

    # Education
    path("portfolio/educations/", PortfolioEducationListView.as_view(), name="portfolio-education-list"),
    path("portfolio/educations/create/", PortfolioEducationCreateView.as_view(), name="portfolio-education-create"),
    path("portfolio/educations/<int:pk>/", PortfolioEducationDetailView.as_view(), name="portfolio-education-detail"),

    path("apply/<uuid:apply_token>/", JobByTokenAPIView.as_view(), name="job-by-token"),
    path("apply/<uuid:apply_token>/track-view/", JobTrackViewAPIView.as_view(), name="job-track-view"),
    path('apply/<uuid:apply_token>/guest/', JobApplyByIdView.as_view(), name='job-apply-by-id'),
    path('apply/<uuid:apply_token>/apply/', JobApplyByTokenView.as_view(), name='job-apply-by-token'),
    path('external-apply/<uuid:apply_token>/', ExternalJobApplyRedirectView.as_view(), name='external-job-apply-redirect'),
    path('apply-pending-job/', ApplyToPendingJobView.as_view(), name='apply-pending-job'),
    path('external-application/', ExternalJobApplicationView.as_view(), name='external-job-application'),
    path('verify-otp/', JobApplicationOtpVerificationView.as_view(), name='job-application-otp-verification'),
    path('resend-otp/', JobApplicationResendOtpView.as_view(), name='job-application-resend-otp'),

    # Guest (no-login) interview-slot picking -- keyed by the candidate's
    # GeneralSkillAssessment.invite_token, not public_id, so this must stay
    # above the `<str:public_id>/` wildcard below (a literal "interview-slots"
    # first segment would otherwise never be reached, always matching
    # public_id="interview-slots" instead).
    path("interview-slots/guest/<str:token>/", GuestInterviewSlotListView.as_view(), name="guest-interview-slots"),
    path("interview-slots/guest/<str:token>/<int:slot_id>/claim/", GuestInterviewSlotClaimView.as_view(), name="guest-interview-slot-claim"),

    # `<str:public_id>`-based routes are a single-segment wildcard (unlike the
    # old `<int:pk>`, which only matched digits) -- must stay LAST among
    # single-segment patterns so they never shadow the literal paths above
    # (job-applications/, portfolio/, apply-pending-job/, etc.).
    path("<str:public_id>/", JobRetrieveUpdateView.as_view(), name="job-detail"),
    path("<str:public_id>/delete", JobDeleteView.as_view(), name="job-delete"),
    path("<str:public_id>/interview-slots/", JobInterviewSlotListView.as_view(), name="job-interview-slots"),
    path("<str:public_id>/interview-slots/<int:slot_id>/claim/", JobInterviewSlotClaimView.as_view(), name="job-interview-slot-claim"),
]
