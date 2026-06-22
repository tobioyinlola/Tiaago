import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from django.utils import timezone
from rest_framework import status
from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import GmailSmtpConfig, OutreachEmail, PipelineCandidate, PipelineCategory, PipelineInviteLink
from .serializers import (
    AddToPipelineSerializer,
    BulkAddToPipelineSerializer,
    GmailSmtpConfigSerializer,
    GmailSmtpSetupSerializer,
    InviteSubmissionSerializer,
    InviteTokenValidationSerializer,
    OutreachEmailSerializer,
    PipelineCandidateSerializer,
    PipelineCategorySerializer,
    PipelineInviteLinkSerializer,
    SendOutreachSerializer,
    UpdatePipelineEntrySerializer,
)

logger = logging.getLogger(__name__)


def _get_company(request):
    return getattr(request.user, "company", None)


class PipelineListView(APIView):
    def get(self, request):
        company = _get_company(request)
        if not company:
            return Response(
                {"total_in_pipeline": 0, "total_new": 0, "total_contacted": 0, "entries": []},
            )

        qs = PipelineCandidate.objects.filter(company=company)

        category_id = request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)

        entries = PipelineCandidateSerializer(qs, many=True).data

        total = len(entries)
        total_new = sum(1 for e in entries if e["status"] == "new")
        total_contacted = sum(1 for e in entries if e["status"] == "contacted")

        return Response({
            "total_in_pipeline": total,
            "total_new": total_new,
            "total_contacted": total_contacted,
            "entries": entries,
        })


