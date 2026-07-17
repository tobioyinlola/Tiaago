from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAdminUser
from rest_framework.viewsets import ModelViewSet

from base.utils import extract_query_from_request

from .models import Role
from .serializers import RoleSerializer


class RoleViewSet(ModelViewSet):
    serializer_class = RoleSerializer
    queryset = Role.objects.filter(active=True)
    pagination_class = None


    def get_permissions(self):
        if self.action == "list":
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsAdminUser]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        recruiter = extract_query_from_request(self.request, "recruiter")
        if recruiter:
            return Role.objects.filter(active=True, is_recruiter_role=True).all()
        return Role.objects.filter(active=True, is_recruiter_role=False).all()

