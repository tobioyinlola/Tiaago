from rest_framework import generics
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST
)

from create_user.models import TalentProfile
from subscriptions.permissions import IsCompanyRepUser
from create_user.models import CustomUser
from .models import Contract
from .permissions import IsContractByCompanyOruserPermission
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
    
    def get_queryset(self):
        user = self.request.user
        queryset = Contract.objects.all()
        
        if user.user_type == CustomUser.USER_TYPE.TALENT:
            queryset = queryset.filter(talent=user.profile)
        elif user.user_type == CustomUser.USER_TYPE.COMPANY_REP:
            queryset = queryset.filter(company=user.company)

        return queryset


class ContractDetailView(generics.RetrieveDestroyAPIView):
    '''Endpoint to view the details/ delete a contract'''
    serializer_class = ContractSerializer
    queryset = Contract.objects.all()
    permission_classes = [IsContractByCompanyOruserPermission]