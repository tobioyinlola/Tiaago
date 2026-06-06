from django.db import models
from django.utils.text import slugify


class Role(models.Model):
    title = models.CharField(max_length=70, unique=True)
    is_technical = models.BooleanField(default=True)
    is_startup_role = models.BooleanField(default=False)
    slug = models.SlugField(blank=True, max_length=70, unique=True)
    created = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-created",)
        unique_together = ("title", "slug")

    def __str__(self):
        return self.title.lower()

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)

            # check for existing slugs that are similar
            existing_slugs = Role.objects.filter(
                slug__startswith=self.slug
            ).values_list("slug", flat=True)

            if self.slug in existing_slugs:
                max_slug_number = 1
                # extract number from the slugs and find the highest
                for slug in existing_slugs:
                    try:
                        number = int(slug.split("-")[-1])
                        if number >= max_slug_number:
                            max_slug_number = number + 1
                    except (IndexError, ValueError):
                        continue
                # append the highest number found to the slug
                self.slug = f"{self.slug}-{max_slug_number}"

        super().save(*args, **kwargs)
