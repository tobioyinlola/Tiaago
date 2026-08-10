"""Reports endpoints: list/create/detail/delete (session-authenticated
recruiter) and the PDF-upload callback used by the Next.js export route.
Follows ai_interviews/views.py's conventions -- plain ModelSerializer,
APIView, an ownership-check helper."""

import logging

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_204_NO_CONTENT,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
)

from base.mixins.pagination import PaginationHandlerMixin
from create_user.permissions import get_user_company
from jobs.models import Job

from .models import Report
from .serializers import ReportCreateSerializer, ReportDetailSerializer, ReportListSerializer
from .tasks import generate_report_task

logger = logging.getLogger(__name__)


def _get_owned_report(request, pk):
    report = Report.objects.filter(pk=pk).first()
    if not report:
        return None, Response({"error": "Report not found."}, status=HTTP_404_NOT_FOUND)
    company = get_user_company(request.user)
    if not company or report.organisation_id != company.id:
        return None, Response({"error": "You do not have permission to access this report."}, status=HTTP_403_FORBIDDEN)
    return report, None


class ReportListCreateView(APIView, PaginationHandlerMixin):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response({"error": "No organisation found for this user."}, status=HTTP_403_FORBIDDEN)
        reports = Report.objects.filter(organisation=company)
        page = self.paginate_queryset(reports)
        data = ReportListSerializer(page, many=True).data
        return Response(data=self.get_paginated_response(data))

    def post(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response({"error": "No organisation found for this user."}, status=HTTP_403_FORBIDDEN)

        serializer = ReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        job_ids = validated["job_ids"]
        if validated["report_type"] == Report.ReportType.FULL_ACCOUNT:
            job_ids = list(
                Job.objects.filter(
                    company=company, date_created__date__range=(validated["date_from"], validated["date_to"])
                ).values_list("id", flat=True)
            )
        else:
            owned_count = Job.objects.filter(company=company, id__in=job_ids).count()
            if owned_count != len(set(job_ids)):
                return Response({"error": "One or more selected roles are invalid."}, status=HTTP_400_BAD_REQUEST)

        report = Report.objects.create(
            organisation=company,
            created_by=request.user,
            name=validated["name"],
            report_type=validated["report_type"],
            job_ids=job_ids,
            date_from=validated["date_from"],
            date_to=validated["date_to"],
        )
        generate_report_task.delay(report.id)
        return Response({"reportId": report.id}, status=HTTP_201_CREATED)


class ReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        report, error = _get_owned_report(request, pk)
        if error:
            return error
        return Response(ReportDetailSerializer(report, context={"request": request}).data, status=HTTP_200_OK)

    def delete(self, request, pk):
        report, error = _get_owned_report(request, pk)
        if error:
            return error
        report.delete()
        return Response(status=HTTP_204_NO_CONTENT)


class ReportRegenerateView(APIView):
    """POST /api/reports/<id>/regenerate/ -- retry after a FAILED report,
    same computation the original POST /api/reports/ dispatches."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        report, error = _get_owned_report(request, pk)
        if error:
            return error
        report.status = Report.Status.GENERATING
        report.error_message = ""
        report.save(update_fields=["status", "error_message"])
        generate_report_task.delay(report.id)
        return Response(ReportDetailSerializer(report, context={"request": request}).data, status=HTTP_200_OK)


class ReportUploadPdfView(APIView):
    """POST /api/reports/<id>/upload-pdf/ -- called by the Next.js PDF
    export route handler once it has built the PDF (see
    frontend/app/api/reports/[id]/export-pdf/route.ts). Django stays the
    single place file storage happens, same as every other upload in this
    app (resume, profile pic, certificate) -- whichever STORAGES["default"]
    backend is configured (S3/Bunny/local) picks it up automatically."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.utils import timezone

        report, error = _get_owned_report(request, pk)
        if error:
            return error

        pdf_file = request.FILES.get("pdf_file")
        if not pdf_file:
            return Response({"error": "pdf_file is required."}, status=HTTP_400_BAD_REQUEST)

        report.pdf_file = pdf_file
        report.generated_at = timezone.now()
        report.save(update_fields=["pdf_file", "generated_at"])
        return Response(
            {"pdf_url": request.build_absolute_uri(report.pdf_file.url)}, status=HTTP_200_OK
        )
