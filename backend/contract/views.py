from rest_framework import generics
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST
)

from create_user.models import TalentProfile, CustomUser
from create_user.permissions import get_user_company
from subscriptions.permissions import IsCompanyRepUser
from .models import Contract
from .permissions import IsContractByCompanyOruserPermission
from base.mixins.pagination import TiaagoPagination
from .serializers import ContractSerializer

class ContractCreateView(generics.CreateAPIView):
    '''Endpoint for a company representative to create a contract'''
    serializer_class = ContractSerializer
    queryset = Contract.objects.all()
    permission_classes = [IsCompanyRepUser]
    
    def create(self, request, *args, **kwargs):
        talent_id = kwargs.get('talent_id')
        try:
            talent = TalentProfile.objects.get(id=talent_id)
        except TalentProfile.DoesNotExist:
            return Response({"detail": "Invalid talent"}, status=HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(talent=talent, company=request.user.company)
        return Response(serializer.data, status=HTTP_201_CREATED)

class ContractListView(generics.ListAPIView):
    '''Endpoint to list all contracts'''
    serializer_class = ContractSerializer
    queryset = Contract.objects.all()
    pagination_class = TiaagoPagination
    
    def get_queryset(self):
        user = self.request.user
        queryset = Contract.objects.select_related(
            "talent", "talent__user", "company", "company__company_rep", "role"
        )

        if user.is_staff:
            return queryset

        if user.user_type == CustomUser.USER_TYPE.TALENT:
            return queryset.filter(talent=user.profile)

        company = get_user_company(user)
        if company:
            return queryset.filter(company=company)

        return queryset.none()


class ContractDetailView(generics.RetrieveDestroyAPIView):
    '''Endpoint to view the details/ delete a contract'''
    serializer_class = ContractSerializer
    queryset = Contract.objects.all()
    permission_classes = [IsContractByCompanyOruserPermission]