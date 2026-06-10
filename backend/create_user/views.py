from urllib import request
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.db import transaction
from allauth.account.utils import complete_signup
from allauth.account import app_settings as allauth_settings
from django.db.models import Q, Sum
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.timezone import now
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.translation import gettext_lazy as _
from allauth.account.utils import send_email_confirmation
from dj_rest_auth.registration.views import RegisterView, ResendEmailVerificationView
from rest_framework import status, viewsets, permissions
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import MethodNotAllowed, NotFound
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    RetrieveUpdateAPIView,
    GenericAPIView,
)
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.status import HTTP_404_NOT_FOUND, HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from base.mixins.pagination import PaginationHandlerMixin
from base.permissions import IsTalentUser
from base.utils import extract_query_from_request
from jobs.models import Experience
from skill_assessment.models import CandidateAssessmentSubmission
from .tasks import (
    # send_welcome_mail,
    admin_approved_user_mail,
    admin_reject_user_mail,
    send_company_invite_email,
    send_referral_invite_email,
)
from .utils import generate_referral_code, send_otp_to_user, send_welcome_mail, send_invite_to_user, send_invite_email, build_invite_link
from utils.email_handler import EmailHandler, EmailTypes
from django.core.cache import cache
from django.conf import settings as django_settings
from .models import CustomUser, Company, TalentProfile, OneTimePassword, Referral, ReferralWallet, WithdrawalRequest, CompanyTeamInvite, CompanyTeamMember
from payments.models import WalletTransaction
from django.db import IntegrityError
from subscriptions.permissions import IsCompanyRepOrStaffUser, IsTalentOrStaffUser
from .api.serializers import (
    CompanySerializer,
    CompanyTeamInviteSerializer,
    TalentSerializer,
    CustomUserSerializer,
    CompanyForUserProfileSerializer,
    TalentForUserProfileSerializer,
    CompanyListSerializer,
    SimpleUserSerializer,
    PasswordResetConfirmSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ReferralSerializer,
    ReferralEmailSerializer,
    DummySerializer,
    ConfirmEmailSerializer,
    ReferralWalletSerializer,
    WithdrawalRequestSerializer,
    WithdrawalRequestDetailSerializer,
    CompanyTeamInvite,
    CompanyTeamMember,
    CompanyTeamInviteCreateSerializer,
)
from payments.serializers import ReferralRewardTransactionSerializer
from decimal import Decimal
from subscriptions.helper import convert_wallet_currency
import uuid

import logging

User = get_user_model()

logger = logging.getLogger(__name__)


