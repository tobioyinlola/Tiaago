from collections import OrderedDict

from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework.filters import SearchFilter
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView

from base.permissions import IsStaffUser
from create_user.models import CustomUser
from rest_framework.response import Response

from .models import BlogCategory, BlogPost
from .serializers import (
    BlogCategorySerializer,
    BlogPostDetailSerializer,
    BlogPostListSerializer,
    BlogPostManageSerializer,
    BlogStaffAuthorSerializer,
)

MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024


class BlogPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("current", self.page.number),
                    ("count", self.page.paginator.count),
                    ("next", self.page.next_page_number() if self.page.has_next() else None),
                    ("previous", self.page.previous_page_number() if self.page.has_previous() else None),
                    ("results", data),
                ]
            )
        )


def published_posts():
    return BlogPost.objects.filter(
        status=BlogPost.Status.PUBLISHED, published_at__lte=timezone.now()
    ).select_related("category", "author")


class BlogPostListView(ListAPIView):
    """Public, published blog posts. Filter by ?category=<slug>, search by ?search=."""

    serializer_class = BlogPostListSerializer
    permission_classes = [AllowAny]
    pagination_class = BlogPagination
    filter_backends = [SearchFilter]
    search_fields = ["title", "excerpt", "content"]

    def get_queryset(self):
        queryset = published_posts()
        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        return queryset


class BlogPostDetailView(RetrieveAPIView):
    """Public, published blog post by slug."""

    serializer_class = BlogPostDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return published_posts()


class BlogCategoryListView(ListAPIView):
    """Public list of categories that have at least one published post."""

    serializer_class = BlogCategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return BlogCategory.objects.filter(posts__in=published_posts()).distinct()


# --- Staff-only authoring endpoints, backing the /admin/blog dashboard pages ---


class BlogManagePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("current", self.page.number),
                    ("count", self.page.paginator.count),
                    ("next", self.page.next_page_number() if self.page.has_next() else None),
                    ("previous", self.page.previous_page_number() if self.page.has_previous() else None),
                    ("results", data),
                ]
            )
        )


class BlogPostManageListCreateView(ListCreateAPIView):
    """Staff-only: list every post (any status) and create new ones."""

    serializer_class = BlogPostManageSerializer
    permission_classes = [IsStaffUser]
    pagination_class = BlogManagePagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [SearchFilter]
    search_fields = ["title", "excerpt"]

    def get_queryset(self):
        queryset = BlogPost.objects.all().select_related("category", "author")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        category_filter = self.request.query_params.get("category")
        if category_filter:
            queryset = queryset.filter(category_id=category_filter)
        return queryset

    def perform_create(self, serializer):
        # Default to the requesting staff member only when neither a system
        # author nor a custom byline was explicitly chosen.
        if not serializer.validated_data.get("author") and not serializer.validated_data.get(
            "custom_author_name"
        ):
            serializer.save(author=self.request.user)
        else:
            serializer.save()


class BlogPostManageDetailView(RetrieveUpdateDestroyAPIView):
    """Staff-only: retrieve/update/delete a single post by id, any status."""

    serializer_class = BlogPostManageSerializer
    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = BlogPost.objects.all().select_related("category", "author")


class BlogCategoryManageListCreateView(ListCreateAPIView):
    """Staff-only: list every category (regardless of post count) and create new ones."""

    serializer_class = BlogCategorySerializer
    permission_classes = [IsStaffUser]
    pagination_class = None
    queryset = BlogCategory.objects.all()


class BlogStaffAuthorListView(ListAPIView):
    """Staff-only: list staff accounts for the "System author" picker."""

    serializer_class = BlogStaffAuthorSerializer
    permission_classes = [IsStaffUser]
    pagination_class = None
    queryset = CustomUser.objects.filter(user_type=CustomUser.USER_TYPE.STAFF).order_by(
        "first_name", "username"
    )


class BlogImageUploadView(APIView):
    """Staff-only: upload a cover image immediately (ahead of the post being
    created/saved) and get back a storage path to attach via
    BlogPostManageSerializer's `featured_image_path` field."""

    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "No image file provided."}, status=HTTP_400_BAD_REQUEST)

        if image.size > MAX_UPLOAD_IMAGE_BYTES:
            return Response({"detail": "Image must be under 10MB."}, status=HTTP_400_BAD_REQUEST)

        try:
            from PIL import Image as PILImage

            pil_image = PILImage.open(image)
            pil_image.verify()
            image.seek(0)
        except Exception:
            return Response({"detail": "That file isn't a valid image."}, status=HTTP_400_BAD_REQUEST)

        path = default_storage.save(f"blog_featured_images/{timezone.now():%Y/%m}/{image.name}", image)
        url = default_storage.url(path)
        return Response(
            {"path": path, "url": request.build_absolute_uri(url)},
            status=HTTP_201_CREATED,
        )
