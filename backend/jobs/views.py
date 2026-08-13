import logging
import secrets
from datetime import datetime, timedelta
from warnings import filters
from django.db import IntegrityError, transaction
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
    HTTP_202_ACCEPTED,
    HTTP_204_NO_CONTENT,
    HTTP_404_NOT_FOUND,
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_402_PAYMENT_REQUIRED,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from django.db.models import Count, Q, F
from rest_framework.pagination import PageNumberPagination
from base.utils import extract_query_from_request
from create_user.models import CustomUser, OneTimePassword, Company, CompanyTeamMember
from create_user.permissions import user_is_company_role, get_company_membership, get_user_company
from create_user.utils import send_otp_to_user
from base.permissions import IsTalentUser

from .models import (
    AssessmentQuestionGenerationRequest,
    Job,
    JobApplication,
    Portfolio,
    Tool,
    Project,
    Experience,
    Education,
    JobInterviewAvailabilitySlot,
    TalentScreening,
    InterviewScreening,
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
    GuestJobApplicationSerializer,
    GuestJobApplicationResponseSerializer,
    PortfolioSerializer,
    ToolSerializer,
    ExperienceSerializer,
    EducationSerializer,
    CompanySerializer,
    JobInterviewAvailabilitySlotSerializer,
    JobDraftSerializer,
)
from .tasks import (
    ACCEPTANCE_MAIL_DELAY_SECONDS,
    REJECTION_MAIL_DELAY_SECONDS,
    carry_out_resume_analysis,
    generate_job_assessment_questions_task,
    send_assessment_link,
    send_interview_scheduled_notice_mail,
    send_interview_slot_invite,
    send_manual_rejection_mail,
    send_offer_extended_notice_mail,
)
from emails import emails
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
from rest_framework.throttling import ScopedRateThrottle
from scheduler.models import Scheduler
from scheduler.services import provision_daily_room, DailyRoomProvisioningError
from scheduler.tasks import (
    candidate_interview_confirmation_mail,
    recruiter_interview_acceptance_mail,
    recruiter_interview_reminder_mail,
    retry_room_creation,
    send_meeting_reminder,
)
from notifications.models import Notification
from notifications.utils import notify_user
from skill_assessment.models import CandidateAssessmentSubmission

logger = logging.getLogger(__name__)

User = get_user_model()



class JobPagination(PageNumberPagination):
    """Custom pagination for jobs - show 15 jobs per page by default"""
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        response.data["current"] = self.page.number
        return response


@method_decorator(cache_page(60), name="dispatch")
class JobDetailView(RetrieveAPIView):

    permission_classes = [AllowAny]
    serializer_class = GenericJobSerializer

    def get_queryset(self):
        return Job.approved.select_related("company").all()


@method_decorator(cache_page(60), name="dispatch")
class JobDetailByPublicIdView(JobDetailView):
    """Same public/approved-only job data as JobDetailView, keyed on
    public_id -- for pages that already carry a job's public_id (e.g. a
    talent's own interview-slots page) rather than its int pk or apply_token,
    without requiring the JobRetrieveUpdateView owner-only auth."""

    lookup_field = "public_id"