class AddToPipelineView(APIView):
    def post(self, request):
        company = _get_company(request)
        if not company:
            return Response(
                {"error": "Company profile required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if "candidates" in request.data:
            serializer = BulkAddToPipelineSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            created = []
            for candidate_data in serializer.validated_data["candidates"]:
                candidate_data["company"] = company
                candidate_data["added_by"] = request.user
                entry = AddToPipelineSerializer().create(candidate_data)
                created.append(entry)
            return Response(
                {"success": True, "data": PipelineCandidateSerializer(created, many=True).data},
                status=status.HTTP_201_CREATED,
            )

        serializer = AddToPipelineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        validated["company"] = company
        validated["added_by"] = request.user
        entry = serializer.create(validated)
        return Response(
            {"success": True, "data": PipelineCandidateSerializer(entry).data},
            status=status.HTTP_201_CREATED,
        )


class RemoveFromPipelineView(APIView):
    def delete(self, request, pk):
        company = _get_company(request)
        entry = get_object_or_404(
            PipelineCandidate.objects.filter(company=company), pk=pk
        )
        entry.deleted_at = timezone.now()
        entry.save(update_fields=["deleted_at"])
        updated_count = PipelineCandidate.objects.filter(company=company).count()
        category_count = None
        if entry.category_id:
            category_count = PipelineCandidate.objects.filter(
                category_id=entry.category_id
            ).count()
        return Response({
            "message": "Removed from pipeline.",
            "total_in_pipeline": updated_count,
            "category_id": entry.category_id,
            "category_candidate_count": category_count,
        }, status=status.HTTP_200_OK)


class UpdatePipelineEntryView(APIView):
    def patch(self, request, pk):
        company = _get_company(request)
        entry = get_object_or_404(
            PipelineCandidate.objects.filter(company=company), pk=pk
        )
        serializer = UpdatePipelineEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if "status" in serializer.validated_data:
            entry.status = serializer.validated_data["status"]
        if "category" in serializer.validated_data:
            entry.category_id = serializer.validated_data["category"]
        entry.save()

        return Response(PipelineCandidateSerializer(entry).data)


class CategoryListCreateView(ListCreateAPIView):
    serializer_class = PipelineCategorySerializer

    def get_queryset(self):
        company = _get_company(self.request)
        if not company:
            return PipelineCategory.objects.none()
        return PipelineCategory.objects.filter(company=company)

    def perform_create(self, serializer):
        company = _get_company(self.request)
        serializer.save(company=company, created_by=self.request.user)


class CategoryDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = PipelineCategorySerializer
    lookup_field = "pk"

    def get_queryset(self):
        company = _get_company(self.request)
        if not company:
            return PipelineCategory.objects.none()
        return PipelineCategory.objects.filter(company=company)


class GenerateInviteLinkView(APIView):
    def post(self, request, pk):
        company = _get_company(request)
        if not company:
            return Response(
                {"error": "Company profile required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        category = get_object_or_404(PipelineCategory, pk=pk, company=company)

        invite_link, created = PipelineInviteLink.objects.get_or_create(
            category=category,
            company=company,
            is_active=True,
            defaults={"created_by": request.user},
        )

        serializer = PipelineInviteLinkSerializer(invite_link)
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ResolveShortCodeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        invite = get_object_or_404(
            PipelineInviteLink.objects.select_related("category", "company"),
            short_code=code,
        )
        return Response({
            "token": str(invite.token),
            "category_name": invite.category.name,
            "company_name": invite.company.company_name,
        })


class ValidateInviteTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        invite = get_object_or_404(PipelineInviteLink, token=token)

        data = {
            "category_name": invite.category.name,
            "company_name": invite.company.company_name,
            "is_active": invite.is_active and invite.category.is_active,
        }
        serializer = InviteTokenValidationSerializer(data)
        return Response(serializer.data)


class SubmitInviteApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invite = get_object_or_404(PipelineInviteLink, token=token)

        if not invite.is_active:
            return Response(
                {"error": "This invite link is no longer active."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not invite.category.is_active:
            return Response(
                {"error": "This pipeline category is no longer accepting applications."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = InviteSubmissionSerializer(
            data=request.data,
            context={"invite_link": invite, "user": request.user},
        )
        serializer.is_valid(raise_exception=True)
        candidate = serializer.save()

        return Response(
            {
                "success": True,
                "data": PipelineCandidateSerializer(candidate).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ── Gmail SMTP Config ──────────────────────────────────────────────

def _test_smtp_connection(gmail_address: str, app_password: str) -> tuple[bool, str]:
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(gmail_address, app_password)
        return True, ""
    except smtplib.SMTPAuthenticationError:
        return False, "Invalid email or App Password. Please double-check your credentials."
    except Exception as e:
        return False, f"Connection failed: {str(e)}"


class SmtpConfigView(APIView):
    def get(self, request):
        company = _get_company(request)
        if not company:
            return Response({"data": None})
        try:
            config = company.smtp_config
            return Response({"data": GmailSmtpConfigSerializer(config).data})
        except GmailSmtpConfig.DoesNotExist:
            return Response({"data": None})

    def post(self, request):
        company = _get_company(request)
        if not company:
            return Response(
                {"error": "Company profile required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = GmailSmtpSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        gmail_address = serializer.validated_data["gmail_address"] or request.user.email
        app_password = serializer.validated_data["app_password"]

        ok, error_msg = _test_smtp_connection(gmail_address, app_password)
        if not ok:
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        config, created = GmailSmtpConfig.objects.update_or_create(
            company=company,
            defaults={
                "gmail_address": gmail_address,
                "is_verified": True,
                "verified_at": timezone.now(),
                "created_by": request.user,
            },
        )
        config.app_password = app_password
        config.save(update_fields=["encrypted_app_password"])

        return Response(
            {"success": True, "data": GmailSmtpConfigSerializer(config).data},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        company = _get_company(request)
        if not company:
            return Response(
                {"error": "Company profile required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            company.smtp_config.delete()
        except GmailSmtpConfig.DoesNotExist:
            pass
        return Response({"success": True})


class SmtpVerifyView(APIView):
    def post(self, request):
        company = _get_company(request)
        if not company:
            return Response(
                {"error": "Company profile required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            config = company.smtp_config
        except GmailSmtpConfig.DoesNotExist:
            return Response(
                {"error": "No SMTP configuration found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ok, error_msg = _test_smtp_connection(config.gmail_address, config.app_password)
        if ok:
            config.is_verified = True
            config.verified_at = timezone.now()
            config.save(update_fields=["is_verified", "verified_at"])
            return Response({"success": True, "message": "SMTP connection verified."})
        else:
            config.is_verified = False
            config.save(update_fields=["is_verified"])
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)


# ── Outreach Sending ───────────────────────────────────────────────

class SendOutreachView(APIView):
    def post(self, request):
        company = _get_company(request)
        if not company:
            return Response(
                {"error": "Company profile required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            smtp_config = company.smtp_config
        except GmailSmtpConfig.DoesNotExist:
            return Response(
                {"error": "Gmail SMTP is not configured. Set it up in Settings first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not smtp_config.is_verified:
            return Response(
                {"error": "Gmail SMTP is not verified. Please re-verify in Settings."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SendOutreachSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        candidate_ids = serializer.validated_data["candidate_ids"]
        subject = serializer.validated_data["subject"]
        body = serializer.validated_data["body"]
        job_id = serializer.validated_data["job_id"]

        from jobs.models import Job
        try:
            job = Job.objects.get(id=job_id, company=company)
        except Job.DoesNotExist:
            return Response(
                {"error": "Job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        candidates = PipelineCandidate.objects.filter(
            id__in=candidate_ids, company=company,
        ).exclude(email="")

        if not candidates.exists():
            return Response(
                {"error": "No candidates with email addresses found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        outreach_records = []
        for candidate in candidates:
            outreach_records.append(OutreachEmail(
                candidate=candidate,
                company=company,
                job=job,
                subject=subject,
                body=body,
                recipient_email=candidate.email,
                sent_by=request.user,
            ))
        OutreachEmail.objects.bulk_create(outreach_records)

        from django.template.loader import render_to_string

        sent_count = 0
        failed_count = 0
        from_name = company.company_name or request.user.get_full_name()
        try:
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_config.gmail_address, smtp_config.app_password)

                for record in outreach_records:
                    try:
                        replacements = {
                            "{{candidateName}}": record.candidate.name,
                            "{{company}}": company.company_name or "",
                            "{{role}}": record.candidate.role or "",
                            "{{recruiterName}}": request.user.get_full_name(),
                            "{{jobTitle}}": job.title or "",
                            "{{jobLevel}}": job.get_job_level_display() if hasattr(job, 'get_job_level_display') else (job.job_level or ""),
                        }
                        personalized_body = body
                        personalized_subject = subject
                        for placeholder, value in replacements.items():
                            personalized_body = personalized_body.replace(placeholder, value)
                            personalized_subject = personalized_subject.replace(placeholder, value)

                        branded_html = render_to_string("emails/outreach.html", {
                            "subject": personalized_subject,
                            "body": personalized_body,
                            "company_name": company.company_name or "",
                        })

                        msg = MIMEMultipart("alternative")
                        msg["From"] = f"{from_name} <{smtp_config.gmail_address}>"
                        msg["To"] = record.recipient_email
                        msg["Subject"] = personalized_subject
                        msg.attach(MIMEText(branded_html, "html"))

                        server.sendmail(
                            smtp_config.gmail_address,
                            record.recipient_email,
                            msg.as_string(),
                        )
                        record.status = OutreachEmail.Status.SENT
                        record.sent_at = timezone.now()
                        sent_count += 1
                    except Exception as e:
                        record.status = OutreachEmail.Status.FAILED
                        record.error_reason = str(e)[:500]
                        failed_count += 1
                        logger.warning("Outreach send failed to %s: %s", record.recipient_email, e)

            smtp_config.last_used_at = timezone.now()
            smtp_config.save(update_fields=["last_used_at"])

        except smtplib.SMTPAuthenticationError:
            OutreachEmail.objects.filter(
                id__in=[r.id for r in outreach_records], status=OutreachEmail.Status.QUEUED,
            ).update(status=OutreachEmail.Status.FAILED, error_reason="SMTP authentication failed")
            smtp_config.is_verified = False
            smtp_config.save(update_fields=["is_verified"])
            return Response(
                {"error": "Gmail authentication failed. Please update your App Password in Settings."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as e:
            logger.error("SMTP connection error: %s", e)
            return Response(
                {"error": f"Failed to connect to Gmail: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        OutreachEmail.objects.bulk_update(outreach_records, ["status", "sent_at", "error_reason"])

        PipelineCandidate.objects.filter(
            id__in=[r.candidate_id for r in outreach_records if r.status == OutreachEmail.Status.SENT],
        ).update(status=PipelineCandidate.Status.CONTACTED)

        return Response({
            "success": True,
            "sent": sent_count,
            "failed": failed_count,
            "total": len(outreach_records),
        })
