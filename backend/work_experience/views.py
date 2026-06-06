from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from subscriptions.permissions import IsTalentUser
from .models import WorkExperience
from .permissions import IsTalentExperience
from .serializers import WorkExperienceSerializer

class WorkExperienceListCreateView(ListCreateAPIView):
    serializer_class = WorkExperienceSerializer
    permission_classes = [IsTalentUser]
    queryset = WorkExperience.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        q = queryset.filter(talent=self.request.user.profile)
        return q

    def perform_create(self, serializer):
        serializer.save(talent=self.request.user.profile)


class WorkExperienceDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = WorkExperienceSerializer
    permission_classes = [IsTalentExperience]
    queryset = WorkExperience.objects.all()


class UserWorkExperienceDetailView(ListAPIView):
    serializer_class = WorkExperienceSerializer
    queryset = WorkExperience.objects.all()

    def list(self, request, *args, **kwargs):
        user_id = kwargs.pop('talent_id')
        queryset = self.get_queryset()
        q = queryset.filter(talent__id=user_id)
        serializer = super().get_serializer(q, many=True)
        return Response(serializer.data)