class CustomRegisterView(RegisterView):
    """Endpoint for registering"""

    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [FormParser, MultiPartParser, JSONParser]

    def get_serializer_class(self):
        user_type = self.request.query_params.get("user_type")

        if user_type and user_type.lower() == "company":
            return CompanySerializer
        return TalentSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.perform_create(serializer)  # Calls perform_create
        # Handle resume upload for talent users
        if getattr(user, "user_type", None) == "T":
            try:
                has_profile = bool(user.profile)
            except CustomUser.profile.RelatedObjectDoesNotExist:
                has_profile = False
            if has_profile:
                file_resume = request.FILES.get("resume")
                try:
                    if file_resume:
                        user.profile.resume = file_resume
                        user.profile.save()
                except Exception as e:
                    logger.warning(f"Failed to save resume for user{user.id}: {str(e)}")

        # Generate OTP and send to mail
        try:
            send_otp_to_user(user.email)
        except Exception as e:
            logger.error(f"User {user.id} created but failed to send OTP email: {e}")

        # If the registration was done via an invite token, link the new user to the company
        invite_token = request.data.get("invite_token") or request.query_params.get("invite_token")
        if invite_token:
            try:
                invite = CompanyTeamInvite.objects.filter(token=invite_token).first()
                if invite and invite.status == CompanyTeamInvite.STATUS_PENDING and not invite.is_expired:
                    # attach member
                    member, created = CompanyTeamMember.objects.get_or_create(
                        company=invite.company,
                        user=user,
                        defaults={"role": invite.role, "invited_by": invite.invited_by},
                    )
                    invite.mark_accepted()
            except Exception as exc:
                logger.exception("Failed to link user to company invite: %s", exc)

        # Check if user has pending job application from external link
        pending_job_token = request.session.get('pending_job_apply_token')

        headers = self.get_success_headers(serializer.data)
        response_data = {"message": "User registered successfully. Please verify via OTP."}

        if pending_job_token:
            response_data.update({
                "has_pending_job_application": True,
                "pending_job_token": pending_job_token
            })
            # Clear the session
            del request.session['pending_job_apply_token']

        return Response(
            response_data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        user = serializer.save(self.request)
        complete_signup(
            self.request,
            user,
            allauth_settings.EMAIL_VERIFICATION,
            None, 
        )
        return user 



class ConfirmEmailView(APIView):
    """
    Endpoint to verify email.
    For newly signed up users
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ConfirmEmailSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp_code = serializer.validated_data["otp"]

        try:
            otp_entry = OneTimePassword.objects.select_related("user").get(
                user__email=email, code=otp_code, otp_expires__gte=now()
            )
    
            otp_entry.user.is_verified = True
            otp_entry.user.save()

            send_welcome_mail(
                user_pk=otp_entry.user.pk
            ) 
            user= otp_entry.user
            # Update the user profile to mark as verified
            user.is_verified = True
            user.verified = True
            user.save()

            otp_entry.delete() 

            return Response(
                {"detail": "Email successfully confirmed."}, status=status.HTTP_200_OK
            )

        except ObjectDoesNotExist:
            return Response(
                {"detail": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except MultipleObjectsReturned:
            return Response(
                {"detail": "Multiple OTPs found. Please contact support."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        except IntegrityError:
            return Response(
                {"detail": "A database error occurred. Try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.error(f"Error confirming email: {str(e)}")
            return Response(
                {"detail": "An unexpected error occurred. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ResendOtpView(APIView):
    """Endpoint to resend otp"""

    permission_classes = [AllowAny]
    authentication_classes = []
    allowed_methods = ("POST",)

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        if not email:
            return Response(
                {"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        # Fetch the user and their OTP record
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )
        # Check if the user is already verified
        if user.is_verified:
            return Response(
                {"detail": "User has " "already been verified."},
                status=status.HTTP_200_OK,
            )

        # Fetch OTP instance for the user
        otp_instance = OneTimePassword.objects.filter(user=user).first()

        # Check if OTP exists and whether it's expired
        if otp_instance and otp_instance.otp_expires > timezone.now():
            pass
            """return Response(
                {"detail": "An OTP has already been sent and is still valid."},
                status=status.HTTP_400_BAD_REQUEST,
            )"""

        # Send new OTP if not valid or expired
        send_otp_to_user(email)

        return Response(
            {"detail": "OTP has been sent to your email."}, status=status.HTTP_200_OK
        )



class ForgotPasswordView(GenericAPIView):
    """Forgot password"""

    permission_classes = [AllowAny]
    serializer_class = ForgotPasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "User with Email does not exist, please create an account"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            send_otp_to_user(email)
        except Exception as e:
            return Response(
                {"error": f"Failed to send verification email: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(
            {
                "message": "Otp has been sent to your email, please clease check your inbox to reset your password."
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = ResetPasswordSerializer

    def post(self, request):
        otp = request.data.get("otp")
        email = request.data.get("email")

        # Validate email existence
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "User with this email does not exist"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate OTP
        try:
            otp_entry = OneTimePassword.objects.select_related("user").get(
                user__email=email, code=otp, otp_expires__gte=now()
            )
        except OneTimePassword.DoesNotExist:
            return Response(
                {"message": "OTP not found or expired"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except OneTimePassword.MultipleObjectsReturned:
            return Response(
                {"message": "Multiple OTPs found, check for duplicates"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate passwords
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password = serializer.validated_data["new_password1"]

        # Reset password
        user.set_password(password)
        user.save()

        # Delete OTP after successful password reset
        otp_entry.delete()

        return Response(
            {"message": "Password reset successful."}, status=status.HTTP_200_OK
        )


class CustomPasswordResetView(APIView):
    """
    Custom Password Reset View that generates the token and UID separately
    and sends a frontend link via email.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        # Validate email and get the user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "User with this email does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate token and UID
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Send custom email with the frontend link
        self.send_password_reset_email(user, uid, token, request)

        return Response(
            {"message": "Password reset link sent."}, status=status.HTTP_200_OK
        )

    def send_password_reset_email(self, user, uid, token, request):
        """
        Send a custom email with the UID and token to the frontend reset link.
        """
        current_site = get_current_site(request)

        if user.is_talent():
            frontend_url = f"{settings.FRONTEND_URL}/talents/reset-password/?uid={uid}&token={token}/"
        elif user.is_company():
            frontend_url = f"{settings.FRONTEND_URL}/startups/reset-password/?uid={uid}&token={token}/"
        else:
            frontend_url = f"{settings.FRONTEND_URL}/admin/reset-password/?uid={uid}&token={token}/"

        # Render the email content
        subject = "Reset Your Password"
        email_template_name = "account/email/password_reset_key_message.html"
        context = {
            "user": user,
            "uid": uid,
            "token": token,
            "password_reset_url": frontend_url,
            "current_site": current_site,
        }
        EmailHandler(user.email).send_mail(
            subject=subject,
            context=context,
            template=email_template_name,
            email_type=EmailTypes.PASSWORD_RESET,
            security=True,
        )


class CustomPasswordResetConfirmView(APIView):
    """
    View to handle password reset confirmation using uid and token.
    This view uses PasswordResetConfirmSerializer to validate and reset the password.
    """

    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        # Bind the serializer with the request data
        serializer = PasswordResetConfirmSerializer(
            data={
                "uidb64": uidb64,
                "token": token,
                "new_password1": request.data.get("new_password1"),
                "new_password2": request.data.get("new_password2"),
            }
        )

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Password reset successful."}, status=status.HTTP_200_OK
            )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(ListAPIView):
    queryset = User.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [IsAdminUser]

    def list(self, request):
        queryset = self.get_queryset()
        user = self.request.user
        serializer = CustomUserSerializer(queryset, many=True)
        if user.user_type == "STAFF":
            serializer = CustomUserSerializer(queryset, many=True)
        return Response(serializer.data)


