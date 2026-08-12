from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.views import APIView

from campaigns.audience import (
    companies_for_audience,
    resolve_campaign_audience,
    resolve_recipients,
    resolve_talent_network_recipients,
)
from campaigns.block_renderer import ensure_footer, render_blocks
from campaigns.models import CampaignEmail, CampaignSend, EmailCampaign, EmailTemplate
from campaigns.serializers import CampaignEmailSerializer, EmailCampaignSerializer, EmailTemplateSerializer
from segments.models import AudienceSegment
from staff.permissions import requirePermission
from staff.utils import log_staff_activity

MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024

# A campaign is editable while it hasn't started sending, or while it's
# been explicitly paused mid-sequence -- SENDING itself is excluded since a
# batch may be executing against the current field values right now.
EDITABLE_CAMPAIGN_STATUSES = (EmailCampaign.Status.DRAFT, EmailCampaign.Status.SCHEDULED, EmailCampaign.Status.PAUSED)


class _CampaignsBaseView(APIView):
    pass


class EmailTemplateListCreateView(_CampaignsBaseView):
    """GET needs campaigns.view, POST needs campaigns.create."""

    def get_permissions(self):
        slug = "campaigns.view" if self.request.method == "GET" else "campaigns.create"
        return [requirePermission(slug)()]

    def get(self, request):
        templates = EmailTemplate.objects.all().order_by("-is_preset", "-updated_at")
        category = request.query_params.get("category")
        if category:
            templates = templates.filter(category=category)
        return Response(EmailTemplateSerializer(templates, many=True).data)

    def post(self, request):
        serializer = EmailTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        template = serializer.save()
        return Response(EmailTemplateSerializer(template).data, status=201)


class EmailTemplateDetailView(_CampaignsBaseView):
    """GET needs campaigns.view, PATCH needs campaigns.create, DELETE needs campaigns.delete."""

    def get_permissions(self):
        if self.request.method == "GET":
            slug = "campaigns.view"
        elif self.request.method == "DELETE":
            slug = "campaigns.delete"
        else:
            slug = "campaigns.create"
        return [requirePermission(slug)()]

    def get(self, request, template_id):
        template = EmailTemplate.objects.filter(id=template_id).first()
        if not template:
            return Response({"error": "Template not found"}, status=404)
        return Response(EmailTemplateSerializer(template).data)

    def patch(self, request, template_id):
        template = EmailTemplate.objects.filter(id=template_id).first()
        if not template:
            return Response({"error": "Template not found"}, status=404)
        serializer = EmailTemplateSerializer(template, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        template = serializer.save()
        return Response(EmailTemplateSerializer(template).data)

    def delete(self, request, template_id):
        deleted, _ = EmailTemplate.objects.filter(id=template_id, is_preset=False).delete()
        return Response(status=204 if deleted else 404)


class TemplatePreviewView(_CampaignsBaseView):
    """Renders un-saved blocks straight to HTML/text for the editor's live
    preview modal -- does not touch the database."""

    permission_classes = [requirePermission("campaigns.view")]

    def post(self, request):
        blocks = ensure_footer(request.data.get("blocks") or [])
        html_body, plain_text_body = render_blocks(blocks)
        return Response({"html_body": html_body, "plain_text_body": plain_text_body})


class CampaignImageUploadView(_CampaignsBaseView):
    permission_classes = [requirePermission("campaigns.create")]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "No image file provided."}, status=HTTP_400_BAD_REQUEST)
        if image.size > MAX_UPLOAD_IMAGE_BYTES:
            return Response({"detail": "Image must be under 10MB."}, status=HTTP_400_BAD_REQUEST)

        try:
            from PIL import Image as PILImage

            pil_image = PILImage.open(image)
            pil_image.verify()
            image.seek(0)
        except Exception:
            return Response({"detail": "That file isn't a valid image."}, status=HTTP_400_BAD_REQUEST)

        path = default_storage.save(f"campaign_images/{timezone.now():%Y/%m}/{image.name}", image)
        url = default_storage.url(path)
        return Response({"path": path, "url": request.build_absolute_uri(url)}, status=201)


