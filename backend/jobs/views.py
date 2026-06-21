from warnings import filters
from django.db.models import Prefetch
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models.query import Q
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
    UpdateAPIView,
    RetrieveAPIView,
    DestroyAPIView,
    GenericAPIView
)
from rest_framework.views import APIView
from rest_framework import permissions
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.status import (
    HTTP_201_CREATED,
    HTTP_200_OK,
    HTTP_204_NO_CONTENT,
    HTTP_404_NOT_FOUND,
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_402_PAYMENT_REQUIRED,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from django.db.models import Count, Q
from rest_framework.pagination import PageNumberPagination
from base.utils import extract_query_from_request
from create_user.models import CustomUser, OneTimePassword, Company, CompanyTeamMember
from create_user.permissions import user_is_company_role, get_company_membership
from create_user.utils import send_otp_to_user
from subscriptions.models import SubPlan
from base.permissions import IsTalentUser

from .models import (
    Job,
    JobApplication,
    Portfolio,
    Tool,
    Project,
    Experience,
    Education
)
from .permissions import (
    IsJobApplicationCompany,
    IsJobCreatorOrReadOnly,
    IsJobApplicationCompanyOrTalentApplicant,
)
from .serializers import (
    GenericJobSerializer,
    JobSerializer,
    JobUpdateSerializer,
    JobApplicationSerializer,
    PortfolioSerializer,
    ProjectSerializer,
    JobApplicationUpdateStatusSerializer,
    ExternalJobApplicationSerializer,
    JobApplicationVerificationSerializer,
    JobTokenValidationSerializer,
    PortfolioSerializer,
    ToolSerializer,
    ExperienceSerializer,
    EducationSerializer,
    CompanySerializer,
)
from .tasks import carry_out_resume_analysis
from rest_framework.permissions import AllowAny
from payments.models import PaymentMethod
from payments.utils import usage_unbilled_for_company, UNIT_PRICE_NGN
from django.utils.timezone import now
from django.utils import timezone
from django.db.models.fields.files import FieldFile
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters import rest_framework as filters
from rest_framework.exceptions import ValidationError
from subscriptions.models import UserUsage, WalletUserUsage
from subscriptions.helper import get_payg_price, check_subscription_wallet_fallback

User = get_user_model()


class JobPagination(PageNumberPagination):
    """Custom pagination for jobs - show 15 jobs per page by default"""
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


@method_decorator(cache_page(60), name="dispatch")
class JobDetailView(RetrieveAPIView):

    permission_classes = [AllowAny]
    serializer_class = GenericJobSerializer

    def get_queryset(self):
        return Job.approved.select_related("company", "role").all()


class JobFilter(filters.FilterSet):
    role = filters.CharFilter(field_name='role__title', lookup_expr='icontains')
    role__in = filters.BaseInFilter(field_name='role__title')
    location = filters.CharFilter(field_name='location', lookup_expr='icontains')

    class Meta:
        model = Job
        fields = ['role', 'location']


class JobApplicationFilter(filters.FilterSet):
    applicant = filters.NumberFilter(field_name="applicant__id", lookup_expr="exact")

    class Meta:
        model = JobApplication
        fields = ["applicant"]



class JobListCreateView(ListCreateAPIView):
    """Endpoint to create/list jobs"""
    queryset = Job.objects.all()
    serializer_class = JobSerializer
    filter_backends = (filters.DjangoFilterBackend, OrderingFilter, SearchFilter)
    filterset_class = JobFilter
    ordering_fields = ["date_created", "role", "location", "no_of_applications"] 
    search_fields = ["^role", "^location"]
    ordering = ["-date_created"]
    
    # Custom pagination for jobs - show 15 jobs per page by default
    pagination_class = JobPagination

    def get_queryset(self):
        """
        Filter jobs based on user type:
        - Company reps: see only their company's jobs.
        - Unsubscribed talent: see active entry-level internships.
        - Subscribed talent: see all active jobs.
        - Staff: see all jobs (approved or not).
        """
        user = self.request.user
        queryset = Job.objects.select_related('company', 'role').all()  
        queryset = queryset.annotate(
            completed_assessments_count=Count(
                "job_applications__job_applications__candidateassessmentsubmission",
                filter=Q(
                    job_applications__job_applications__candidateassessmentsubmission__is_completed=True
                ),
                distinct=True,
            )
        )
        # For unauthenticated users, show only active jobs
        if not user.is_authenticated:
            return queryset.filter(job_status="ACTIVE")
            
        if user.is_company():
            return queryset.filter(company=user.company)
       # elif user.is_talent() and not user.is_subscribed():
       #     return queryset.filter(
       #             job_status="ACTIVE",
       #             job_type=Job.JobType.INTERNSHIP,
       #             job_level=Job.JobLevel.ENTRY,
       #         )
       # elif user.is_talent() and user.is_subscribed():
       #     return queryset.filter(job_status="ACTIVE")
        elif user.is_talent():
           return queryset.filter(job_status="ACTIVE")

        return queryset  # Staff see all jobs



    def create(self, request, *args, **kwargs):
        user = request.user
        if user.user_type in [User.USER_TYPE.TALENT, User.USER_TYPE.STAFF]:
            return Response(
                {"detail": "Cannot post a job"}, status=HTTP_401_UNAUTHORIZED
            )
        # Ensure only company admins or recruiters can post jobs for the company
        # Determine target company: prefer user's associated company
        company = getattr(user, 'company', None)
        if not company:
            company_id = request.data.get('company_id')
            if company_id:
                company = Company.objects.filter(id=company_id).first()

        if company and not user_is_company_role(user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
            return Response({"detail": "You do not have permission to post jobs for this company."}, status=HTTP_403_FORBIDDEN)
        serializer = JobSerializer(data=request.data)
        if not serializer.is_valid():
            print(serializer.errors)
            return Response({"errors": serializer.errors}, status=HTTP_400_BAD_REQUEST)
        
        # Check if there is active subscription
        # active_sub = user.subscription.status
        # if user.billing_type == "subscription" and active_sub != "active":
        #     return Response(
        #         {
        #             "detail": "Your subscription is not active. Please renew your subscription to post a job."
        #         },
        #         status=HTTP_403_FORBIDDEN,
        #     )
        
        # # Check if there is free_tier is still active
        # if user.billing_type == "free_tier" and active_sub != "active":
        #     return Response (
        #         {
        #             "detail": "Your free plan has expired. Please upgrade your plan to post a job."
        #         },
        #         status=HTTP_403_FORBIDDEN,
        #     )
         
        # # Check if there is money in wallet
        # if user.billing_type == "wallet" and user.wallet_balance == 0:
        #     return Response (
        #         {
        #             "detail": "Your wallet balance is zero. Please fund your wallet to post a job."
        #         },
        #         status=HTTP_403_FORBIDDEN,
        #     )
        
        # if (user.billing_type == "subscription" and
        #     active_sub != "active" and user.wallet_balance == 0):
        #     return Response (
        #         {
        #             "detail": "You do not have an active subscription or sufficient wallet balance. Please subscribe or fund your wallet to post a job."
        #         },
        #         status=HTTP_403_FORBIDDEN,
        #     )
        
        # has_card = PaymentMethod.objects.filter(user=user).exists()
        # if not has_card:
        #     is_nigerian = user.country.lower() in ["nigeria", "ng"]
        #     redirect_url = (
        #         "/api/payments/paystack-payment-method/"
        #         if is_nigerian
        #         else "/api/payments/payment-methods/"
        #         )
        #     return Response(
        #     {
        #         "detail": "Please add a billing card before posting a job.",
        #             "redirect_to": redirect_url,
        #             "is_nigerian": is_nigerian
        #     },
        #     status=HTTP_403_FORBIDDEN,
        #     )
        qty, cycle_start, due_date = usage_unbilled_for_company(user.company)
        amount_due = qty * UNIT_PRICE_NGN
        if amount_due and now().date() > due_date:  
            return Response(
                {
                    "detail": "You have an outstanding PAY-as-you-go balance.",
                    "amount_due": amount_due,
                    "redirect_to": "/billing/usage/" 
                },
                status=HTTP_402_PAYMENT_REQUIRED
            )
#        subscribed_plan = user.get_subscribed_plan()
#        is_subscribed_to_basic_plan = (
#            subscribed_plan and subscribed_plan.sub_type == SubPlan.SUB_TYPE.BASIC
#        )
#        if subscribed_plan is None or is_subscribed_to_basic_plan:
#            no_of_jobs_posted = Job.objects.filter(
#                company=user.company,
#                date_created__year=timezone.now().year,
#                date_created__month=timezone.now().month,
#            ).count()
#            cannot_post_more_jobs = (
#                no_of_jobs_posted >= 3 and not subscribed_plan
#            ) or (no_of_jobs_posted >= 10 and is_subscribed_to_basic_plan)
#            if cannot_post_more_jobs:
#                return Response(
#                    {"detail": "Maximum number of jobs posted for the month"},
#                    status=HTTP_400_BAD_REQUEST,
#                )
        try:
            serializer.save(company=request.user.company)
        except User.company.RelatedObjectDoesNotExist:
            return Response(
                {"detail": "The user does not have an associated company"},
                status=HTTP_400_BAD_REQUEST,
            )
        return Response(serializer.data, status=HTTP_201_CREATED)



class JobRetrieveUpdateView(RetrieveUpdateAPIView):
    queryset = Job.objects.select_related("company", "role").all()
    permission_classes = [IsJobCreatorOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return JobUpdateSerializer
        return JobSerializer
    
    def update(self, request, *args, **kwargs):
        # Handle both PATCH and PUT methods
        partial = request.method == 'PATCH'
        instance = self.get_object()
        # Only company admin or recruiter (for the job's company) may update
        company = getattr(instance, 'company', None)
        if company and not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
            return Response({"detail": "Permission denied."}, status=HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)


class JobDeleteView(DestroyAPIView):
    queryset = Job.objects.select_related('company', 'role').all()
    serializer_class = JobSerializer
    permission_classes = [IsJobCreatorOrReadOnly, permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        job = self.get_object()
        job.delete()
        return Response({"detail": "Job deleted successfully. "}, status=HTTP_204_NO_CONTENT)



class JobApplicationListView(ListAPIView):
    queryset = JobApplication.objects.all()
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = (filters.DjangoFilterBackend, OrderingFilter, SearchFilter)
    filterset_class = JobApplicationFilter
    ordering_fields = ["applied_date", "status"]
    search_fields = ["^applicant"]
    
    # Use the same pagination as jobs
    pagination_class = JobPagination

    def get_queryset(self):
        user = self.request.user
        qs = JobApplication.objects.select_related(
            "job", "job__company", "job__role",
            "applicant", "applicant__user",
        )

        if user.user_type == CustomUser.USER_TYPE.COMPANY_REP:
            return qs.filter(job__company__company_rep=user)
        elif user.user_type == CustomUser.USER_TYPE.TALENT:
            return qs.filter(applicant__user=user)
        else:
            return qs


class JobApplicationRetrieveUpdateView(RetrieveUpdateAPIView):
    queryset = JobApplication.objects.all()
    serializer_class = JobApplicationUpdateStatusSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsJobApplicationCompany,
        # IsJobApplicationCompanyOrTalentApplicant,
    ]


    def put(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()
        job_company = instance.job.company
        # If user is a company-type actor, ensure they are admin/recruiter for this company
        if user.user_type == User.USER_TYPE.COMPANY_REP or get_company_membership(user, job_company):
            if not user_is_company_role(user, job_company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
                return Response({"detail": "You are not authorized for this job"}, status=HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        status_value = serializer.validated_data.get("status")

        TALENT_ONLY_STATUS_UPDATE = [
            JobApplication.JobApplicationStatus.OFFER_ACCEPTED,
            JobApplication.JobApplicationStatus.OFFER_DECLINED,
            JobApplication.JobApplicationStatus.WITHDRAWN,
        ]

        # applied status update is not accepted during put request
        if status_value == JobApplication.JobApplicationStatus.APPLIED:
            return Response(
                {"detail": "Invalid status update"}, status=HTTP_400_BAD_REQUEST
            )

        # a talent can only update the status based on this condition
        if (
            user.user_type == User.USER_TYPE.TALENT
            and not status_value in TALENT_ONLY_STATUS_UPDATE
        ):
            return Response(
                {"detail": "Invalid status update"}, status=HTTP_400_BAD_REQUEST
            )

        # Company-side actors must NOT set talent-only statuses
        if user_is_company_role(user, job_company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]) and status_value in TALENT_ONLY_STATUS_UPDATE:
            return Response({"detail": "Invalid status update"}, status=HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)


class JobApplyView(CreateAPIView):
    """Endpoint to apply for a job"""
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]


    def create(self, request, *args, **kwargs):
        user = request.user
        job_pk = kwargs.get("job_pk")
        
        # If job uses AI hiring and no resume is provided in request or profile
        if not (request.FILES.get('resume') or request.user.profile.resume):
            return Response(
                {"detail": "Please provide a resume or update your profile with your resume"},
                status=HTTP_400_BAD_REQUEST,
            )
        # see if job exists, return appropriate response
        try:
            job: Job = Job.approved.get(pk=job_pk)
        except Job.DoesNotExist:
            return Response({"detail": "job not found"}, status=HTTP_404_NOT_FOUND)
        # check if the job is still active
        if job.job_status != Job.JobStatus.ACTIVE:
            return Response({"detail": "Job not active"}, status=HTTP_400_BAD_REQUEST)

        if job.role != user.profile.role:
            return Response(
                {"detail": "You cannot apply to the job specified"},
                status=HTTP_400_BAD_REQUEST,
            )
        # check if the user has already applied
        exists = JobApplication.objects.filter(
            applicant=self.request.user.profile, job=job
        ).exists()
        if exists:
            return Response(
                {"detail": "User already applied for the job"},
                status=HTTP_400_BAD_REQUEST,
            )

        subscribed_plan = user.get_subscribed_plan()
        # if subscribed_plan is None:
        # Not subscribed to any plan
        # no_of_jobs_applied = JobApplication.objects.filter(
        #     applicant=user.profile, created__date__month=timezone.now().month
        # ).count()
        # if no_of_jobs_applied >= 3:
        #     return Response(
        #         {"detail": "Maximum number of application completed"},
        #         status=HTTP_400_BAD_REQUEST,
        #     )
        # if (
        #     job.job_type != Job.JobType.INTERNSHIP
        #     or job.job_level != Job.JobLevel.ENTRY
        # ):
        #     return Response(
        #         {
        #             "detail": "User only has access to entry level and internship roles"
        #         },
        #         status=HTTP_400_BAD_REQUEST,
        #     )
        # elif subscribed_plan and subscribed_plan.sub_type == SubPlan.SUB_TYPE.BASIC:
        #     # For a basic user
        #     if (
        #         job.job_type != Job.JobType.INTERNSHIP
        #         or job.job_level != Job.JobLevel.ENTRY
        #     ):
        #         return Response(
        #             {
        #                 "detail": "User only have access to entry level and internship roles"
        #             },
        #             status=HTTP_400_BAD_REQUEST,
        #         )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save(applicant=self.request.user.profile, job=job)
        
        # get the owner of the job
        # job_owner = job.company
        # usage = UserUsage.objects.filter(company=job_owner).first()
        
        # --- SUBSCRIPTION + WALLET CHECK HAPPENS FIRST ---
        # check_subscription_wallet_fallback(job_owner, usage, job, determiner="resume-analyzes")
        
        if job.hires_with_ai:
            carry_out_resume_analysis.delay(application.id)                
        return Response(serializer.data, status=HTTP_201_CREATED)


class ToolsListAPIView(ListAPIView):
    """
    Endpoint to search tools.\n
    If no query param is passed, it returns a random list of 5 tools
    """
    serializer_class = ToolSerializer
    permission_classes = [IsTalentUser]

    def list(self, request, *args, **kwargs):
        query = extract_query_from_request(request)
        queryset = Tool.objects.all()
        if not query:
            queryset = queryset.order_by("?")[:5]
        else:
            queryset = queryset.filter(
                Q(name__icontains=query) | Q(category__icontains=query)
            )
        data = ToolSerializer(queryset, many=True).data
        return Response(data)
    


class ValidateJobTokenView(GenericAPIView):
    serializer_class = JobTokenValidationSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"detail": "Token is valid."}, status=HTTP_200_OK)


class ExternalJobApplicationView(CreateAPIView):
    serializer_class = ExternalJobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        
        if not user.is_verified:
            return Response(
                {
                    "detail": "Please verify your email with OTP before applying for jobs",
                    "requires_otp_verification": True,
                    "email": user.email
                },
                status=HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)


        application = serializer.save(
            applicant=request.user.talentprofile,
            is_external_application=True,
            verification_prompted=True
        )
        
        # If job uses AI hiring, trigger resume analysis
        if application.job.hires_with_ai:
            carry_out_resume_analysis.delay(application.id)

        return Response(serializer.data, status=HTTP_201_CREATED)
    

class JobApplicationVerificationUpdateView(UpdateAPIView):
    queryset = JobApplication.objects.all()
    serializer_class = JobApplicationVerificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsJobApplicationCompanyOrTalentApplicant]

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()

        if not instance.is_external_application:
            return Response(
                {"detail": "Only external applications can update verification"},
                status=HTTP_400_BAD_REQUEST
            )
        
        if instance.applicant.user != request.user:
            return Response(
                {"detail": "You can only verify your own applications"},
                status=HTTP_403_FORBIDDEN
            )
        
        return self.partial_update(request, *args, **kwargs)
    


class PortfolioCreateView(CreateAPIView):
    """
    Create a new portfolio for a talent.
    """
    serializer_class = PortfolioSerializer
    permission_classes = [IsTalentUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        serializer.save(talent=self.request.user.profile)


class PortfolioRetrieveUpdateView(RetrieveUpdateAPIView):
    """
    Retrieve or update a talent's portfolio.
    """
    serializer_class = PortfolioSerializer
    permission_classes = [IsTalentUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        portfolio, _ = Portfolio.objects.get_or_create(
            talent=self.request.user.profile
        )
        return (
            Portfolio.objects.select_related("talent__user", "talent__role", "role")
            .prefetch_related("tools", "experience_set", "certification_set", "education_set", "projects")
            .get(pk=portfolio.pk)
        )


    def perform_update(self, serializer):
        serializer.save()



class PortfolioProjectCreateView(CreateAPIView):
    """
    Add a new project to a talent's portfolio.
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsTalentUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]
        serializer.save(portfolio=portfolio)


class PortfolioProjectListView(ListAPIView):
    """
    List all projects in a talent's portfolio.
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsTalentUser]

    def get_queryset(self):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]
        return Project.objects.filter(portfolio=portfolio)


class PortfolioProjectDetailView(RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a project in a talent's portfolio.
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsTalentUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]
        return Project.objects.filter(portfolio=portfolio)
        
    def perform_destroy(self, instance):
        image = instance.image

        # Delete associated image if it exists
        if isinstance(image, FieldFile) and image:
            if not image.url.startswith('http'):
                image.delete(save=False)
         
        instance.delete()

# Experience
class PortfolioExperienceCreateView(CreateAPIView):
    serializer_class = ExperienceSerializer
    permission_classes = [permissions.IsAuthenticated]

    
    def perform_create(self, serializer):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]    
        serializer.save(portfolio=portfolio)