class TalentListView(APIView, PaginationHandlerMixin):
    """
    Get list of talents. Implements searching by name, email ,role and country.\n
    Also implements filtering by verification status
    """

    permission_classes = [IsCompanyRepOrStaffUser]

    def get(self, request):
        queryset = TalentProfile.objects.all()
        
        # For company users, only show talents who have passed assessment
        # Accessing the reverse OneToOne `request.user.company` can raise
        # RelatedObjectDoesNotExist if the relation doesn't exist, so
        # check safely.
        try:
            has_company = bool(request.user.company)
        except CustomUser.company.RelatedObjectDoesNotExist:
            has_company = False

        if has_company:
            queryset = queryset.filter(has_passed_tiaago_assessment=True)
        
        q = extract_query_from_request(request)
        if q:
            queryset = queryset.filter(
                Q(role__title__iexact=q)
                | Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
                | Q(user__email__icontains=q)
                | Q(user__country__icontains=q)
            )        
        approval_filter = extract_query_from_request(request, "verified")
        if approval_filter == "true":
            queryset = queryset.filter(user__verified=True)
        elif approval_filter == "false":
            queryset = queryset.filter(user__verified=False)
        paginated_queryset = self.paginate_queryset(queryset)
        data = TalentForUserProfileSerializer(paginated_queryset, many=True).data
        response = self.get_paginated_response(data)
        return Response(data=response)


