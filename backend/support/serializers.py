from rest_framework import serializers

from base.utils import get_media_url
from create_user.models import CustomUser
from .models import SupportTicket, SupportTicketReply, SupportTicketAttachment

SUPPORT_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024  # 10MB
SUPPORT_ATTACHMENT_MAX_FILES = 3
SUPPORT_ATTACHMENT_ALLOWED_EXTENSIONS = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "pdf": "application/pdf",
    "csv": "text/csv",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def validate_attachment_files(files):
    """Shared validation for ticket-creation and reply attachments. Raises
    serializers.ValidationError on the first problem found."""
    if len(files) > SUPPORT_ATTACHMENT_MAX_FILES:
        raise serializers.ValidationError(
            f"You can attach at most {SUPPORT_ATTACHMENT_MAX_FILES} files."
        )
    for f in files:
        if f.size > SUPPORT_ATTACHMENT_MAX_SIZE:
            raise serializers.ValidationError(f"{f.name} is too large. Max file size is 10MB.")
        extension = f.name.split(".")[-1].lower()
        if extension not in SUPPORT_ATTACHMENT_ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"{f.name}: only {', '.join(sorted(SUPPORT_ATTACHMENT_ALLOWED_EXTENSIONS))} files are allowed."
            )
    return files


def create_attachments(files, *, ticket, reply=None):
    for f in files:
        SupportTicketAttachment.objects.create(
            ticket=ticket,
            reply=reply,
            file=f,
            file_name=f.name,
            file_size=f.size,
            file_type=f.content_type or "",
        )


class SupportTicketAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicketAttachment
        fields = ("id", "file_name", "file_url", "file_size", "file_type", "uploaded_at")

    def get_file_url(self, obj):
        return get_media_url(obj.file)


class _UserNameSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ("id", "name", "email")

    def get_name(self, user):
        return (user.get_full_name() or "").strip() or user.username


# Public alias for the "assigned to" staff-picker dropdown -- same lightweight
# {id, name, email} shape as BlogStaffAuthorSerializer's precedent.
SupportStaffSerializer = _UserNameSerializer


class SupportTicketReplySerializer(serializers.ModelSerializer):
    sent_by = _UserNameSerializer(read_only=True)
    attachments = SupportTicketAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicketReply
        fields = ("id", "sent_by", "is_admin_reply", "is_internal_note", "message", "created_at", "attachments")


class SupportTicketListSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source="display_number", read_only=True)
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = (
            "id", "ticket_number", "title", "category", "status", "priority",
            "created_at", "updated_at", "reply_count",
        )

    def get_reply_count(self, obj):
        return obj.replies.filter(is_internal_note=False).count()


class SupportTicketAdminListSerializer(SupportTicketListSerializer):
    # company/submitted_by are null for a public contact-form ticket (see
    # SupportTicket.Source) -- source="company.company_name" would raise
    # AttributeError on a null company (DRF only guards ObjectDoesNotExist,
    # not None traversal), so these are plain methods instead.
    company_name = serializers.SerializerMethodField()
    company_id = serializers.IntegerField(read_only=True, allow_null=True)
    submitted_by = _UserNameSerializer(read_only=True)
    assigned_to = _UserNameSerializer(read_only=True)
    source = serializers.CharField(read_only=True)
    contact_name = serializers.CharField(read_only=True)
    contact_email = serializers.CharField(read_only=True)

    class Meta(SupportTicketListSerializer.Meta):
        fields = SupportTicketListSerializer.Meta.fields + (
            "company_id", "company_name", "submitted_by", "assigned_to",
            "source", "contact_name", "contact_email",
        )

    def get_company_name(self, obj):
        return obj.company.company_name if obj.company else ""


class SupportTicketDetailSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source="display_number", read_only=True)
    submitted_by = _UserNameSerializer(read_only=True)
    assigned_to = _UserNameSerializer(read_only=True)
    company_name = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = (
            "id", "ticket_number", "title", "message", "category", "status", "priority",
            "company_name", "submitted_by", "assigned_to", "source", "contact_name", "contact_email",
            "created_at", "updated_at", "resolved_at", "closed_at",
            "attachments", "replies",
        )

    def get_company_name(self, obj):
        return obj.company.company_name if obj.company else ""

    def get_attachments(self, obj):
        # Original-submission attachments only (reply=None); reply attachments
        # are nested under their own reply entry.
        qs = obj.attachments.filter(reply__isnull=True)
        return SupportTicketAttachmentSerializer(qs, many=True, context=self.context).data

    def get_replies(self, obj):
        qs = obj.replies.all()
        if not self.context.get("include_internal_notes"):
            qs = qs.filter(is_internal_note=False)
        return SupportTicketReplySerializer(qs, many=True, context=self.context).data


class PublicContactSubmissionSerializer(serializers.Serializer):
    """Public contact-form submission (no account) -- creates a SupportTicket
    with company/submitted_by left null; see SupportTicket.Source."""

    first_name = serializers.CharField(max_length=75)
    last_name = serializers.CharField(max_length=75)
    email = serializers.EmailField()
    message = serializers.CharField(min_length=10, max_length=5000)


class SupportTicketCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=120)
    category = serializers.ChoiceField(choices=SupportTicket.Category.choices)
    message = serializers.CharField(min_length=20)
    attachments = serializers.ListField(
        child=serializers.FileField(), required=False, allow_empty=True, default=list
    )

    def validate_attachments(self, files):
        return validate_attachment_files(files)


class SupportTicketReplyCreateSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=1)
    attachments = serializers.ListField(
        child=serializers.FileField(), required=False, allow_empty=True, default=list
    )
    is_internal_note = serializers.BooleanField(required=False, default=False)

    def validate_attachments(self, files):
        return validate_attachment_files(files)


class SupportTicketAdminUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SupportTicket.Status.choices, required=False)
    priority = serializers.ChoiceField(choices=SupportTicket.Priority.choices, required=False)
    category = serializers.ChoiceField(choices=SupportTicket.Category.choices, required=False)
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(user_type=CustomUser.USER_TYPE.STAFF),
        required=False, allow_null=True,
    )
