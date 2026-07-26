from django.db import transaction
from django.utils import timezone
from loguru import logger
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from base.mixins.pagination import TiaagoPagination
from base.permissions import IsCompanyRepOrStaffUser
from create_user.permissions import get_user_company
from jobs.serializers import JobSerializer

from . import nango_client
from .models import AtsCandidate, AtsConnection, AtsJob
from .nango_client import NangoError
from .providers import PROVIDER_REGISTRY
from .serializers import (
    AtsConnectionSerializer,
    AtsConnectSessionInputSerializer,
    AtsJobConvertInputSerializer,
    AtsJobSerializer,
    AtsSyncTriggerInputSerializer,
)
from .services import convert_ats_candidate_to_application
from .tasks import attach_ats_candidate_resume, run_ats_sync


class AtsAvailableIntegrationsView(APIView):
    """GET /api/ats/available-integrations/ -- the ATS platforms recruiters
    can actually connect: the intersection of what's configured in this
    Nango account and what we have a provider module for (PROVIDER_REGISTRY).
    Matched on Nango's `unique_key`, which must exactly equal one of our
    provider slugs (greenhouse/lever/workable) -- see the setup notes for why."""

    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request):
        try:
            nango_integrations = nango_client.list_integrations()
        except NangoError as e:
            logger.error(f"Failed to list Nango integrations: {e}")
            return Response(status=502, data={"error": "Could not load available ATS integrations."})

        by_key = {i.get("unique_key"): i for i in nango_integrations}
        results = []
        for provider_key in PROVIDER_REGISTRY:
            integration = by_key.get(provider_key)
            if not integration:
                continue
            results.append(
                {
                    "provider": provider_key,
                    "display_name": integration.get("display_name") or provider_key.title(),
                    "logo": integration.get("logo"),
                }
            )
        return Response(status=200, data={"results": results})


class AtsConnectSessionView(APIView):
    """POST /api/ats/connect-session/ -- issues a short-lived Nango Connect
    session token for the chosen ATS provider. The frontend uses this token
    with @nangohq/frontend to open Nango's hosted auth UI; our secret key
    never leaves the backend."""

    permission_classes = [IsCompanyRepOrStaffUser]

    def post(self, request):
        serializer = AtsConnectSessionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data["provider"]

        company = get_user_company(request.user)
        if not company:
            return Response(status=400, data={"error": "No company found for this user."})

        connection = AtsConnection.objects.create(company=company, provider=provider)

        try:
            session = nango_client.create_connect_session(
                end_user_id=str(request.user.id),
                end_user_email=request.user.email or "",
                organization_id=str(company.id),
                allowed_integrations=[provider],
            )
        except NangoError as e:
            connection.status = AtsConnection.Status.FAILED
            connection.error_message = str(e)[:2000]
            connection.save(update_fields=["status", "error_message", "updated_at"])
            logger.error(f"Failed to create Nango connect session for company {company.id} ({provider}): {e}")
            return Response(status=502, data={"error": "Could not start the ATS connection. Please try again."})

        return Response(
            status=201,
            data={
                "connection_id": connection.id,
                "session_token": session["token"],
                "expires_at": session.get("expires_at"),
            },
        )


class AtsSyncTriggerView(APIView):
    """POST /api/ats/connections/<id>/sync/

    First call for a PENDING connection: body must include the
    nango_connection_id the frontend received from Nango's 'connect' event.
    That's stored, the connection is marked CONNECTED, and a sync is kicked
    off immediately.

    Later calls (retrying a FAILED sync) need no body -- the stored
    nango_connection_id is reused, since a failed sync never deletes it.
    """

    permission_classes = [IsCompanyRepOrStaffUser]

    def post(self, request, pk):
        company = get_user_company(request.user)
        connection = AtsConnection.objects.filter(id=pk, company=company).first()
        if not connection:
            return Response(status=404, data={"error": "Connection not found."})

        if connection.status in (AtsConnection.Status.SYNCING, AtsConnection.Status.SYNCED):
            return Response(status=200, data=AtsConnectionSerializer(connection).data)

        if connection.status == AtsConnection.Status.PENDING:
            serializer = AtsSyncTriggerInputSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            nango_connection_id = serializer.validated_data.get("nango_connection_id")
            provider_config_key = serializer.validated_data.get("provider_config_key")

            if not nango_connection_id:
                return Response(status=400, data={"error": "nango_connection_id is required to confirm this connection."})
            if provider_config_key and provider_config_key != connection.provider:
                return Response(status=400, data={"error": "provider_config_key does not match this connection's provider."})

            connection.nango_connection_id = nango_connection_id
            connection.status = AtsConnection.Status.CONNECTED
            connection.connected_at = timezone.now()
            connection.save(update_fields=["nango_connection_id", "status", "connected_at", "updated_at"])

        if not connection.nango_connection_id:
            return Response(status=400, data={"error": "This connection has no active Nango connection to sync -- reconnect first."})

        connection.status = AtsConnection.Status.SYNCING
        connection.save(update_fields=["status", "updated_at"])
        run_ats_sync.delay(connection.id)

        return Response(status=202, data=AtsConnectionSerializer(connection).data)