class CompanyListView(APIView, PaginationHandlerMixin):
    """
    Get list of companies. Implements searching by name, email ,role.\n
    Also implements filtering by verification status
    """

    permission_classes = [IsTalentOrStaffUser]

    def get(self, request):
        queryset = Company.objects.all()
        q = extract_query_from_request(request)
        if q:
            queryset = queryset.filter(
                Q(role__iexact=q)
                | Q(company_name__icontains=q)
                | Q(company_email__icontains=q)
            )
        # Removed verified filter for companies
        paginated_queryset = self.paginate_queryset(queryset)
        data = CompanyListSerializer(paginated_queryset, many=True).data
        response = self.get_paginated_response(data)
        return Response(data=response)


class UserProfileView(RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = [FormParser, MultiPartParser, JSONParser]
    """Endpoint to return the logged in user's profile data"""

    def get_serializer_class(self):
        user = self.request.user
        if isinstance(user, AnonymousUser):  # if the user is an anonymous user
            #print("User is company rep serializer")
            return CustomUserSerializer  # check required for swagger
        if user.is_company():
            return CompanyForUserProfileSerializer
        elif user.is_talent():
            return TalentForUserProfileSerializer
        else:
            return CustomUserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_talent():
            return TalentProfile.objects.all()
        elif user.is_company():
            print("User is company queryset")
            return Company.objects.all()

        return User.objects.all()

    def get_object(self):
        user = self.request.user
        if user.is_talent():
            return self.request.user.profile
        elif user.is_company():
            return self.request.user.company
        else:
            return user
        
    def update(self, request, *args, **kwargs):
        """Handles PUT and PATCH requests (update profile, resume, profile_pic)."""

        instance = self.get_object()
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        print(serializer.validated_data)
        serializer.save()
        # old_country = serializer.validated_data.get("country", instance.country)
        # print(old_country)
        # # currency conversion for company
        # if request.user.is_company():
        #     new_country = request.data.get("country")
        #     print(new_country)
        #     if new_country and new_country != old_country:
        #         convert_wallet_currency(request.user.company, new_country)
        
        # serializer.save()

        # Handle profile picture upload for user model
        if 'profile_pic' in request.FILES:
            user = request.user
            user.profile_pic = request.FILES['profile_pic']
            user.save()

        # Handle resume upload for talent users
        if request.user.is_talent():
            profile = request.user.profile

        #if user sends an empty resume
            if "resume" in request.data and not request.FILES.get('resume'):
                if profile.resume:
                    profile.resume.delete(save=False)
                    profile.resume = None
                    profile.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

#

class AdminVerifyUserView(CreateAPIView):
    serializer_class = SimpleUserSerializer
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        try:
            user = User.objects.get(id=kwargs.get("user_id"))
        except User.DoesNotExist:
            return Response({"details": "user not found."}, status=HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if user.verified:
            # send acceptance mail
            admin_approved_user_mail.delay(user.pk)
        else:
            # send rejection mail
            admin_reject_user_mail.delay(user.pk)
        return Response(serializer.data, status=HTTP_201_CREATED)


class CustomResendEmailVerificationView(ResendEmailVerificationView):

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = self.get_queryset().filter(**serializer.validated_data).first()
        if email and not email.verified:
            send_email_confirmation(request, email.user, email.email)

        return Response({"detail": "ok"}, status=status.HTTP_200_OK)

class GenerateReferralCodeAPIView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DummySerializer
    def post(self, request):
        user = request.user
        try:
            talent = TalentProfile.objects.get(user=user)
        except TalentProfile.DoesNotExist:
            raise NotFound("Talent profile not found")

        if not talent.referral_code:
            talent.referral_code = generate_referral_code()
            talent.save()

        return Response(
            {"referral_code": talent.referral_code}, status=status.HTTP_200_OK
        )

class RetrieveReferralCodeAPIView(RetrieveUpdateAPIView):
    http_method_names = ['get']
    permission_classes = [IsAuthenticated]
    serializer_class = DummySerializer
    def get(self, request):
        user = request.user

        try:
            talent = TalentProfile.objects.get(user=user)
        except TalentProfile.DoesNotExist:
            raise NotFound("Talent profile not found")

        referral_code = talent.referral_code
        return Response(
            {"referral_code": f"{referral_code}"}, status=status.HTTP_200_OK
        )


class ReferralTrackingAPIView(ListAPIView):
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated]
    queryset = Referral.objects.all()

    def get_queryset(self):
        user = self.request.user

        if not user or not user.is_authenticated:
            raise NotFound("User not authenticated")

        try:
            inviter = TalentProfile.objects.get(user=user)
        except TalentProfile.DoesNotExist:
            raise NotFound("Talent profile not found")

        return Referral.objects.select_related("invitee").filter(inviter=inviter)


class SendReferralMailAPIView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReferralEmailSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            inviter = TalentProfile.objects.get(user=request.user)
        except TalentProfile.DoesNotExist:
            return Response(
                {"message": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        referral_code = inviter.referral_code
        email = serializer.validated_data.get("email")

        # Offload referral invite email to background task for scalability
        try:
            send_referral_invite_email.delay(email, referral_code)
        except Exception as e:
            return Response({"error": f"Failed to queue invite email: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(
            {"message": "Invite link successfully sent"}, status=status.HTTP_200_OK
        )



class ReferralRewardViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing referral rewards and withdrawals
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return appropriate queryset based on action"""
        if self.action == 'wallet':
            return ReferralWallet.objects.filter(talent__user=self.request.user)
        if self.action == 'transactions':
            return WalletTransaction.objects.filter(
                user=self.request.user,
                transaction_type__in=[
                    WalletTransaction.TRANSACTION_TYPE.TALENT_REFERRAL_REWARD,
                    WalletTransaction.TRANSACTION_TYPE.TALENT_REFERRAL_WITHDRAWAL,
                ]
            ).select_related('referral', 'withdrawal_request')
        if self.action in ['withdrawals', 'request_withdrawal']:
            return WithdrawalRequest.objects.filter(
                talent__user=self.request.user
            ).select_related('referral_wallet', 'talent', 'talent__user')

        # Default fallback for list and other actions: show referral wallet(s)
        return ReferralWallet.objects.filter(talent__user=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'wallet':
            return ReferralWalletSerializer
        if self.action == 'transactions':
            return ReferralRewardTransactionSerializer
        if self.action in ['withdrawals', 'request_withdrawal']:
            if self.action == 'withdrawals':
                return WithdrawalRequestDetailSerializer
            return WithdrawalRequestSerializer

        # Default serializer for list/detail
        return ReferralWalletSerializer

    @action(detail=False, methods=['get'])
    def wallet(self, request):
        """Get user's referral wallet details"""
        wallet = self.get_queryset().first()
        if not wallet:
            return Response({
                "balance": "0.00",
                "total_earned": "0.00",
                "total_withdrawn": "0.00"
            })
        serializer = self.get_serializer(wallet)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """List all referral reward transactions"""
        transactions = self.get_queryset().order_by('-date_created')
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def withdrawals(self, request):
        """List all withdrawal requests"""
        withdrawals = self.get_queryset().order_by('-date_created')
        serializer = self.get_serializer(withdrawals, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def request_withdrawal(self, request):
        """Create a new withdrawal request"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get talent profile
        try:
            talent_profile = request.user.profile
        except TalentProfile.DoesNotExist:
            return Response(
                {'error': 'Talent profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        amount = Decimal(serializer.validated_data['amount'])

        from payments.services import WithdrawalService
        success, message, withdrawal = WithdrawalService.create_withdrawal_request(
            talent_profile=talent_profile,
            amount=amount
        )

        if not success:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = WithdrawalRequestDetailSerializer(withdrawal)
        return Response(result.data, status=status.HTTP_201_CREATED)


class AdminReferralWithdrawalViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing withdrawal requests
    """
    permission_classes = [permissions.IsAdminUser]
    queryset = WithdrawalRequest.objects.all()
    serializer_class = WithdrawalRequestDetailSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a withdrawal request"""
        withdrawal = self.get_object()
        from payments.services import WithdrawalService
        success, message = WithdrawalService.approve_withdrawal(
            withdrawal=withdrawal,
            admin_user=request.user
        )

        if not success:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(withdrawal)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark a withdrawal as completed"""
        withdrawal = self.get_object()
        transfer_code = request.data.get('transfer_code')
        from payments.services import WithdrawalService
        success, message = WithdrawalService.complete_withdrawal(
            withdrawal=withdrawal,
            transfer_code=transfer_code
        )

        if not success:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(withdrawal)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def fail(self, request, pk=None):
        """Mark a withdrawal as failed"""
        withdrawal = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        from payments.services import WithdrawalService
        success, message = WithdrawalService.fail_withdrawal(
            withdrawal=withdrawal,
            reason=reason
        )

        if not success:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(withdrawal)
        return Response(serializer.data)


class TalentProfileStatusAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTalentUser]

    def get(self, request):
        talent = request.user.profile
        # has passed tiaago skill assessment
        has_taken_assessment = CandidateAssessmentSubmission.objects.filter(
            candidate=talent,
            is_passed=True,
            skill_assessment__company__isnull=True,
            skill_assessment__job_application__isnull=True,
        ).exists()
        progress = {
            "created_account": True,
            "has_added_work_experience": Experience.objects.filter(
                portfolio__talent=talent
            ).exists(),
            "has_social_media_links": talent.social_media_links.all().exists(),
            "has_taken_assessment": has_taken_assessment,
        }
        return Response(data=progress)


class CompanyTeamInviteCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Ensure inviter is a company admin and derive the company from their membership
        membership = CompanyTeamMember.objects.filter(user=request.user).first()
        if not membership or membership.role != CompanyTeamMember.ROLE.ADMIN:
            return Response({"detail": "Only company admins can invite."}, status=status.HTTP_403_FORBIDDEN)

        company = membership.company
        company_key = f"invite_rate:company:{company.id}"
        
        serializer = CompanyTeamInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emails = serializer.validated_data["emails"]
        role = serializer.validated_data['role']

        created = []
        errors = []

        # Rate limiting / abuse protection
        # Per-inviter and per-company limits are enforced over a sliding window (default 24h)
        invite_window = getattr(django_settings, "COMPANY_INVITE_RATE_WINDOW_SECONDS", 60 * 60 * 24)
        per_user_limit = getattr(django_settings, "COMPANY_INVITE_RATE_LIMIT_PER_USER", 50)
        per_company_limit = getattr(django_settings, "COMPANY_INVITE_RATE_LIMIT_PER_COMPANY", 200)

        user_key = f"invite_rate:user:{request.user.id}"

        user_count = cache.get(user_key) or 0

        # Prevent creating more invites than allowed in the window
        if int(user_count) + len(emails) > int(per_user_limit):
            return Response({"detail": "Invite rate limit exceeded for inviter. Try again later."}, status=429)
        for email in emails:
            # skip if there is already an accepted membership for that email
            existing_user = User.objects.filter(email__iexact=email).first()
            if existing_user:
                already_member = CompanyTeamMember.objects.filter(company=company, user=existing_user).exists()
                if already_member:
                    errors.append({"email": email, "error": "User already a member"})
                    continue

            invite, created_flag = CompanyTeamInvite.objects.get_or_create(company=company, email=email, defaults={"role": role, "invited_by": request.user})
            if not created_flag:
                # if exists and accepted skip
                if invite.status == CompanyTeamInvite.STATUS_ACCEPTED:
                    errors.append({"email": email, "error": "Invite already accepted"})
                    continue
                # if pending -> optionally update role and resend 
                invite.role = role
                invite.invited_by = request.user
                invite.token = uuid.uuid4()
                invite.status = CompanyTeamInvite.STATUS_PENDING
                invite.created_at = timezone.now()
                invite.save()

            try:
                # queue background task to send invite
                send_company_invite_email.delay(invite.id)
                created.append({"email": email})

                # increment counters in cache (best-effort)
                try:
                    cache.incr(user_key)
                except Exception:
                    cache.set(user_key, int(cache.get(user_key) or 0) + 1, invite_window)
                try:
                    cache.incr(company_key)
                except Exception:
                    cache.set(company_key, int(cache.get(company_key) or 0) + 1, invite_window)

            except Exception as exc:
                errors.append({"email": email, "error": str(exc)})

        return Response({"created": created, "errors": errors}, status=status.HTTP_201_CREATED)
    


class ComapnayTeamInviteValidateAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        invite = get_object_or_404(CompanyTeamInvite, token=token)
        data = {
            "email": invite.email,
            "company": invite.company.company_name,
            "company_id": invite.company.id,
            "role": invite.role,
            "status": invite.status,
            "is_expired": invite.is_expired,

        }

        if invite.status == CompanyTeamInvite.STATUS_ACCEPTED:
            data["message"] = "Invite already accepted"
            return Response(data, status=status.HTTP_200_OK)
        
        if invite.is_expired:
            data["message"] = "Invite has expired"
            return Response(data, status=status.HTTP_410_GONE)
        

        # To check if an account with the email exists
        existing_user = User.objects.filter(email__iexact=invite.email).first()
        data["existing_user"] = bool(existing_user)
        return Response(data, status=status.HTTP_200_OK)
    

class CompanyTeamInviteAcceptAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request, token):
        invite = get_object_or_404(CompanyTeamInvite, token=token)

        if invite.status == CompanyTeamInvite.STATUS_ACCEPTED:
            return Response({"detail": "Invite already accepted."}, status=status.HTTP_400_BAD_REQUEST)
        
        if invite.is_expired:
            return Response({"detail": "Invite has expired."}, status=status.HTTP_400_BAD_REQUEST)
        
        # If user is authenticated and their email matches the invite
        if request.user.is_authenticated:
            if request.user.email.lower() != invite.email.lower():
                return Response({"detail": "Authenticated user email does not match invite email."}, status=status.HTTP_403_FORBIDDEN)
            # use the authenticated user
            member, created = CompanyTeamMember.objects.get_or_create(
                company=invite.company,
                user=request.user,
                defaults={"role": invite.role, "invited_by": invite.invited_by}
            )
            invite.mark_accepted()
            return Response({"detail": "Invite accepted successfully", "member_id": member.id}, status=status.HTTP_200_OK)

        return Response({"detail": "Invite accepted successfully"}, status=status.HTTP_200_OK)
    

class CompanyTeamInvieResendAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, invite_id):
        invite = get_object_or_404(CompanyTeamInvite, id=invite_id)
        # check if requester is admin of the company OR the user who originally invited
        try:
            membership = CompanyTeamMember.objects.get(company=invite.company, user=request.user)
            if membership.role != CompanyTeamMember.ROLE.ADMIN and invite.invited_by != request.user:
                return Response({"detail": "Only company admins or the inviter can resend invites."}, status=status.HTTP_403_FORBIDDEN)
        except CompanyTeamMember.DoesNotExist:
            # not a company member but may be the inviter (in some cases inviter may be external) — check invited_by
            if invite.invited_by != request.user:
                return Response({"detail": "Must be a company member or inviter to resend invites."}, status=status.HTTP_403_FORBIDDEN)
        
        if invite.status == CompanyTeamInvite.STATUS_ACCEPTED:
            return Response({"detail": "Cannot resend an accepted invite."}, status=status.HTTP_400_BAD_REQUEST)

        # rate-limit resends per-invite to avoid abuse
        resend_cooldown = getattr(django_settings, "RESEND_INVITE_COOLDOWN_SECONDS", 60 * 5)
        resend_key = f"invite:resend:{invite.id}"
        if cache.get(resend_key):
            return Response({"detail": "Please wait before resending this invite."}, status=429)

        # update token and created_at
        invite.token = uuid.uuid4()
        invite.created_at = timezone.now()
        invite.status = CompanyTeamInvite.STATUS_PENDING
        invite.save()

        try:
            # queue background task
            send_company_invite_email.delay(invite.id)
            cache.set(resend_key, True, resend_cooldown)
            return Response({"detail": "Invite resent successfully."}, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": f"Failed to resend invite: {str(exc)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompanyTeamInviteRequestNewAPIView(APIView):
    """Allow invitee (via token) to request a new invite link when expired."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        invite = get_object_or_404(CompanyTeamInvite, token=token)
        if invite.status != CompanyTeamInvite.STATUS_PENDING:
            return Response({"detail": "Only pending invites can request new links."}, status=status.HTTP_400_BAD_REQUEST)

        if not invite.is_expired:
            return Response({"detail": "Invite has not expired yet."}, status=status.HTTP_400_BAD_REQUEST)

        request_cooldown = getattr(django_settings, "INVITE_REQUEST_NEW_COOLDOWN_SECONDS", 60 * 60)
        request_key = f"invite:request_new:{invite.id}"
        if cache.get(request_key):
            return Response({"detail": "A new invite link was requested recently. Try again later."}, status=429)

        invite.token = uuid.uuid4()
        invite.created_at = timezone.now()
        invite.status = CompanyTeamInvite.STATUS_PENDING
        invite.save()

        try:
            send_company_invite_email.delay(invite.id)
            cache.set(request_key, True, request_cooldown)
            return Response({"detail": "New invite link sent."}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Failed to send new invite link: %s", exc)
            return Response({"detail": f"Failed to send new invite link: {str(exc)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompanyTeamInviteRevokeAPIView(APIView):
    """Allow company admins or inviter to revoke a pending invite."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, invite_id):
        invite = get_object_or_404(CompanyTeamInvite, id=invite_id)
        try:
            membership = CompanyTeamMember.objects.get(company=invite.company, user=request.user)
            if membership.role != CompanyTeamMember.ROLE.ADMIN and invite.invited_by != request.user:
                return Response({"detail": "Only company admins or the inviter can revoke invites."}, status=status.HTTP_403_FORBIDDEN)
        except CompanyTeamMember.DoesNotExist:
            if invite.invited_by != request.user:
                return Response({"detail": "Must be a company member or inviter to revoke invites."}, status=status.HTTP_403_FORBIDDEN)

        if invite.status == CompanyTeamInvite.STATUS_ACCEPTED:
            return Response({"detail": "Cannot revoke an accepted invite."}, status=status.HTTP_400_BAD_REQUEST)

        invite.mark_revoked()
        return Response({"detail": "Invite revoked successfully."}, status=status.HTTP_200_OK)


class CompanyTeamMemberRemoveAPIView(APIView):
    """Remove an existing company team member. Allowed for company admins or the inviter."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, company_id, member_id):
        company = get_object_or_404(Company, id=company_id)
        member = get_object_or_404(CompanyTeamMember, id=member_id, company=company)

        # check requester permission
        try:
            requester_membership = CompanyTeamMember.objects.get(company=company, user=request.user)
            if requester_membership.role != CompanyTeamMember.ROLE.ADMIN and member.invited_by != request.user:
                return Response({"detail": "Only company admins or the inviter can remove members."}, status=status.HTTP_403_FORBIDDEN)
        except CompanyTeamMember.DoesNotExist:
            # If requester is the inviter of this member they can remove
            if member.invited_by != request.user:
                return Response({"detail": "Must be a company member or inviter to remove members."}, status=status.HTTP_403_FORBIDDEN)

        member.delete()
        return Response({"detail": "Member removed successfully."}, status=status.HTTP_200_OK)