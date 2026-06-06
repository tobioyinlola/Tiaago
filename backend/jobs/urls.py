from django.urls import path

from .views import (
    JobListCreateView,
    JobApplicationListView,
    JobApplyView,
    JobRetrieveUpdateView,
    JobApplicationRetrieveUpdateView,
    PortfolioExperienceCreateView,
    ToolsListAPIView,
    PortfolioRetreiveAPIView,
    JobDetailView,
    JobByTokenAPIView,
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
)

urlpatterns = [
    path("", JobListCreateView.as_view(), name="job-list-create"),
    path("job-detail/<int:pk>", JobDetailView.as_view(), name="generic-job-detail"),
    path("<int:pk>/", JobRetrieveUpdateView.as_view(), name="job-detail"),
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
    path("<int:pk>/delete", JobDeleteView.as_view(), name="job-delete"),

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
    path('<int:job_id>/apply/', JobApplyByIdView.as_view(), name='job-apply-by-id'),
    path('apply/<uuid:apply_token>/apply/', JobApplyByTokenView.as_view(), name='job-apply-by-token'),
    path('external-apply/<uuid:apply_token>/', ExternalJobApplyRedirectView.as_view(), name='external-job-apply-redirect'),
    path('apply-pending-job/', ApplyToPendingJobView.as_view(), name='apply-pending-job'),
    path('external-application/', ExternalJobApplicationView.as_view(), name='external-job-application'),
    path('verify-otp/', JobApplicationOtpVerificationView.as_view(), name='job-application-otp-verification'),
    path('resend-otp/', JobApplicationResendOtpView.as_view(), name='job-application-resend-otp'),
]
