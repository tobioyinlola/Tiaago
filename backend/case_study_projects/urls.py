from django.urls import path

from .views import (
    AllAttemptedCaseStudyProjectForMe,
    CaseStudyProjectDetailView,
    CaseStudyProjectForMe,
    CaseStudyProjectListCreateView,
    TalentAttemptCaseStudyView,
    TalentAttemptCaseStudyDetailView,
    TalentAttemptCaseStudyAdminView,
    TalentAttemptAllCaseStudyForAdmin
)

urlpatterns = [
    path("", CaseStudyProjectListCreateView.as_view(), name="case-study-list-create"),
    path("for-me/", CaseStudyProjectForMe.as_view(), name="case-study-for-me"),
    path("<int:pk>/", CaseStudyProjectDetailView.as_view(), name="case-study-detail"),
    path(
        '<int:case_study_pk>/attempt-case-study/', 
        TalentAttemptCaseStudyView.as_view(), 
        name="case-study-attempt"
    ),
    path('<int:case_study_pk>/attempt-case-study/<int:pk>/', 
        TalentAttemptCaseStudyDetailView.as_view(),
        name='case-study-attempt-detail'),
    path(
        'talent-attempt/<int:pk>/admin-approve/', 
        TalentAttemptCaseStudyAdminView.as_view(), 
        name="case-study-attempt-admin"
    ),
    path('all-attempted-for-me/', AllAttemptedCaseStudyProjectForMe.as_view()),
    path("talent-attempt-all-case-study-for-admin/", TalentAttemptAllCaseStudyForAdmin.as_view())
]