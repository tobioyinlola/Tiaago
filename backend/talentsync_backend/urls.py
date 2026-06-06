from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
import os

from roles.urls import router
from .views import media_debug, health_check, test_ping, trigger_error, ws_test

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
    path("api/auth/", include("create_user.urls")),
    path("api/case-study-projects/", include("case_study_projects.urls")),
    path("api/chats/", include("chats.urls")),
    path("api/contracts/", include("contract.urls")),
    path("api/jobs/", include("jobs.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/schedulers/", include("scheduler.urls")),
    path("api/quizzes/", include("quiz.urls")),
    path("api/skill-assessments/", include("skill_assessment.urls")),
    path("api/subscriptions/", include("subscriptions.urls")),
    path("api/work-experiences/", include("work_experience.urls")),
    path("api/management/", include("management.urls")),
    path("api/", include(router.urls)),
    path(
        "swagger<format>/", schema_view.without_ui(cache_timeout=0), name="schema-json"
    ),
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),

    # Testing endpoints
    path('media-debug/', media_debug),
    path('', health_check, name='health-check'),
    path('test-ping/', test_ping), 
    path("ws-test/", ws_test),
    path('sentry-debug/', trigger_error),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)