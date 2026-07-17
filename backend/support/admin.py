from django.contrib import admin

from .models import SupportTicket, SupportTicketReply, SupportTicketAttachment


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("display_number", "title", "company", "status", "priority", "created_at")
    list_filter = ("status", "priority", "category")
    search_fields = ("title", "company__company_name", "ticket_number")


admin.site.register(SupportTicketReply)
admin.site.register(SupportTicketAttachment)
