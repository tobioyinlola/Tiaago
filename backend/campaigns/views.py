from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.views import APIView

from campaigns.audience import companies_for_audience, resolve_campaign_audience, resolve_recipients
from campaigns.block_renderer import ensure_footer, render_blocks
from campaigns.models import CampaignSend, EmailCampaign, EmailTemplate
from campaigns.serializers import EmailCampaignSerializer, EmailTemplateSerializer
from segments.models import AudienceSegment
from staff.permissions import requirePermission
from staff.utils import log_staff_activity

MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024


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
        campaigns = EmailCampaign.objects.all().select_related("audience_segment", "audience_tag", "email_template")
        status_filter = request.query_params.get("status")
        if status_filter:
            campaigns = campaigns.filter(status=status_filter)
        return Response(EmailCampaignSerializer(campaigns, many=True).data)

    def post(self, request):
        serializer = EmailCampaignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = serializer.save(created_by_admin=request.user, status=EmailCampaign.Status.DRAFT)
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
        if campaign.status not in (EmailCampaign.Status.DRAFT, EmailCampaign.Status.SCHEDULED):
            return Response({"error": "Only draft or scheduled campaigns can be edited."}, status=400)
        serializer = EmailCampaignSerializer(campaign, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        campaign = serializer.save()
        return Response(EmailCampaignSerializer(campaign).data)

    def delete(self, request, campaign_id):
        deleted, _ = EmailCampaign.objects.filter(
            id=campaign_id, status__in=[EmailCampaign.Status.DRAFT, EmailCampaign.Status.CANCELLED]
        ).delete()
        return Response(status=204 if deleted else 404)


class CampaignAudiencePreviewView(_CampaignsBaseView):
    """Stateless audience preview for wizard step 2 -- accepts audience
    params directly rather than requiring a saved campaign, since the wizard
    doesn't persist a campaign until the admin explicitly saves/sends."""

    permission_classes = [requirePermission("campaigns.view")]

    def post(self, request):
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
    Company, so there's no live org data to pull for them)."""

    permission_classes = [requirePermission("campaigns.send")]

    def post(self, request, campaign_id):
        from campaigns.send_renderer import substitute_merge_tags

        campaign = EmailCampaign.objects.filter(id=campaign_id).select_related("email_template").first()
        if not campaign or not campaign.email_template:
            return Response({"error": "Campaign or template not found"}, status=404)
        if not request.user.email:
            return Response({"error": "Your admin account has no email address on file."}, status=400)

        from campaigns.tasks import send_raw_email

        sample_context = {
            "first_name": request.user.first_name or "Admin", "org_name": "Sample Org",
            "wallet_balance": "12,500.00", "resumes_screened_total": "342", "resumes_screened_month": "48",
            "assessments_total": "27", "active_jobs": "5", "pipeline_count": "63", "account_age_days": "128",
            "unsubscribe_url": "#unsubscribe-preview",
        }
        template = campaign.email_template
        subject = f"[TEST] {campaign.subject_line or template.subject_line}"
        html = substitute_merge_tags(template.html_body, sample_context)
        text = substitute_merge_tags(template.plain_text_body, sample_context)

        ok = send_raw_email(request.user.email, subject, html, text)
        if not ok:
            return Response({"error": "Test send failed via all providers."}, status=502)
        return Response({"status": "sent", "to": request.user.email})


class CampaignSendView(_CampaignsBaseView):
    """Immediate send (schedule_type=IMMEDIATE) or confirm-a-schedule
    (schedule_type=SCHEDULED, scheduled_for in the future) -- step 6 of the
    wizard."""

    permission_classes = [requirePermission("campaigns.send")]

    def post(self, request, campaign_id):
        from campaigns.tasks import send_campaign

        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)
        if campaign.status != EmailCampaign.Status.DRAFT:
            return Response({"error": f"Campaign is already {campaign.status}."}, status=400)
        if not campaign.email_template_id:
            return Response({"error": "Campaign has no template selected."}, status=400)

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
            id=campaign_id, status=EmailCampaign.Status.SCHEDULED
        ).update(status=EmailCampaign.Status.CANCELLED)
        return Response({"cancelled": bool(updated)})


class CampaignAnalyticsView(_CampaignsBaseView):
    permission_classes = [requirePermission("campaigns.view")]

    def get(self, request, campaign_id):
        from campaigns.analytics import get_campaign_analytics

        campaign = EmailCampaign.objects.filter(id=campaign_id).first()
        if not campaign:
            return Response({"error": "Campaign not found"}, status=404)
        return Response(get_campaign_analytics(campaign))