class EmailCampaignListCreateView(_CampaignsBaseView):
    """GET needs campaigns.view, POST needs campaigns.create."""

    def get_permissions(self):
        slug = "campaigns.view" if self.request.method == "GET" else "campaigns.create"
        return [requirePermission(slug)()]

    def get(self, request):
        campaigns = EmailCampaign.objects.all().select_related("audience_segment", "audience_tag").prefetch_related("emails")
        status_filter = request.query_params.get("status")
        if status_filter:
            campaigns = campaigns.filter(status=status_filter)
        return Response(EmailCampaignSerializer(campaigns, many=True).data)

    def post(self, request):
        serializer = EmailCampaignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = serializer.save(created_by_admin=request.user, status=EmailCampaign.Status.DRAFT)
        # Every campaign starts life as a length-1 sequence -- a "single
        # blast" is just a sequence of one, never a special case elsewhere.
        CampaignEmail.objects.create(campaign=campaign, sequence_number=1)
        return Response(EmailCampaignSerializer(campaign).data, status=201)


class EmailCampaignDetailView(_CampaignsBaseView):
    """GET needs campaigns.view, PATCH needs campaigns.create, DELETE needs campaigns.delete."""

    def get_permissions(self):
        if self.request.method == "GET":
            slug = "campaigns.view"
        elif self.request.method == "DELETE":
            slug = "campaigns.delete"
        else:
            slug = "campaigns.create"
        return [requirePermission(slug)()]

    def get(self, request, campaign_id):
        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)
        return Response(EmailCampaignSerializer(campaign).data)

    def patch(self, request, campaign_id):
        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)
        if campaign.status not in EDITABLE_CAMPAIGN_STATUSES:
            return Response({"error": "This campaign can no longer be edited."}, status=400)
        serializer = EmailCampaignSerializer(campaign, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        campaign = serializer.save()
        return Response(EmailCampaignSerializer(campaign).data)

    def delete(self, request, campaign_id):
        deleted, _ = EmailCampaign.objects.filter(
            id=campaign_id, status__in=[EmailCampaign.Status.DRAFT, EmailCampaign.Status.CANCELLED]
        ).delete()
        return Response(status=204 if deleted else 404)


class CampaignEmailListCreateView(_CampaignsBaseView):
    """GET needs campaigns.view, POST needs campaigns.create. POST appends a
    new step to the campaign's sequence ("+ Add another email") -- sequence_number
    defaults to the next free slot when not supplied."""

    def get_permissions(self):
        slug = "campaigns.view" if self.request.method == "GET" else "campaigns.create"
        return [requirePermission(slug)()]

    def get(self, request, campaign_id):
        emails = CampaignEmail.objects.filter(campaign_id=campaign_id).order_by("sequence_number")
        return Response(CampaignEmailSerializer(emails, many=True).data)

    def post(self, request, campaign_id):
        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)
        if campaign.status not in EDITABLE_CAMPAIGN_STATUSES:
            return Response({"error": "This campaign can no longer be edited."}, status=400)

        data = dict(request.data)
        data["campaign"] = campaign.id
        if not data.get("sequence_number"):
            last = CampaignEmail.objects.filter(campaign=campaign).order_by("-sequence_number").first()
            data["sequence_number"] = (last.sequence_number + 1) if last else 1

        serializer = CampaignEmailSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        campaign_email = serializer.save()
        return Response(CampaignEmailSerializer(campaign_email).data, status=201)