class PortfolioExperienceListView(ListAPIView):
    serializer_class = ExperienceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]
        return Experience.objects.filter(portfolio=portfolio)


class PortfolioExperienceDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = ExperienceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]
        return Experience.objects.filter(portfolio=portfolio)


#Education
class PortfolioEducationCreateView(CreateAPIView):
    serializer_class = EducationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]
        serializer.save(portfolio=portfolio)


class PortfolioEducationListView(ListAPIView):
    serializer_class = EducationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]
        return Education.objects.filter(portfolio=portfolio)


class PortfolioEducationDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = EducationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        portfolio = Portfolio.objects.get_or_create(talent=self.request.user.profile)[0]
        return Education.objects.filter(portfolio=portfolio)



class PortfolioRetreiveAPIView(APIView):
    """
    Endpoint to fetch a user's portfolio by the portfolio slug.
    """

    permission_classes = [AllowAny]

    def get(self, request, slug):
        print("Fetching portfolio for slug:", slug)
        portfolio = (
            Portfolio.objects.filter(slug=slug)
            .select_related("talent__user", "talent__role", "role")
            .prefetch_related("tools", "experience_set", "certification_set", "education_set", "projects")
            .first()
        )
        print("Portfolio found:", portfolio)
        if not portfolio:
            return Response(data={"error": "Portfolio not found!"}, status=HTTP_404_NOT_FOUND)
        portfolio_user = portfolio.talent.user
        data = PortfolioSerializer(portfolio).data
        data.update(
            full_name=portfolio_user.get_full_name(), country=portfolio_user.country
        )
        return Response(data)