class JobFilter(filters.FilterSet):
    role = filters.CharFilter(field_name='role', lookup_expr='icontains')
    role__in = filters.BaseInFilter(field_name='role')
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
        queryset = Job.objects.select_related('company').all()
        queryset = queryset.annotate(
            completed_assessments_count=Count(
                "job_applications__job_applications__candidateassessmentsubmission",
                filter=Q(
                    job_applications__job_applications__candidateassessmentsubmission__is_completed=True
                ),
                distinct=True,
            )
        )
        if not user.is_authenticated:
            return queryset.filter(job_status="ACTIVE")

        if user.is_staff:
            return queryset

        company = get_user_company(user)
        if company:
            return queryset.filter(company=company)

        if user.is_talent():
            return queryset.filter(job_status="ACTIVE")

        return queryset.none()



    def create(self, request, *args, **kwargs):
        user = request.user
        if user.user_type in [User.USER_TYPE.TALENT, User.USER_TYPE.STAFF]:
            return Response(
                {"detail": "Cannot post a job"}, status=HTTP_401_UNAUTHORIZED
            )
        company = get_user_company(user)
        if not company:
            company_id = request.data.get('company_id')
            if company_id:
                company = Company.objects.filter(id=company_id).first()

        if company and not user_is_company_role(user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
            return Response({"detail": "You do not have permission to post jobs for this company."}, status=HTTP_403_FORBIDDEN)

        # Publishing converts an existing draft in place instead of creating
        # a second row (see JobDraftSaveView) -- the draft-autosave endpoint
        # already holds the recruiter's in-progress job under job_status=DRAFT.
        existing_draft = (
            Job.objects.filter(company=company, job_status=Job.JobStatus.DRAFT).first() if company else None
        )
        serializer = JobSerializer(instance=existing_draft, data=request.data)
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
        if company:
            qty, cycle_start, due_date = usage_unbilled_for_company(company)
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
        if not company:
            return Response(
                {"detail": "The user does not have an associated company"},
                status=HTTP_400_BAD_REQUEST,
            )
        job = serializer.save(company=company, job_status=Job.JobStatus.ACTIVE)

        # Talent Network matching is a fully automatic background process --
        # no recruiter-facing control, it just runs on every publish. Role
        # category isn't collected in the wizard (recruiters only ever type
        # the plain job title, same as always), so it's inferred here from
        # that title -- see talent_network.role_classifier for why blank
        # would otherwise permanently disqualify every job from matching.
        from talent_network.models import JobMatchNotification
        from talent_network.role_classifier import classify_role_category
        from talent_network.tasks import run_talent_network_matching

        if not job.role_category:
            job.role_category = classify_role_category(job.role)
            job.save(update_fields=["role_category"])

        if not JobMatchNotification.objects.filter(job=job).exists():
            run_talent_network_matching.delay(job.id, notify=True)

        return Response(serializer.data, status=HTTP_201_CREATED)


class DashboardStatsView(APIView):
    """GET /jobs/dashboard-stats/ -- the recruiter dashboard's 4 headline
    numbers in one call: total active jobs (uncapped, unlike the "this
    month" figure the dashboard used to compute client-side from its
    5-job preview fetch), standalone assessments (company-owned, not tied
    to a job -- same filter GeneralSkillAssessmentAPIView.get uses),
    candidates currently in the pipeline, and outreach emails actually
    sent. All scoped to the caller's company."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = get_user_company(request.user)
        if not company:
            return Response({
                "active_jobs": 0,
                "standalone_assessments": 0,
                "pipeline_candidates": 0,
                "outreach_sent": 0,
            })

        from skill_assessment.models import GeneralSkillAssessment
        from sourcing.models import OutreachEmail, PipelineCandidate

        active_jobs = Job.objects.filter(company=company, job_status=Job.JobStatus.ACTIVE).count()
        standalone_assessments = GeneralSkillAssessment.objects.filter(
            company=company, job_application__isnull=True, source_template__isnull=True
        ).count()
        pipeline_candidates = PipelineCandidate.objects.filter(company=company).count()
        outreach_sent = OutreachEmail.objects.filter(company=company, status=OutreachEmail.Status.SENT).count()

        return Response({
            "active_jobs": active_jobs,
            "standalone_assessments": standalone_assessments,
            "pipeline_candidates": pipeline_candidates,
            "outreach_sent": outreach_sent,
        })


class JobDraftSaveView(GenericAPIView):
    """Auto-save endpoint for the job-creation wizard. Upserts a single
    job_status=DRAFT row per company -- never creates a second one (the
    recruiter has exactly one in-progress draft at a time). GET restores it,
    POST saves progress, DELETE discards it ("Start fresh")."""

    serializer_class = JobDraftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_company(self, request):
        return get_user_company(request.user)

    def get(self, request):
        company = self._get_company(request)
        if not company:
            return Response({"detail": "The user does not have an associated company"}, status=HTTP_400_BAD_REQUEST)
        draft = Job.objects.filter(company=company, job_status=Job.JobStatus.DRAFT).first()
        if not draft:
            return Response(status=HTTP_404_NOT_FOUND)
        return Response(JobDraftSerializer(draft).data)

    def post(self, request):
        company = self._get_company(request)
        if not company:
            return Response({"detail": "The user does not have an associated company"}, status=HTTP_400_BAD_REQUEST)
        draft = Job.objects.filter(company=company, job_status=Job.JobStatus.DRAFT).first()
        serializer = JobDraftSerializer(instance=draft, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(company=company, job_status=Job.JobStatus.DRAFT)
        return Response(JobDraftSerializer(serializer.instance).data, status=HTTP_200_OK if draft else HTTP_201_CREATED)

    def delete(self, request):
        company = self._get_company(request)
        if not company:
            return Response({"detail": "The user does not have an associated company"}, status=HTTP_400_BAD_REQUEST)
        deleted, _ = Job.objects.filter(company=company, job_status=Job.JobStatus.DRAFT).delete()
        return Response(status=HTTP_204_NO_CONTENT if deleted else HTTP_404_NOT_FOUND)


class GenerateAssessmentQuestionsView(APIView):
    """Async-dispatch endpoint used by the job-creation wizard's Step 3.

    No Job row needs to exist yet -- takes the Step 1 job details directly in
    the request body. The actual AI call (up to ~4min for technical roles,
    sequential across categories) now runs in generate_job_assessment_questions_task
    instead of blocking this request; the frontend polls
    JobAssessmentGenerationStatusView for the result, which it then feeds into
    final job submit via JobSerializer.create().
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "assessment_generation"

    def post(self, request, *args, **kwargs):
        description = (request.data.get("description") or "").strip()
        job_requirement = (request.data.get("job_requirement") or "").strip()
        role_id = request.data.get("role")
        logger.info(
            "Assessment generation requested: role=%r, description_len=%d, job_requirement_len=%d",
            role_id, len(description), len(job_requirement),
        )

        if not description and not job_requirement:
            return Response(
                {"detail": "A job description or job requirement is required to generate questions."},
                status=HTTP_400_BAD_REQUEST,
            )

        company = get_user_company(request.user)
        if not company:
            return Response({"detail": "The user does not have an associated company"}, status=HTTP_400_BAD_REQUEST)

        request_row = AssessmentQuestionGenerationRequest.objects.create(
            company=company, requested_by=request.user,
        )
        # .delay() can itself raise -- a broker hiccup, or (only under
        # CELERY_TASK_ALWAYS_EAGER, i.e. local dev) the task's own retry
        # propagating synchronously since there's no real worker to catch it.
        # Either way this must never 500 the request: the row already exists,
        # so mark it FAILED and let the frontend's first poll discover that
        # immediately instead of crashing the endpoint that's supposed to be
        # the reliable, non-blocking one.
        try:
            generate_job_assessment_questions_task.delay(
                str(request_row.id), description, job_requirement, role_id
            )
        except Exception:
            logger.exception("Failed to dispatch assessment generation task for request %s", request_row.id)
            request_row.status = AssessmentQuestionGenerationRequest.GenerationStatus.FAILED
            request_row.error = "Failed to start assessment generation. Please try again."
            request_row.save(update_fields=["status", "error"])

        return Response({"request_id": str(request_row.id)}, status=HTTP_202_ACCEPTED)


class JobAssessmentGenerationStatusView(APIView):
    """GET, polled every ~3s by AssessmentGenerationStep.tsx after it kicks off
    GenerateAssessmentQuestionsView -- mirrors InterviewProcessingStatusView's
    polling shape (scheduler/copilot_views.py)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, request_id, *args, **kwargs):
        company = get_user_company(request.user)
        if not company:
            return Response({"detail": "The user does not have an associated company"}, status=HTTP_400_BAD_REQUEST)

        request_row = AssessmentQuestionGenerationRequest.objects.filter(
            id=request_id, company=company,
        ).first()
        if not request_row:
            return Response({"detail": "Not found"}, status=HTTP_404_NOT_FOUND)

        return Response({
            "status": request_row.status,
            "sections": request_row.sections,
            "error": request_row.error,
        })


def _get_passing_job_application(user, job_id):
    """Resolve the talent's JobApplication for this job, only if they've passed
    the job's assessment stage. Returns None otherwise (no application, or applied
    but not yet passed)."""
    try:
        profile = user.profile
    except Exception:
        return None
    job_application = JobApplication.objects.filter(job_id=job_id, applicant=profile).first()
    if not job_application:
        return None
    has_passed = CandidateAssessmentSubmission.objects.filter(
        skill_assessment__job_application=job_application, is_passed=True
    ).exists()
    return job_application if has_passed else None


def _unclaimed_future_slots(job_id):
    """Unclaimed slots for a job that haven't started yet -- a slot can go
    stale between being generated (expandAvailabilityToSlots, which itself
    only skips slots already past *at generation time*) and a candidate
    actually opening the picker, so this re-checks against the current time
    on every read rather than trusting is_claimed alone. Naive local-time
    comparison, matching the recruiter-local dates/times slots are already
    stored in (see expandAvailabilityToSlots's own comment)."""
    now = timezone.localtime(timezone.now())
    return JobInterviewAvailabilitySlot.objects.filter(job_id=job_id, is_claimed=False).filter(
        Q(date__gt=now.date()) | Q(date=now.date(), start_time__gte=now.time())
    )


class JobInterviewSlotListView(ListAPIView):
    """Unclaimed interview slots for a job -- visible only to a talent who has
    passed that job's assessment stage."""

    serializer_class = JobInterviewAvailabilitySlotSerializer
    permission_classes = [IsTalentUser]

    def get_queryset(self):
        job = Job.objects.filter(public_id=self.kwargs["public_id"]).first()
        if not job:
            return JobInterviewAvailabilitySlot.objects.none()
        return _unclaimed_future_slots(job.id)

    def list(self, request, *args, **kwargs):
        job = Job.objects.filter(public_id=self.kwargs["public_id"]).first()
        job_application = _get_passing_job_application(request.user, job.id) if job else None
        if not job_application:
            return Response(
                {"detail": "You do not have a passing assessment for this job."},
                status=HTTP_403_FORBIDDEN,
            )
        return super().list(request, *args, **kwargs)


def _claim_interview_slot(job, job_application, slot_id):
    """Shared by JobInterviewSlotClaimView (authenticated talent) and
    GuestInterviewSlotClaimView (token-based, for a guest/account-less
    applicant). profile is read off job_application.applicant, which is
    already None for a guest -- Scheduler.talent/candidate_reminder emails
    are guest-safe for exactly that reason (see scheduler.models.Scheduler
    .candidate_full_name/candidate_email_recipient and
    scheduler.tasks.send_meeting_reminder/candidate_interview_confirmation_mail,
    both of which accept a None user_id and fall back to job_application's
    guest fields). Returns (response_data, http_status)."""
    profile = job_application.applicant

    with transaction.atomic():
        slot = (
            JobInterviewAvailabilitySlot.objects.select_for_update()
            .filter(id=slot_id, job_id=job.id, is_claimed=False)
            .first()
        )
        if not slot:
            return {"detail": "This slot is no longer available."}, HTTP_400_BAD_REQUEST

        job = slot.job
        duration_minutes = int(
            (datetime.combine(slot.date, slot.end_time) - datetime.combine(slot.date, slot.start_time))
            .total_seconds() // 60
        )
        meeting = Scheduler.objects.create(
            title=f"Interview for {job.title}",
            meeting_date=slot.date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            talent=profile,
            job_application=job_application,
            company=job.company,
            accepted=True,
            description=f"Interview for {job.title} at {job.company.company_name}",
            duration_minutes=duration_minutes or 45,
            round=Scheduler.objects.filter(job_application=job_application).count() + 1,
        )

        room_created = False
        try:
            room = provision_daily_room(slot.date, slot.start_time, slot.end_time)
            meeting.room_id = room["room_id"]
            meeting.room_name = room["room_name"]
            meeting.room_url = room["room_url"]
            meeting.token = room["token"]
            meeting.status = Scheduler.Status.ROOM_CREATED
            meeting.recruiter_join_token = secrets.token_urlsafe(32)
            meeting.candidate_join_token = secrets.token_urlsafe(32)
            meeting.save(update_fields=[
                "room_id", "room_name", "room_url", "token", "status",
                "recruiter_join_token", "candidate_join_token",
            ])
            room_created = True
        except DailyRoomProvisioningError as e:
            # The meeting is still confirmed even if video-room provisioning fails --
            # status stays SCHEDULED (its default) and a single retry is scheduled 5
            # minutes out. Never blocks the candidate's booking confirmation.
            logger.error(f"Daily.co provisioning failed for claimed slot {slot.id}: {e.detail}")
            retry_task = retry_room_creation.apply_async((str(meeting.id),), countdown=300)
            meeting.retry_room_creation_task_id = retry_task.id
            meeting.save(update_fields=["retry_room_creation_task_id"])

        slot.is_claimed = True
        slot.claimed_by_application = job_application
        slot.save(update_fields=["is_claimed", "claimed_by_application"])

        talent_screening = TalentScreening.objects.filter(job_application=job_application).first()
        if talent_screening:
            InterviewScreening.objects.update_or_create(
                talent_screening=talent_screening,
                defaults={"meeting": meeting, "fee_note": f"Interview for {job.title}"},
            )

        job_application.status = JobApplication.JobApplicationStatus.INTERVIEW_SCHEDULED
        job_application.save(update_fields=["status"])

    try:
        if job.company.company_rep_id:
            recruiter_interview_acceptance_mail.delay(
                job.company.company_rep_id, job.company.company_name, str(meeting.id)
            )
    except Exception as e:
        logger.error(f"Failed to send interview acceptance email: {e}")

    candidate_user_id = profile.user_id if profile else None
    try:
        candidate_interview_confirmation_mail.delay(
            candidate_user_id, job.company.company_name, str(meeting.id)
        )
    except Exception:
        logger.exception(f"Failed to send candidate interview confirmation email for meeting {meeting.id}")

    if room_created and job.company.company_rep_id:
        try:
            notify_user(
                job.company.company_rep,
                title="Interview room ready",
                message=(
                    f"Interview room ready for {meeting.candidate_full_name}. "
                    f"Interview scheduled for {slot.date} {slot.start_time.strftime('%H:%M')}."
                ),
                notification_type=Notification.Type.INTERVIEW,
                link_path="recruiter/dashboard/interviews",
                link_label="View interview",
            )
        except Exception:
            logger.exception(f"Failed to create room-ready notification for meeting {meeting.id}")

    # Two reminder tiers -- 1 hour and 15 minutes before -- to both
    # candidate (email) and recruiter (email + in-app). Both underlying
    # tasks already self-guard (send_meeting_reminder no-ops if the
    # meeting time has passed or it was never accepted;
    # recruiter_interview_reminder_mail no-ops if cancelled), so firing
    # each one twice at different etas is safe without any new
    # cancellation bookkeeping. Only the 15-minute tier's task ids are
    # persisted (matching the existing candidate_reminder_task_id/
    # recruiter_reminder_task_id fields, which are 1-per-meeting) --
    # the 1-hour tier is fire-and-forget, same as this feature's other
    # scheduled reminders.
    try:
        meeting_time = timezone.make_aware(datetime.combine(slot.date, slot.start_time))
        reminder_etas = {
            "1_hour": meeting_time - timedelta(hours=1),
            "15_min": meeting_time - timedelta(minutes=15),
        }

        update_fields = []
        for tier, reminder_eta in reminder_etas.items():
            candidate_reminder = send_meeting_reminder.apply_async(
                (candidate_user_id, job.company.company_name, str(meeting.id), tier), eta=reminder_eta
            )
            if tier == "15_min":
                meeting.candidate_reminder_task_id = candidate_reminder.id
                update_fields.append("candidate_reminder_task_id")

            if job.company.company_rep_id:
                recruiter_reminder = recruiter_interview_reminder_mail.apply_async(
                    (job.company.company_rep_id, meeting.candidate_full_name, job.company.company_name, str(meeting.id), tier),
                    eta=reminder_eta,
                )
                if tier == "15_min":
                    meeting.recruiter_reminder_task_id = recruiter_reminder.id
                    update_fields.append("recruiter_reminder_task_id")

        if update_fields:
            meeting.save(update_fields=update_fields)
    except Exception:
        logger.exception(f"Failed to schedule interview reminders for meeting {meeting.id}")

    return JobInterviewAvailabilitySlotSerializer(slot).data, HTTP_200_OK


def _get_passing_job_application_by_invite_token(token):
    """Guest-safe equivalent of _get_passing_job_application -- resolves the
    candidate via the GeneralSkillAssessment.invite_token already emailed to
    them (send_interview_slot_selection_invite) instead of a login session,
    so an account-less applicant can pick their interview slot too."""
    import uuid

    from skill_assessment.models import GeneralSkillAssessment

    try:
        # invite_token is a UUIDField -- an unparseable value would otherwise
        # raise ValidationError deep inside the ORM instead of a clean 403.
        uuid.UUID(str(token))
    except (ValueError, AttributeError, TypeError):
        return None

    assessment = (
        GeneralSkillAssessment.objects.filter(invite_token=token)
        .select_related("job_application__job__company")
        .first()
    )
    if not assessment or not assessment.job_application_id:
        return None
    has_passed = CandidateAssessmentSubmission.objects.filter(
        skill_assessment=assessment, is_passed=True
    ).exists()
    return assessment.job_application if has_passed else None


class JobInterviewSlotClaimView(APIView):
    """Claim a published interview slot, turning it into a confirmed Scheduler meeting."""

    permission_classes = [IsTalentUser]

    def post(self, request, public_id, slot_id, *args, **kwargs):
        job = Job.objects.filter(public_id=public_id).first()
        job_application = _get_passing_job_application(request.user, job.id) if job else None
        if not job_application:
            return Response(
                {"detail": "You do not have a passing assessment for this job."},
                status=HTTP_403_FORBIDDEN,
            )

        data, status_code = _claim_interview_slot(job, job_application, slot_id)
        return Response(data, status=status_code)


class GuestInterviewSlotListView(APIView):
    """GET /api/jobs/interview-slots/guest/<token>/ -- unclaimed interview
    slots for a guest applicant's job, no login required. Mirrors
    JobInterviewSlotListView for an account-less applicant."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        job_application = _get_passing_job_application_by_invite_token(token)
        if not job_application:
            return Response(
                {"detail": "This link is invalid, expired, or you have not passed this job's assessment."},
                status=HTTP_403_FORBIDDEN,
            )
        job = job_application.job
        slots = _unclaimed_future_slots(job.id)
        return Response({
            "job_title": job.title,
            "company_name": job.company.company_name,
            "slots": JobInterviewAvailabilitySlotSerializer(slots, many=True).data,
        }, status=HTTP_200_OK)


class GuestInterviewSlotClaimView(APIView):
    """POST /api/jobs/interview-slots/guest/<token>/<slot_id>/claim/ --
    claim a slot with no login required. Mirrors JobInterviewSlotClaimView
    for an account-less applicant."""

    permission_classes = [AllowAny]

    def post(self, request, token, slot_id, *args, **kwargs):
        job_application = _get_passing_job_application_by_invite_token(token)
        if not job_application:
            return Response(
                {"detail": "This link is invalid, expired, or you have not passed this job's assessment."},
                status=HTTP_403_FORBIDDEN,
            )
        data, status_code = _claim_interview_slot(job_application.job, job_application, slot_id)
        return Response(data, status=status_code)


class JobRetrieveUpdateView(RetrieveUpdateAPIView):
    queryset = Job.objects.select_related("company").all()
    permission_classes = [IsJobCreatorOrReadOnly]
    lookup_field = "public_id"

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return JobUpdateSerializer
        return JobSerializer
    
    def update(self, request, *args, **kwargs):
        from jobs.tasks import send_job_status_notification
        from subscriptions.billing_service import get_or_create_wallet

        partial = request.method == 'PATCH'
        instance = self.get_object()
        company = getattr(instance, 'company', None)
        if company and not request.user.is_staff and not user_is_company_role(request.user, company, [CompanyTeamMember.ROLE.ADMIN, CompanyTeamMember.ROLE.RECRUITER]):
            return Response({"detail": "Permission denied."}, status=HTTP_403_FORBIDDEN)

        old_status = instance.job_status
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # A recruiter with an exhausted wallet can't flip a job's status at
        # all (not just re-activating one that got auto-paused for billing --
        # see BillingService._pause_company_jobs_for_wallet_exhaustion) until
        # they top up. Without this, manually toggling status was a way to
        # route around the auto-pause and keep accepting applications the
        # wallet can no longer pay to process. Staff can still override.
        requested_status = serializer.validated_data.get("job_status")
        if (
            company
            and not request.user.is_staff
            and requested_status is not None
            and requested_status != old_status
        ):
            wallet = get_or_create_wallet(company)
            if wallet.balance <= 0:
                return Response(
                    {"detail": "Your wallet balance is exhausted. Fund your wallet before changing this job's status."},
                    status=HTTP_400_BAD_REQUEST,
                )

        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        new_status = instance.job_status
        if request.user.is_staff and old_status != new_status and new_status in ("ACTIVE", "ON_HOLD"):
            send_job_status_notification.delay(instance.id, new_status)

        return Response(serializer.data)


class JobDeleteView(DestroyAPIView):
    queryset = Job.objects.select_related('company').all()
    serializer_class = JobSerializer
    permission_classes = [IsJobCreatorOrReadOnly, permissions.IsAuthenticated]
    lookup_field = "public_id"

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
            "job", "job__company",
            "applicant", "applicant__user",
        )

        if user.is_staff:
            return qs

        if user.user_type == CustomUser.USER_TYPE.TALENT:
            return qs.filter(applicant__user=user)

        company = get_user_company(user)
        if company:
            return qs.filter(job__company=company)

        return qs.none()


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

        previous_status = instance.status
        rejection_reason = (request.data.get("rejection_reason") or "").strip()
        # A manual reject needs a reason so it can be relayed to the
        # candidate (see send_manual_rejection_mail below) -- same "reason
        # required for a real decision" shape as
        # RecruiterAIInterviewDecisionView's override_reason. Only enforced
        # on an actual transition into REJECTED, not a no-op re-PUT.
        if status_value == JobApplication.JobApplicationStatus.REJECTED and status_value != previous_status and not rejection_reason:
            return Response({"detail": "A reason is required to reject a candidate."}, status=HTTP_400_BAD_REQUEST)

        # Moving a candidate to interview on a non-AI-interview job silently
        # no-ops (send_interview_slot_invite just logs a warning and returns)
        # if the recruiter hasn't published any interview time slots yet --
        # catch that here instead of leaving the recruiter and candidate with
        # no signal that nothing happened.
        if (
            status_value == JobApplication.JobApplicationStatus.PENDING_DECISION
            and status_value != previous_status
            and not instance.job.ai_interview_enabled
            and not _unclaimed_future_slots(instance.job_id).exists()
        ):
            return Response(
                {"detail": "Publish at least one interview time slot for this job before inviting a candidate to interview."},
                status=HTTP_400_BAD_REQUEST,
            )

        self.perform_update(serializer)

        # A recruiter manually advancing a candidate should trigger the same
        # candidate-facing signal the automatic pipeline sends for that same
        # transition (see jobs.tasks.carry_out_resume_analysis for REVIEWED,
        # skill_assessment.tasks.mark_skill_assessment_submission for
        # PENDING_DECISION) -- every movable status now has a candidate-facing
        # email so a manual board move is never silent. INTERVIEW_SCHEDULED
        # is normally only ever reached via a real claimed slot/Daily.co room
        # (which sends its own detailed confirmation, see
        # jobs.views._claim_interview_slot) -- send_interview_scheduled_notice_mail
        # below only fires for the manual-board-move bypass of that flow, so
        # the candidate still hears *something* instead of nothing.
        if status_value != previous_status:
            job = instance.job
            if status_value == JobApplication.JobApplicationStatus.REVIEWED:
                send_assessment_link.apply_async(
                    args=[instance.id], countdown=ACCEPTANCE_MAIL_DELAY_SECONDS
                )
            elif status_value == JobApplication.JobApplicationStatus.PENDING_DECISION:
                if job.ai_interview_enabled:
                    from ai_interviews.services import provision_ai_interview

                    provision_ai_interview(job, instance)
                else:
                    send_interview_slot_invite.delay(instance.id)
            elif status_value == JobApplication.JobApplicationStatus.INTERVIEW_SCHEDULED:
                send_interview_scheduled_notice_mail.delay(instance.id)
            elif status_value == JobApplication.JobApplicationStatus.OFFER_EXTENDED:
                send_offer_extended_notice_mail.delay(instance.id)
            elif status_value == JobApplication.JobApplicationStatus.REJECTED:
                send_manual_rejection_mail.apply_async(
                    args=[instance.id, rejection_reason], countdown=REJECTION_MAIL_DELAY_SECONDS
                )
                from .services import cancel_pending_tasks_for_rejected_application

                cancel_pending_tasks_for_rejected_application(instance.id)

        if getattr(instance, "_prefetched_objects_cache", None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)


class JobApplyView(CreateAPIView):
    """Endpoint to apply for a job"""
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "job_apply"


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

        # check if the user has already applied
        exists = JobApplication.objects.filter(
            applicant=self.request.user.profile, job=job
        ).exists()
        if exists:
            return Response(
                {"detail": "User already applied for the job"},
                status=HTTP_400_BAD_REQUEST,
            )

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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "job_apply"

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
        talent = getattr(self.request.user, "profile", None)
        if not talent:
            from django.http import Http404
            raise Http404("Talent profile not found.")
        portfolio, _ = Portfolio.objects.get_or_create(
            talent=talent
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


class JobTrackViewAPIView(APIView):
    """Records a view of the public job page (the apply_token URL a
    recruiter shares externally) -- called once from that page only, not
    from the apply/application-complete pages, so a candidate's full
    application journey doesn't inflate the count multiple times.

    Mirrors campaigns/tracking_views.py's TrackOpenView: public, atomic
    F()-based update (no race on concurrent views), and never surfaces an
    error -- a missing/invalid token just silently no-ops.
    """
    permission_classes = [AllowAny]

    def post(self, request, apply_token):
        Job.objects.filter(apply_token=apply_token).update(view_count=F("view_count") + 1)
        return Response(status=204)


class JobApplyByIdView(APIView):
    """No-login job application: any visitor can apply directly with their own
    name/email/phone/LinkedIn/resume -- no Tiaago account required, and none
    is created. The submitted details live directly on the JobApplication
    row (see GuestJobApplicationSerializer); the resume-screening/assessment
    pipeline and recruiter Applications list read them from there instead
    of a TalentProfile."""

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "job_apply"

    def post(self, request, apply_token):
        try:
            job = Job.objects.get(apply_token=apply_token)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=HTTP_404_NOT_FOUND)

        serializer = GuestJobApplicationSerializer(data=request.data, context={"job": job})
        serializer.is_valid(raise_exception=True)
        try:
            application = serializer.save()
        except IntegrityError:
            # validate()'s "already applied" check and this INSERT aren't
            # atomic -- a double-click/retry can race both requests past
            # validate() before either commits, so the unique_guest_email_
            # per_job constraint is the real backstop. Surface the same
            # friendly message instead of an unhandled 500.
            return Response(
                {"error": "You've already applied to this job."}, status=HTTP_400_BAD_REQUEST
            )

        job_owner = job.company

        try:
            emails.application_received_mail(application.as_email_recipient(), job)
        except Exception:
            logger.exception("Failed to send application-received email for application %s", application.id)

        # If job uses AI hiring, trigger resume analysis. Dispatch failures
        # (e.g. AI service unreachable, or CELERY_TASK_ALWAYS_EAGER running the
        # task inline in dev) must never fail the candidate's own request --
        # the application itself is already saved successfully at this point.
        if job.hires_with_ai:
            try:
                carry_out_resume_analysis.delay(application.id)
            except Exception:
                logger.exception("Failed to dispatch resume analysis for application %s", application.id)

        response_serializer = GuestJobApplicationResponseSerializer(application)
        return Response(response_serializer.data, status=HTTP_201_CREATED)




class JobApplyByTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "job_apply"
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
        if job.job_status != Job.JobStatus.ACTIVE:
            return Response(
                {'error': f'This job is currently {job.get_job_status_display().lower()} and not accepting applications'},
                status=HTTP_400_BAD_REQUEST,
            )
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
        company = Company.objects.select_related("company_rep").prefetch_related(
            Prefetch("jobs", queryset=Job.objects.filter(job_status="ACTIVE"))
        ).filter(company_name__iexact=company_name).first()
        if not company:
            return Response({"detail": "Not found."}, status=404)
        serializer = self.get_serializer(company)
        return Response(serializer.data)
