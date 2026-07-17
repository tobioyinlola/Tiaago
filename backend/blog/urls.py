from django.urls import path

from .views import (
    BlogCategoryListView,
    BlogCategoryManageListCreateView,
    BlogImageUploadView,
    BlogPostDetailView,
    BlogPostListView,
    BlogPostManageDetailView,
    BlogPostManageListCreateView,
    BlogStaffAuthorListView,
)

urlpatterns = [
    path("posts/", BlogPostListView.as_view(), name="blog-post-list"),
    path("posts/<slug:slug>/", BlogPostDetailView.as_view(), name="blog-post-detail"),
    path("categories/", BlogCategoryListView.as_view(), name="blog-category-list"),
    # Staff-only authoring endpoints
    path("manage/posts/", BlogPostManageListCreateView.as_view(), name="blog-manage-post-list"),
    path("manage/posts/<int:pk>/", BlogPostManageDetailView.as_view(), name="blog-manage-post-detail"),
    path("manage/categories/", BlogCategoryManageListCreateView.as_view(), name="blog-manage-category-list"),
    path("manage/authors/", BlogStaffAuthorListView.as_view(), name="blog-manage-author-list"),
    path("manage/upload-image/", BlogImageUploadView.as_view(), name="blog-manage-upload-image"),
]
