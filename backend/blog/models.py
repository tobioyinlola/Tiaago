from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils import timezone

from base.models import TimeStampedModel
from ckeditor_uploader.fields import RichTextUploadingField


class BlogCategory(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        verbose_name_plural = "Blog categories"
        ordering = ("name",)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class BlogPost(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    excerpt = models.CharField(
        max_length=300,
        blank=True,
        default="",
        help_text="Short summary shown on the blog listing page and in search/social previews.",
    )
    content = RichTextUploadingField(
        help_text="Full post body -- supports images, links, formatting."
    )
    featured_image = models.ImageField(upload_to="blog_featured_images/%Y/%m/", blank=True, null=True)
    category = models.ForeignKey(
        BlogCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="posts"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="blog_posts"
    )
    custom_author_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Overrides `author` on display -- lets a post be published under a name that isn't a real staff account.",
    )
    author_title = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="e.g. CEO, Product Lead -- shown next to the author's name.",
    )
    key_takeaways = models.JSONField(
        default=list,
        blank=True,
        help_text="Bullet points shown in a 'Key Takeaways' callout near the top of the post.",
    )
    is_featured = models.BooleanField(default=False, help_text="Shown in the spotlight slot on the public blog page.")
    is_pinned = models.BooleanField(default=False, help_text="Pinned to the top of admin and public listings.")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ("-is_pinned", "-published_at", "-created_at")
        indexes = [
            models.Index(fields=["status", "published_at"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            n = 1
            while BlogPost.all_objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base_slug}-{n}"
            self.slug = slug

        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()

        super().save(*args, **kwargs)

    @property
    def reading_time_minutes(self):
        import re

        text = re.sub("<[^<]+?>", "", self.content or "")
        word_count = len(text.split())
        return max(1, round(word_count / 200))