class JobByTokenAPIView(RetrieveAPIView):
    serializer_class = JobSerializer
    lookup_field = 'apply_token'
    queryset = Job.objects.all()
    permission_classes = []  # Public endpoint

    def get(self, request, apply_token):
        try:
            job = Job.objects.get(apply_token=apply_token)
            serializer = self.get_serializer(job)
            return Response(serializer.data)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=HTTP_404_NOT_FOUND)


class JobApplyByIdView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, job_id):
        user = request.user
        try:
            _ = user.profile
        except CustomUser.profile.RelatedObjectDoesNotExist:
            return Response({'error': 'User is not a talent'}, status=HTTP_400_BAD_REQUEST)
        
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=HTTP_404_NOT_FOUND)
        
        print("This Endpoint was hit")
        
        # Check if job is active and accepting applications
        if job.job_status != Job.JobStatus.ACTIVE:
            status_display = dict(Job.JobStatus.choices)[job.job_status]
            return Response(
                {'error': f'This job is currently {status_display.lower()} and not accepting applications'}, 
                status=HTTP_400_BAD_REQUEST
            )
        
        if JobApplication.objects.filter(applicant=user.profile, job=job).exists():
            return Response({'error': 'Already applied to this job'}, status=HTTP_400_BAD_REQUEST)
        
        # Get cover letter from request data
        cover_letter = request.data.get('cover_letter', '')
        
        application = JobApplication.objects.create(
            applicant=user.profile, 
            job=job, 
            cover_letter=cover_letter,
            is_external_application=False
        )
        
        # get the owner of the job
        job_owner = job.company
        usage = UserUsage.objects.filter(company=job_owner).first()
        
        # --- SUBSCRIPTION + WALLET CHECK HAPPENS FIRST ---
        check_subscription_wallet_fallback(job_owner, usage, determiner="resume-analyzes")
        print("It stuck, because of my logic")
        
        # If job uses AI hiring, trigger resume analysis
        if job.hires_with_ai:
            carry_out_resume_analysis.delay(application.id)
        
        serializer = JobApplicationSerializer(application)
        return Response(serializer.data, status=HTTP_201_CREATED)




class JobApplyByTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, apply_token):
        user = request.user
        try:
            _ = user.profile
        except CustomUser.profile.RelatedObjectDoesNotExist:
            return Response({'error': 'User is not a talent'}, status=HTTP_400_BAD_REQUEST)
        
        # To Check if user is verified (OTP verified)
        if not user.is_verified:
            return Response(
                {
                    'error': 'Please verify your email with OTP before applying for jobs',
                    'requires_otp_verification': True,
                    'email': user.email
                },
                status=HTTP_400_BAD_REQUEST
            )
        
        try:
            job = Job.objects.get(apply_token=apply_token)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=HTTP_404_NOT_FOUND)
        if JobApplication.objects.filter(applicant=user.profile, job=job).exists():
            return Response({'error': 'Already applied to this job'}, status=HTTP_400_BAD_REQUEST)
        
        # Check for resume if job uses AI hiring
        if job.hires_with_ai and not user.profile.resume:
            return Response(
                {'error': 'Resume is required for AI-powered job applications'},
                status=HTTP_400_BAD_REQUEST
            )
        
        # Get cover letter from request data
        cover_letter = request.data.get('cover_letter', '')
        
        application = JobApplication.objects.create(
            applicant=user.profile, 
            job=job, 
            cover_letter=cover_letter,
            is_external_application=True
        )
        
        # get the owner of the job
        job_owner = job.company
        usage = UserUsage.objects.filter(company=job_owner).first()
        wallet = WalletUserUsage
        
        # --- SUBSCRIPTION + WALLET CHECK HAPPENS FIRST ---
        check_subscription_wallet_fallback(job_owner, usage, determiner="resume-analyzes")
        
        # If job uses AI hiring, trigger resume analysis
        if job.hires_with_ai:
            carry_out_resume_analysis.delay(application.id)
        
        serializer = JobApplicationSerializer(application)
        return Response(serializer.data, status=HTTP_201_CREATED)