class AtsConnectionDetailView(RetrieveAPIView):
    """GET /api/ats/connections/<id>/ -- for the frontend to poll while a
    sync is running."""

    permission_classes = [IsCompanyRepOrStaffUser]
    serializer_class = AtsConnectionSerializer

    def get_queryset(self):
        return AtsConnection.objects.filter(company=get_user_company(self.request.user))


class AtsConnectionListView(ListAPIView):
    """GET /api/ats/connections/ -- sync history for the recruiter's
    company, newest first."""

    permission_classes = [IsCompanyRepOrStaffUser]
    serializer_class = AtsConnectionSerializer
    pagination_class = TiaagoPagination

    def get_queryset(self):
        return AtsConnection.objects.filter(company=get_user_company(self.request.user))


class AtsJobListView(ListAPIView):
    """GET /api/ats/jobs/ -- unconverted synced jobs for the recruiter's
    company, across all ATS connections. Deliberately unpaginated: sync
    volumes are small relative to the native job list, and this is meant to
    render as a small standalone section on the Jobs Posted page, not a
    second paginated table."""

    permission_classes = [IsCompanyRepOrStaffUser]
    serializer_class = AtsJobSerializer
    pagination_class = None

    def get_queryset(self):
        return AtsJob.objects.filter(
            company=get_user_company(self.request.user), converted_job__isnull=True,
        ).order_by("-ats_created_at")


class AtsJobConvertView(APIView):
    """POST /api/ats/jobs/<id>/convert/ -- turns a synced AtsJob into a real,
    immediately-ACTIVE Job (reusing JobSerializer.create(), so assessment
    template/interview slots are built exactly like the normal job wizard),
    then converts every matching AtsCandidate into an ordinary JobApplication
    (see services.convert_ats_candidate_to_application). Resume files are
    fetched from each candidate's resume_url asynchronously afterward -- the
    Job/JobApplications are created and returned immediately, never blocked
    on that network fetch."""

    permission_classes = [IsCompanyRepOrStaffUser]

    def post(self, request, pk):
        company = get_user_company(request.user)
        ats_job = AtsJob.objects.filter(id=pk, company=company, converted_job__isnull=True).first()
        if not ats_job:
            return Response(status=404, data={"error": "Synced job not found or already converted."})

        input_serializer = AtsJobConvertInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        v = input_serializer.validated_data

        job_payload = {
            "role": ats_job.title or "Untitled role",
            "description": ats_job.description,
            "location": ats_job.location or "Remote",
            **v,
        }

        with transaction.atomic():
            job_serializer = JobSerializer(data=job_payload)
            job_serializer.is_valid(raise_exception=True)
            job = job_serializer.save(company=company)

            ats_job.converted_job = job
            ats_job.converted_at = timezone.now()
            ats_job.save(update_fields=["converted_job", "converted_at", "updated_at"])

            candidates = list(AtsCandidate.objects.filter(
                company=company, provider=ats_job.provider, ats_job_external_ids__contains=[ats_job.external_id],
            ))
            resume_fetch_application_ids = []
            applications_created = 0
            for candidate in candidates:
                application = convert_ats_candidate_to_application(candidate, job)
                if not application:
                    continue
                applications_created += 1
                if candidate.resume_url:
                    resume_fetch_application_ids.append(application.id)

        for application_id in resume_fetch_application_ids:
            try:
                attach_ats_candidate_resume.delay(application_id)
            except Exception:
                logger.exception(f"Failed to dispatch attach_ats_candidate_resume for application {application_id}")

        return Response(
            status=201,
            data={
                "job": JobSerializer(job).data,
                "applications_created": applications_created,
            },
        )
