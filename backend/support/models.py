import uuid

from django.conf import settings
from django.db import models, connection

from create_user.models import Company


class SupportTicket(models.Model):
    class Category(models.TextChoices):
        BILLING = "BILLING", "Billing"
        TECHNICAL = "TECHNICAL", "Technical issue"
        ACCOUNT = "ACCOUNT", "Account and access"
        ASSESSMENTS = "ASSESSMENTS", "Assessments"
        PIPELINE = "PIPELINE", "Pipeline"
        GENERAL = "GENERAL", "General inquiry"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Source(models.TextChoices):
        APP = "APP", "In-app"
        PUBLIC_CONTACT_FORM = "PUBLIC_CONTACT_FORM", "Public contact form"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # A separate human-readable sequence (TKT-00042) from a dedicated Postgres
    # sequence (see migration) -- atomic under concurrent creation, unlike a
    # naive Max()+1 read-then-write.
    ticket_number = models.PositiveIntegerField(unique=True, editable=False, null=True, blank=True)

    # Both null for a public contact-form submission -- there's no company/
    # account behind an anonymous website visitor. contact_name/contact_email
    # are the identity for that case; see source.
    company = models.ForeignKey(Company, related_name="support_tickets", on_delete=models.CASCADE, null=True, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="submitted_support_tickets", on_delete=models.CASCADE,
        null=True, blank=True,
    )
    source = models.CharField(max_length=25, choices=Source.choices, default=Source.APP)
    contact_name = models.CharField(max_length=150, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")

    title = models.CharField(max_length=120)
    message = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="assigned_support_tickets",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    # Set the moment a staff member opens this ticket (AdminTicketDetailView.get).
    # Deliberately separate from updated_at, which changes on an admin's own
    # status/priority edits too -- this only tracks "has staff looked at the
    # current state of this ticket", which is what the unread-message
    # counter on the admin nav is built on.
    last_viewed_by_admin_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.display_number} - {self.title}"

    @property
    def display_number(self):
        return f"TKT-{self.ticket_number:05d}" if self.ticket_number else "TKT-pending"

    def save(self, *args, **kwargs):
        if self.ticket_number is None:
            with connection.cursor() as cursor:
                cursor.execute("SELECT nextval('support_ticket_number_seq')")
                self.ticket_number = cursor.fetchone()[0]
        super().save(*args, **kwargs)


class SupportTicketReply(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, related_name="replies", on_delete=models.CASCADE)
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="support_ticket_replies",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_admin_reply = models.BooleanField(default=False)
    # Internal notes are modeled as a reply flag (not a separate table) since
    # they share the same thread/attachment shape -- filtered out of every
    # user-facing serializer, never emailed.
    is_internal_note = models.BooleanField(default=False)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)

    def __str__(self):
        return f"Reply on {self.ticket.display_number} by {self.sent_by or 'admin'}"


class SupportTicketAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, related_name="attachments", on_delete=models.CASCADE)
    reply = models.ForeignKey(
        SupportTicketReply, related_name="attachments", on_delete=models.CASCADE, null=True, blank=True
    )
    file = models.FileField(upload_to="support_ticket_attachments/%Y/%m/%d/")
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="Size in bytes")
    file_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name
