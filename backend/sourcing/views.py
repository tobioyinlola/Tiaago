from rest_framework import status
from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import PipelineCandidate, PipelineCategory, PipelineInviteLink
from .serializers import (
    AddToPipelineSerializer,
    BulkAddToPipelineSerializer,
    InviteSubmissionSerializer,
    InviteTokenValidationSerializer,
    PipelineCandidateSerializer,
    PipelineCategorySerializer,
    PipelineInviteLinkSerializer,
    UpdatePipelineEntrySerializer,
)


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
        entry = get_object_or_404(PipelineCandidate, pk=pk, company=company)
        entry.delete()
        return Response({"message": "Removed from pipeline."}, status=status.HTTP_200_OK)


class UpdatePipelineEntryView(APIView):
    def patch(self, request, pk):
        company = _get_company(request)
        entry = get_object_or_404(PipelineCandidate, pk=pk, company=company)
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
