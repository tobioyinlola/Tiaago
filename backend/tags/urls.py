from django.urls import path

from . import views

urlpatterns = [
    path("admin/system/", views.SystemTagListView.as_view(), name="tags-admin-system-list"),
    path("admin/system/<uuid:tag_id>/deactivate/", views.SystemTagDeactivateView.as_view(), name="tags-admin-system-deactivate"),
    path("admin/system/<uuid:tag_id>/activate/", views.SystemTagActivateView.as_view(), name="tags-admin-system-activate"),
    path("admin/custom/", views.CustomTagListCreateView.as_view(), name="tags-admin-custom-list-create"),
    path("admin/custom/<uuid:tag_id>/apply/", views.CustomTagApplyView.as_view(), name="tags-admin-custom-apply"),
    path("admin/custom/<uuid:tag_id>/remove/", views.CustomTagRemoveView.as_view(), name="tags-admin-custom-remove"),
    path("admin/<uuid:tag_id>/organisations/", views.TagOrganisationsView.as_view(), name="tags-admin-tag-organisations"),
    path("admin/organisations/<int:company_id>/tags/", views.OrganisationTagsView.as_view(), name="tags-admin-organisation-tags"),
    path("admin/organisations/<int:company_id>/tags/timeline/", views.OrganisationTagTimelineView.as_view(), name="tags-admin-organisation-tags-timeline"),
    path("admin/organisations/<int:company_id>/reevaluate/", views.OrganisationReevaluateView.as_view(), name="tags-admin-organisation-reevaluate"),
]
