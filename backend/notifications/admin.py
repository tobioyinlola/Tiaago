from django.contrib import admin

from .models import Notification, NotificationRead


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "target_scope", "target_organisation", "created_at", "sent_by")
    list_filter = ("type", "target_scope")
    search_fields = ("title", "message")


admin.site.register(NotificationRead)
