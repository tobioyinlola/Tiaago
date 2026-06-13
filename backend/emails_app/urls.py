from django.urls import path

from . import views

app_name = "emails_app"

urlpatterns = [
    path("", views.email_index, name="index"),
    path("<str:name>/", views.email_preview, name="preview"),
]
