from django.urls import path

from . import views

urlpatterns = [
    path("contact/", views.PublicContactSubmissionView.as_view(), name="public-contact-submission"),
    path("tickets/", views.TicketListCreateView.as_view(), name="support-tickets"),
    path("tickets/<uuid:ticket_id>/", views.TicketDetailView.as_view(), name="support-ticket-detail"),
    path("tickets/<uuid:ticket_id>/replies/", views.TicketReplyView.as_view(), name="support-ticket-reply"),
    path("tickets/<uuid:ticket_id>/reopen/", views.TicketReopenView.as_view(), name="support-ticket-reopen"),
    path("admin/staff/", views.AdminStaffListView.as_view(), name="support-admin-staff"),
    path("admin/tickets/", views.AdminTicketListView.as_view(), name="support-admin-tickets"),
    path("admin/tickets/<uuid:ticket_id>/", views.AdminTicketDetailView.as_view(), name="support-admin-ticket-detail"),
    path("admin/tickets/<uuid:ticket_id>/replies/", views.AdminTicketReplyView.as_view(), name="support-admin-ticket-reply"),
]
