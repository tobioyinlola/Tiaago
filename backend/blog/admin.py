from django.contrib import admin

from .models import BlogCategory, BlogPost


@admin.register(BlogCategory)
class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "post_count", "created_at")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)

    def post_count(self, obj):
        return obj.posts.count()


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "status",
        "author",
        "is_featured",
        "is_pinned",
        "published_at",
        "created_at",
    )
    list_filter = ("status", "category", "is_featured", "is_pinned")
    search_fields = ("title", "excerpt", "content")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ["author"]
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("title", "slug", "category", "status", "published_at", "is_featured", "is_pinned")}),
        ("Author", {"fields": ("author", "custom_author_name", "author_title")}),
        ("Content", {"fields": ("excerpt", "featured_image", "content", "key_takeaways")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def save_model(self, request, obj, form, change):
        if not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)
