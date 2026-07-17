from rest_framework import serializers

from base.utils import get_media_url
from create_user.models import CustomUser
from .models import BlogCategory, BlogPost


class BlogCategorySerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = BlogCategory
        fields = ("id", "name", "slug", "description", "post_count")

    def get_post_count(self, obj):
        return obj.posts.filter(status=BlogPost.Status.PUBLISHED).count()


def _resolve_author(obj):
    """Custom author (free-text) always wins on display over a linked user."""
    if obj.custom_author_name:
        return {"name": obj.custom_author_name, "avatar": None, "title": obj.author_title or None}
    if obj.author:
        name = (obj.author.get_full_name() or "").strip() or obj.author.username
        return {
            "name": name,
            "avatar": get_media_url(getattr(obj.author, "profile_pic", None)),
            "title": obj.author_title or None,
        }
    return {"name": "TIAAGO Team", "avatar": None, "title": obj.author_title or None}


class BlogPostListSerializer(serializers.ModelSerializer):
    category = BlogCategorySerializer(read_only=True)
    author = serializers.SerializerMethodField()
    reading_time_minutes = serializers.ReadOnlyField()
    featured_image = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = (
            "id",
            "title",
            "slug",
            "excerpt",
            "featured_image",
            "category",
            "author",
            "is_featured",
            "is_pinned",
            "published_at",
            "reading_time_minutes",
        )

    def get_author(self, obj):
        return _resolve_author(obj)

    def get_featured_image(self, obj):
        url = get_media_url(obj.featured_image)
        if not url:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class BlogPostDetailSerializer(BlogPostListSerializer):
    class Meta(BlogPostListSerializer.Meta):
        fields = BlogPostListSerializer.Meta.fields + ("content",)


class BlogStaffAuthorSerializer(serializers.Serializer):
    """Lightweight shape for the admin author-picker dropdown."""

    id = serializers.IntegerField()
    name = serializers.SerializerMethodField()

    def get_name(self, user):
        return (user.get_full_name() or "").strip() or user.username


class BlogPostManageSerializer(serializers.ModelSerializer):
    """Full read/write serializer for staff authoring -- used by the
    /admin/blog dashboard pages, not the public read-only endpoints.

    `category` stays a plain PK for writes (select a category by id), while
    `category_detail` gives the admin UI the nested {id, name, ...} shape for
    display without needing a second lookup. `author` is restricted to staff
    accounts (the "System author" picker) and is optional -- leaving it unset
    while `custom_author_name` is set publishes under a free-text byline (the
    "Custom author" mode) instead of a real account.

    `featured_image_path` supports the immediate-upload cover image flow: the
    file is uploaded separately via BlogImageUploadView the moment it's chosen,
    and this field just receives the resulting storage path to attach here --
    the final create/update call carries no file, only JSON.
    """

    author_name = serializers.SerializerMethodField()
    category_detail = BlogCategorySerializer(source="category", read_only=True)
    author = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(user_type=CustomUser.USER_TYPE.STAFF),
        required=False,
        allow_null=True,
    )
    featured_image_path = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = BlogPost
        fields = (
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "featured_image",
            "featured_image_path",
            "category",
            "category_detail",
            "author",
            "author_name",
            "custom_author_name",
            "author_title",
            "is_featured",
            "is_pinned",
            "status",
            "published_at",
            "reading_time_minutes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "featured_image", "reading_time_minutes", "created_at", "updated_at")
        extra_kwargs = {"slug": {"required": False}}

    def get_author_name(self, obj):
        return _resolve_author(obj)["name"]

    def _apply_image_path(self, instance, image_path):
        if not image_path:
            return
        instance.featured_image.name = image_path
        instance.save(update_fields=["featured_image"])

    def create(self, validated_data):
        image_path = validated_data.pop("featured_image_path", None)
        instance = super().create(validated_data)
        self._apply_image_path(instance, image_path)
        return instance

    def update(self, instance, validated_data):
        image_path = validated_data.pop("featured_image_path", None)
        instance = super().update(instance, validated_data)
        self._apply_image_path(instance, image_path)
        return instance
