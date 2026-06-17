from django.urls import path

from .views import (
    AddToPipelineView,
    CategoryDetailView,
    CategoryListCreateView,
    GenerateInviteLinkView,
    PipelineListView,
    RemoveFromPipelineView,
    SubmitInviteApplicationView,
    UpdatePipelineEntryView,
    ValidateInviteTokenView,
)

urlpatterns = [
    path("pipeline/", PipelineListView.as_view(), name="pipeline-list"),
    path("pipeline/<int:pk>/", UpdatePipelineEntryView.as_view(), name="pipeline-update"),
    path("add-to-pipeline/", AddToPipelineView.as_view(), name="add-to-pipeline"),
    path("remove-from-pipeline/<int:pk>/", RemoveFromPipelineView.as_view(), name="remove-from-pipeline"),
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),
    path("categories/<int:pk>/invite-link/", GenerateInviteLinkView.as_view(), name="generate-invite-link"),
    path("invite/<uuid:token>/", ValidateInviteTokenView.as_view(), name="validate-invite-token"),
    path("invite/<uuid:token>/submit/", SubmitInviteApplicationView.as_view(), name="submit-invite-application"),
]