class JobApplicationOtpVerificationView(APIView):
    """Endpoint to verify OTP for job applications"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        otp_code = request.data.get('otp')
        email = request.data.get('email')
        
        if not otp_code or not email:
            return Response(
                {'error': 'OTP and email are required'},
                status=HTTP_400_BAD_REQUEST
            )
        
    
        if email != user.email:
            return Response(
                {'error': 'Email does not match authenticated user'},
                status=HTTP_400_BAD_REQUEST
            )
        
        try:
            otp_entry = OneTimePassword.objects.select_related("user").get(
                user__email=email, 
                code=otp_code, 
                otp_expires__gte=timezone.now()
            )
            
            otp_entry.user.is_verified = True
            otp_entry.user.save()
            
        
            otp_entry.delete()
            
            return Response(
                {
                    'message': 'Email successfully verified. You can now apply for jobs.',
                    'verified': True
                },
                status=HTTP_200_OK
            )
            
        except OneTimePassword.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired OTP'},
                status=HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Verification failed: {str(e)}'},
                status=HTTP_500_INTERNAL_SERVER_ERROR
            )


class JobApplicationResendOtpView(APIView):
    """Endpoint to resend OTP for job applications"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=HTTP_400_BAD_REQUEST
            )
        
        if email != user.email:
            return Response(
                {'error': 'Email does not match authenticated user'},
                status=HTTP_400_BAD_REQUEST
            )
        
      
        if user.is_verified:
            return Response(
                {'message': 'User is already verified'},
                status=HTTP_200_OK
            )
        
        try:
            send_otp_to_user(email)
            
            return Response(
                {'message': 'OTP has been sent to your email'},
                status=HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {'error': f'Failed to send OTP: {str(e)}'},
                status=HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExternalJobApplyRedirectView(APIView):
    """Endpoint for unauthenticated users to apply via external link - redirects to signup"""
    permission_classes = [AllowAny]
    
    def post(self, request, apply_token):
        try:
            job = Job.objects.get(apply_token=apply_token, job_status=Job.JobStatus.ACTIVE)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found or not active'}, status=HTTP_404_NOT_FOUND)
        
        
        request.session['pending_job_apply_token'] = apply_token
        
        return Response({
            'message': 'Please sign up and verify your email with OTP to apply for this job',
            'redirect_to_signup': True,
            'requires_otp_verification': True,
            'job_title': job.title,
            'company_name': job.company.company_name
        }, status=HTTP_200_OK)


class ApplyToPendingJobView(APIView):
    """Endpoint for newly signed up users to apply to pending job"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        job_token = request.data.get('job_token')
        
        try:
            _ = user.profile
        except CustomUser.profile.RelatedObjectDoesNotExist:
            return Response({'error': 'User is not a talent'}, status=HTTP_400_BAD_REQUEST)
        
        if not job_token:
            return Response({'error': 'Job token is required'}, status=HTTP_400_BAD_REQUEST)
        
        
        if not user.is_verified:
            return Response(
                {
                    'error': 'Please verify your email with OTP before applying for jobs',
                    'requires_otp_verification': True,
                    'email': user.email
                },
                status=HTTP_400_BAD_REQUEST
            )
        
        try:
            job = Job.objects.get(apply_token=job_token, job_status=Job.JobStatus.ACTIVE)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found or not active'}, status=HTTP_404_NOT_FOUND)
        
        # Check if already applied
        if JobApplication.objects.filter(applicant=user.profile, job=job).exists():
            return Response({'error': 'Already applied to this job'}, status=HTTP_400_BAD_REQUEST)
        
        # Check for resume if job uses AI hiring
        if job.hires_with_ai and not user.profile.resume:
            return Response(
                {'error': 'Resume is required for AI-powered job applications'},
                status=HTTP_400_BAD_REQUEST
            )
        
        # Create application
        application = JobApplication.objects.create(
            applicant=user.profile,
            job=job,
            is_external_application=True,
            verification_prompted=True,
            was_verified_at_application=user.is_verified
        )
        
        # get the owner of the job
        job_owner = job.company
        usage = UserUsage.objects.filter(company=job_owner).first()
        
        # --- SUBSCRIPTION + WALLET CHECK HAPPENS FIRST ---
        check_subscription_wallet_fallback(job_owner, usage, determiner="resume-analyzes")
        
        # If job uses AI hiring, trigger resume analysis
        if job.hires_with_ai:
            carry_out_resume_analysis.delay(application.id)
        
        serializer = JobApplicationSerializer(application)
        
        return Response({
            'message': 'Successfully applied to job!',
            'application': serializer.data
        }, status=HTTP_201_CREATED)


@method_decorator(cache_page(60), name="dispatch")
class CompanyProfileView(RetrieveAPIView):
    """
    Public endpoint to display a company's profile and their active jobs.
    This view shows company details along with all their active job listings.
    """
    permission_classes = [AllowAny]
    serializer_class = CompanySerializer
    queryset = Company.objects.all()
    pagination_class = JobPagination

    def get(self, request, *args, **kwargs):
        company_name = self.kwargs.get("company_name")
        company = get_object_or_404(
            Company.objects.select_related("company_rep").prefetch_related(
                Prefetch("jobs", queryset=Job.objects.filter(job_status="ACTIVE").select_related("role"))
            ),
            company_name__iexact=company_name,
        )
        serializer = self.get_serializer(company)
        return Response(serializer.data)
