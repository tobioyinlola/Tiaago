from django.urls import path

from .views import (
    ContractCreateView,
    ContractDetailView,
    ContractListView
)

urlpatterns = [
    path("create/<int:talent_id>/", ContractCreateView.as_view(), name="contract-create"),
    path("all/",  ContractListView.as_view(), name="contract-list"),
    path("<int:pk>/", ContractDetailView.as_view(), name="contract-detail")
]