class CampaignEmailDetailView(_CampaignsBaseView):
    """GET needs campaigns.view, PATCH needs campaigns.create, DELETE needs campaigns.delete."""

    def get_permissions(self):
        if self.request.method == "GET":
            slug = "campaigns.view"
        elif self.request.method == "DELETE":
            slug = "campaigns.delete"
        else:
            slug = "campaigns.create"
        return [requirePermission(slug)()]

    def get(self, request, campaign_id, email_id):
        campaign_email = CampaignEmail.objects.filter(id=email_id, campaign_id=campaign_id).first()
        if not campaign_email:
            return Response({"error": "Email not found"}, status=404)
        return Response(CampaignEmailSerializer(campaign_email).data)

    def patch(self, request, campaign_id, email_id):
        campaign_email = CampaignEmail.objects.filter(id=email_id, campaign_id=campaign_id).select_related("campaign").first()
        if not campaign_email:
            return Response({"error": "Email not found"}, status=404)
        if campaign_email.campaign.status not in EDITABLE_CAMPAIGN_STATUSES:
            return Response({"error": "This campaign can no longer be edited."}, status=400)
        serializer = CampaignEmailSerializer(campaign_email, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        campaign_email = serializer.save()
        return Response(CampaignEmailSerializer(campaign_email).data)

    def delete(self, request, campaign_id, email_id):
        campaign_email = CampaignEmail.objects.filter(id=email_id, campaign_id=campaign_id).select_related("campaign").first()
        if not campaign_email:
            return Response({"error": "Email not found"}, status=404)
        if campaign_email.campaign.status not in EDITABLE_CAMPAIGN_STATUSES:
            return Response({"error": "This campaign can no longer be edited."}, status=400)
        if campaign_email.sequence_number == 1:
            return Response({"error": "A campaign's first email can't be removed -- delete the campaign instead."}, status=400)
        campaign_email.delete()
        return Response(status=204)


class CampaignEmailReorderView(_CampaignsBaseView):
    """POST {"ordered_ids": [...]} -- reassigns sequence_number 1..N to
    match the given order. Used by the builder's drag-to-reorder."""

    permission_classes = [requirePermission("campaigns.create")]

    def post(self, request, campaign_id):
        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)
        if campaign.status not in EDITABLE_CAMPAIGN_STATUSES:
            return Response({"error": "This campaign can no longer be edited."}, status=400)

        ordered_ids = request.data.get("ordered_ids") or []
        emails = {str(e.id): e for e in CampaignEmail.objects.filter(campaign=campaign)}
        if set(ordered_ids) != set(emails.keys()):
            return Response({"error": "ordered_ids must include every email in this campaign exactly once."}, status=400)

        with transaction.atomic():
            # Two passes to dodge the (campaign, sequence_number) unique
            # constraint while numbers are mid-shuffle.
            for i, email_id in enumerate(ordered_ids):
                CampaignEmail.objects.filter(id=email_id).update(sequence_number=1000 + i)
            for i, email_id in enumerate(ordered_ids):
                CampaignEmail.objects.filter(id=email_id).update(sequence_number=i + 1)

        emails = CampaignEmail.objects.filter(campaign=campaign).order_by("sequence_number")
        return Response(CampaignEmailSerializer(emails, many=True).data)


class CampaignAudiencePreviewView(_CampaignsBaseView):
    """Stateless audience preview for the builder's Audience panel -- accepts
    audience params directly rather than requiring a saved campaign. Branches
    on audience_pool: COMPANY (default) previews via the segment/tag/manual
    resolvers, TALENT_NETWORK previews via the tn_* filter resolver."""

    permission_classes = [requirePermission("campaigns.view")]

    def post(self, request):
        if request.data.get("audience_pool") == "TALENT_NETWORK":
            recipients, excluded = resolve_talent_network_recipients(
                request.data.get("tn_role_categories") or [],
                request.data.get("tn_industries") or [],
                request.data.get("tn_years_experience") or [],
                request.data.get("tn_work_type") or "",
            )
            return Response({
                "total_organisations": None,
                "estimated_recipients": len(recipients),
                "excluded_unsubscribed": excluded,
                "sample_recipients": recipients[:5],
            })

        audience_type = request.data.get("audience_type")
        segment_id = request.data.get("audience_segment")
        tag_id = request.data.get("audience_tag")
        manual_ids = request.data.get("manual_organisation_ids") or []

        segment = AudienceSegment.objects.filter(id=segment_id).first() if segment_id else None
        companies = companies_for_audience(audience_type, segment, tag_id, manual_ids)
        recipients, excluded = resolve_recipients(companies)

        return Response({
            "total_organisations": companies.count(),
            "estimated_recipients": len(recipients),
            "excluded_unsubscribed": excluded,
            "sample_recipients": recipients[:5],
        })


