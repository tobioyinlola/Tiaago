import base64
import logging
from urllib.parse import unquote

from django.db import models
from django.http import HttpResponse, HttpResponseRedirect
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from campaigns.models import CampaignEmail, CampaignLinkClick, CampaignSend, EmailCampaign, EmailUnsubscribe

logger = logging.getLogger(__name__)

# 1x1 transparent GIF.
_TRACKING_PIXEL = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")


class TrackOpenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, send_id):
        updated = CampaignSend.objects.filter(id=send_id, opened_at__isnull=True).update(
            opened_at=timezone.now(), status=CampaignSend.Status.OPENED
        )
        if updated:
            CampaignEmail.objects.filter(
                sends__id=send_id
            ).update(total_opened=models.F("total_opened") + 1)
        return HttpResponse(_TRACKING_PIXEL, content_type="image/gif")


class TrackClickView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, send_id):
        target_url = unquote(request.query_params.get("url", ""))

        send = CampaignSend.objects.filter(id=send_id).first()
        if send:
            CampaignLinkClick.objects.create(campaign_send=send, link_url=target_url[:1000])
            update_fields = {}
            was_first_click = not send.clicked_at
            if was_first_click:
                update_fields["clicked_at"] = timezone.now()
            if send.status not in (CampaignSend.Status.CLICKED, CampaignSend.Status.UNSUBSCRIBED):
                update_fields["status"] = CampaignSend.Status.CLICKED
            if update_fields:
                CampaignSend.objects.filter(id=send_id).update(**update_fields)
            if was_first_click:
                CampaignEmail.objects.filter(id=send.campaign_email_id).update(
                    total_clicked=models.F("total_clicked") + 1
                )

        if not target_url:
            return HttpResponseRedirect("https://www.tiaago.com/")
        return HttpResponseRedirect(target_url)


class UnsubscribeView(APIView):
    """Powers the public /unsubscribe page. GET resolves the token to an
    email address for the confirmation copy; POST actually records the
    unsubscribe -- no login required for either, per the spec."""

    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        send = CampaignSend.objects.filter(unsubscribe_token=token).select_related("campaign").first()
        if not send:
            return Response({"error": "Invalid or expired unsubscribe link."}, status=404)
        return Response({"email": send.recipient_email, "campaign_name": send.campaign.name})

    def post(self, request):
        token = request.data.get("token")
        send = CampaignSend.objects.filter(unsubscribe_token=token).select_related("campaign").first()
        if not send:
            return Response({"error": "Invalid or expired unsubscribe link."}, status=404)

        if send.campaign.audience_pool == EmailCampaign.AudiencePool.TALENT_NETWORK:
            # talent_network's own send path (notify_member_of_job) only
            # checks TalentNetworkMember.status, not EmailUnsubscribe -- so
            # for this pool, flipping status here (rather than relying on
            # EmailUnsubscribe alone) is what actually stops future sends.
            from talent_network.choices import TalentNetworkMemberStatus
            from talent_network.models import TalentNetworkMember

            TalentNetworkMember.objects.filter(email=send.recipient_email).update(
                status=TalentNetworkMemberStatus.UNSUBSCRIBED
            )

        EmailUnsubscribe.objects.get_or_create(
            email=send.recipient_email,
            defaults={
                "organisation_id": send.organisation_id,
                "source_campaign": send.campaign,
                "reason": request.data.get("reason", ""),
            },
        )
        CampaignSend.objects.filter(id=send.id).update(status=CampaignSend.Status.UNSUBSCRIBED)
        return Response({"status": "unsubscribed", "email": send.recipient_email})
