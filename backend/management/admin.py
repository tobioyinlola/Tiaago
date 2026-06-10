from django.contrib import admin
from .models import EmailTrack

# Register your models here.


@admin.register(EmailTrack)
class EmailTrackAdmin(admin.ModelAdmin):
    list_display = [
        "email",
        "email_type",
        "status",
        "delivery_status",
        "provider_message_id",
    ]
    list_filter = ["delivery_status"]
    search_fields = ["email", "provider_message_id"]