class CampaignSendTestView(_CampaignsBaseView):
    """Sends a one-off test email to the requesting admin's own address,
    using representative sample merge-tag data (admins aren't attached to a
    Company or a Talent Network profile, so there's no live recipient data
    to pull for them). Defaults to the sequence's first email; pass
    campaign_email_id to test a specific step."""

    permission_classes = [requirePermission("campaigns.send")]

    def post(self, request, campaign_id):
        from campaigns.send_renderer import substitute_merge_tags
        from campaigns.tasks import send_raw_email

        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)

        email_id = request.data.get("campaign_email_id")
        campaign_email_qs = CampaignEmail.objects.filter(campaign=campaign).select_related("email_template")
        campaign_email = (
            campaign_email_qs.filter(id=email_id).first() if email_id
            else campaign_email_qs.filter(sequence_number=1).first()
        )
        if not campaign_email or not campaign_email.email_template:
            return Response({"error": "Email or template not found"}, status=404)
        if not request.user.email:
            return Response({"error": "Your admin account has no email address on file."}, status=400)

        if campaign.audience_pool == EmailCampaign.AudiencePool.TALENT_NETWORK:
            sample_context = {
                "first_name": request.user.first_name or "Admin", "last_name": "", "full_name": request.user.first_name or "Admin",
                "job_title": "Senior Product Designer", "years_experience": "5-8", "interested_roles": "Product Management, Design",
                "industry": "SaaS", "preferred_work_type": "REMOTE", "city": "Lagos", "country": "Nigeria",
                "unsubscribe_url": "#unsubscribe-preview",
            }
        else:
            sample_context = {
                "first_name": request.user.first_name or "Admin", "org_name": "Sample Org",
                "wallet_balance": "12,500.00", "resumes_screened_total": "342", "resumes_screened_month": "48",
                "assessments_total": "27", "active_jobs": "5", "pipeline_count": "63", "account_age_days": "128",
                "unsubscribe_url": "#unsubscribe-preview",
            }
        template = campaign_email.email_template
        subject = f"[TEST] {campaign_email.subject or template.subject_line}"
        html = substitute_merge_tags(template.html_body, sample_context)
        text = substitute_merge_tags(template.plain_text_body, sample_context)

        ok = send_raw_email(request.user.email, subject, html, text, from_name=campaign_email.from_name, reply_to=campaign_email.reply_to)
        if not ok:
            return Response({"error": "Test send failed via all providers."}, status=502)
        return Response({"status": "sent", "to": request.user.email})


class CampaignSendView(_CampaignsBaseView):
    """Immediate send (schedule_type=IMMEDIATE) or confirm-a-schedule
    (schedule_type=SCHEDULED, scheduled_for in the future) -- the builder's
    final "Send" action."""

    permission_classes = [requirePermission("campaigns.send")]

    def post(self, request, campaign_id):
        from campaigns.tasks import send_campaign

        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)
        if campaign.status != EmailCampaign.Status.DRAFT:
            return Response({"error": f"Campaign is already {campaign.status}."}, status=400)
        step_one = CampaignEmail.objects.filter(campaign=campaign, sequence_number=1).first()
        if not step_one or not step_one.email_template_id:
            return Response({"error": "Campaign's first email has no template selected."}, status=400)

        if campaign.schedule_type == EmailCampaign.ScheduleType.SCHEDULED and campaign.scheduled_for:
            campaign.status = EmailCampaign.Status.SCHEDULED
            campaign.save(update_fields=["status"])
            log_staff_activity(
                request.user, "campaigns.schedule", "EmailCampaign", campaign.id,
                {"scheduled_for": str(campaign.scheduled_for)},
            )
            return Response({"status": "scheduled", "scheduled_for": campaign.scheduled_for})

        send_campaign.delay(str(campaign.id))
        log_staff_activity(request.user, "campaigns.send", "EmailCampaign", campaign.id, {"name": campaign.name})
        return Response({"status": "sending"})


class CampaignCancelView(_CampaignsBaseView):
    permission_classes = [requirePermission("campaigns.send")]

    def post(self, request, campaign_id):
        updated = EmailCampaign.objects.filter(
            id=campaign_id,
            status__in=[EmailCampaign.Status.SCHEDULED, EmailCampaign.Status.SENDING, EmailCampaign.Status.PAUSED],
        ).update(status=EmailCampaign.Status.CANCELLED)
        return Response({"cancelled": bool(updated)})


class CampaignPauseView(_CampaignsBaseView):
    """Pauses a mid-sequence campaign -- advance_sequence_steps only polls
    SENDING campaigns, so this simply stops it from being picked up until
    resumed. Already-dispatched sends are unaffected."""

    permission_classes = [requirePermission("campaigns.send")]

    def post(self, request, campaign_id):
        updated = EmailCampaign.objects.filter(
            id=campaign_id, status=EmailCampaign.Status.SENDING
        ).update(status=EmailCampaign.Status.PAUSED)
        return Response({"paused": bool(updated)})


class CampaignResumeView(_CampaignsBaseView):
    permission_classes = [requirePermission("campaigns.send")]

    def post(self, request, campaign_id):
        updated = EmailCampaign.objects.filter(
            id=campaign_id, status=EmailCampaign.Status.PAUSED
        ).update(status=EmailCampaign.Status.SENDING)
        return Response({"resumed": bool(updated)})


class CampaignAnalyticsView(_CampaignsBaseView):
    permission_classes = [requirePermission("campaigns.view")]

    def get(self, request, campaign_id):
        from campaigns.analytics import get_campaign_analytics

        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)
        return Response(get_campaign_analytics(campaign))
