from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK
from .utils import get_user_and_registration_metrics, get_startup_metrics, get_contract_metrics, get_talent_metrics

class AdminMetricsAPIView(APIView):
    '''
    API Endpoint to fetch statistics.

    Returns user metrics, talent metrics, startup metrics and contract metrics
    '''
    permission_classes = [IsAdminUser]

    def get(self, request):
        talent_metrics = get_talent_metrics()
        user_metrics, registration_metrics = get_user_and_registration_metrics()
        startup_metrics = get_startup_metrics()
        contract_metrics = get_contract_metrics()
        data = {
            "talent_metrics":talent_metrics,
            "user_metrics":user_metrics,
            "startup_metrics":startup_metrics,
            "contract_metrics":contract_metrics,
            "registration_metrics":registration_metrics
        }
        return Response(data=data, status=HTTP_200_OK)

        
