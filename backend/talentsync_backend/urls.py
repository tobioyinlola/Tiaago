from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
import os

from roles.urls import router
from .views import media_debug, health_check, health_status, test_ping, ws_test

swagger_base_url = None
if settings.DEBUG:
    swagger_base_url = os.getenv("SWAGGER_BASE_URL", "http://localhost:8000/api")
else:
    swagger_base_url = os.getenv("SWAGGER_BASE_URL")
schema_view = get_schema_view(
    openapi.Info(
        title="Talentsync Backend API",
        default_version="v2",
        description="API",
        terms_of_service="",
        contact=openapi.Contact(email="olaism01@gmail.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    url=swagger_base_url,
)

urlpatterns = [
    path("admin-xfghlabdfgv/", admin.site.urls),
    path("ckeditor/", include("ckeditor_uploader.urls")),
    path("api/auth/", include("create_user.urls")),
    path("api/blog/", include("blog.urls")),
    path("api/case-study-projects/", include("case_study_projects.urls")),
    path("api/chats/", include("chats.urls")),
    path("api/contracts/", include("contract.urls")),
    path("api/jobs/", include("jobs.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/schedulers/", include("scheduler.urls")),
    path("api/interviews/", include("scheduler.interview_urls")),
    path("api/ai-interviews/", include("ai_interviews.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/quizzes/", include("quiz.urls")),
    path("api/skill-assessments/", include("skill_assessment.urls")),
    path("api/subscriptions/", include("subscriptions.urls")),
    path("api/work-experiences/", include("work_experience.urls")),
    path("api/management/", include("management.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/support/", include("support.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/proctoring/", include("proctoring.urls")),
    path("api/sourcing/", include("sourcing.urls")),
    path("api/tags/", include("tags.urls")),
    path("api/segments/", include("segments.urls")),
    path("api/campaigns/", include("campaigns.urls")),
    path("api/email/", include("campaigns.tracking_urls")),
    path("api/staff/", include("staff.urls")),
    path("api/ats/", include("ats_integrations.urls")),
    path("api/talent-network/", include("talent_network.urls")),
    # Registered before the router include so it can never be shadowed.
    path("api/health/", health_status, name="health-status"),
    path("api/", include(router.urls)),
    path('', health_check, name='health-check'),
]

# Debug-only routes: schema browsers and test endpoints must not exist in
# production (media-debug leaks paths, test-ping fires Celery tasks).
if settings.DEBUG:
    urlpatterns += [
        path(
            "swagger<format>/", schema_view.without_ui(cache_timeout=0), name="schema-json"
        ),
        path(
            "swagger/",
            schema_view.with_ui("swagger", cache_timeout=0),
            name="schema-swagger-ui",
        ),
        path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
        path('media-debug/', media_debug),
        path('test-ping/', test_ping),
        path("ws-test/", ws_test),
        path("dev/emails/", include("emails_app.urls")),
    ]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)