from datetime import datetime, timezone as dt_timezone

from urllib import request
from django.conf import settings
from django.utils.crypto import constant_time_compare
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.tokens import default_token_generator
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
from rest_framework_simplejwt.tokens import RefreshToken
from base.mixins.pagination import PaginationHandlerMixin, TiaagoPagination
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
from .utils import generate_referral_code, send_otp_to_user, send_welcome_mail, send_invite_to_user, send_invite_email, build_invite_link, send_after_commit
from utils.email_handler import EmailHandler, EmailTypes
from django.core.cache import cache
from django.conf import settings as django_settings
from .models import CustomUser, Company, TalentProfile, OneTimePassword, Referral, ReferralWallet, WithdrawalRequest, CompanyTeamInvite, CompanyTeamMember
from payments.models import WalletTransaction
from django.db import IntegrityError
from subscriptions.models import FreePlan
from subscriptions.permissions import IsCompanyRepOrStaffUser, IsTalentOrStaffUser
from .api.serializers import (
    CompanyOnboardingSerializer,
    CompanySerializer,
    CompanyTeamInviteSerializer,
    CompanyTeamMemberSerializer,
    TalentSerializer,
    CustomUserSerializer,
    CompanyForUserProfileSerializer,
    TalentForUserProfileSerializer,
    CompanyListSerializer,
    SimpleUserSerializer,
    PasswordResetConfirmSerializer,
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


class GoogleSignInView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        import requests as http_requests

        access_token = request.data.get("access_token")
        user_type = request.data.get("user_type", "company")
        if not access_token:
            return Response(
                {"error": "Google access token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resp = http_requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            resp.raise_for_status()
            payload = resp.json()
        except Exception:
            return Response(
                {"error": "Failed to verify Google token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        email = payload.get("email", "").lower().strip()
        if not email or not payload.get("email_verified"):
            return Response(
                {"error": "A verified Google email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        first_name = payload.get("given_name", "")
        last_name = payload.get("family_name", "")

        is_new = False
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            is_new = True
            django_user_type = (
                CustomUser.USER_TYPE.COMPANY_REP
                if user_type == "company"
                else CustomUser.USER_TYPE.TALENT
            )
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                user_type=django_user_type,
                is_verified=True,
                verified=True,
                password=None,
                auth_provider=CustomUser.AuthProvider.GOOGLE,
            )
            if django_user_type == CustomUser.USER_TYPE.COMPANY_REP:
                company = Company.objects.create(
                    company_rep=user,
                    company_email=email,
                )
                FreePlan.objects.get_or_create(
                    company=company, defaults={"company_email": email}
                )
            else:
                TalentProfile.objects.create(user=user)
            send_after_commit(send_welcome_mail, user_pk=user.pk)

        update_fields = []
        if not user.is_verified:
            user.is_verified = True
            user.verified = True
            update_fields += ["is_verified", "verified"]
        if user.auth_provider != CustomUser.AuthProvider.GOOGLE:
            user.auth_provider = CustomUser.AuthProvider.GOOGLE
            update_fields.append("auth_provider")
        if update_fields:
            user.save(update_fields=update_fields)

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        return Response(
            {
                "access": str(access),
                "refresh": str(refresh),
                "access_expiration": datetime.fromtimestamp(
                    access["exp"], tz=dt_timezone.utc
                ).isoformat(),
                "refresh_expiration": datetime.fromtimestamp(
                    refresh["exp"], tz=dt_timezone.utc
                ).isoformat(),
                "user_type": user.user_type,
                "is_new": is_new,
            },
            status=status.HTTP_200_OK,
        )


class CustomRegisterView(RegisterView):
    """Endpoint for registering"""

    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [FormParser, MultiPartParser, JSONParser]

    def get_serializer_class(self):
        user_type = self.request.query_params.get("user_type")
        invite_token = (
            self.request.data.get("invite_token")
            or self.request.query_params.get("invite_token")
        )
        if invite_token:
            return TalentSerializer
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
                    # attach member to the inviting company
                    member, created = CompanyTeamMember.objects.get_or_create(
                        company=invite.company,
                        user=user,
                        defaults={"role": invite.role, "invited_by": invite.invited_by},
                    )
                    if user.user_type != CustomUser.USER_TYPE.COMPANY_REP:
                        user.user_type = CustomUser.USER_TYPE.COMPANY_REP
                        user.save(update_fields=["user_type"])
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
            otp_entry = (
                OneTimePassword.objects.select_related("user")
                .filter(user__email=email, otp_expires__gte=now())
                .first()
            )
            if otp_entry is None:
                return Response(
                    {"detail": "Invalid or expired OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # This endpoint issues login tokens, so brute-forcing the short
            # code must be cut off: a handful of wrong guesses burns the OTP
            # and the user has to request a new one.
            if not constant_time_compare(otp_entry.code, otp_code):
                otp_entry.attempts += 1
                if otp_entry.attempts >= OneTimePassword.MAX_ATTEMPTS:
                    otp_entry.delete()
                    return Response(
                        {
                            "detail": "Too many incorrect attempts. Please request a new code."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                otp_entry.save(update_fields=["attempts"])
                return Response(
                    {"detail": "Invalid or expired OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = otp_entry.user
            user.is_verified = True
            user.verified = True
            user.save(update_fields=["is_verified", "verified"])

            send_after_commit(send_welcome_mail, user_pk=user.pk)

            otp_entry.delete()

            # Issue JWTs so the frontend can log the user in right after
            # verification (same payload shape as the login endpoint).
            refresh = RefreshToken.for_user(user)
            access = refresh.access_token
            return Response(
                {
                    "detail": "Email successfully confirmed.",
                    "access": str(access),
                    "refresh": str(refresh),
                    "access_expiration": datetime.fromtimestamp(
                        access["exp"], tz=dt_timezone.utc
                    ).isoformat(),
                    "refresh_expiration": datetime.fromtimestamp(
                        refresh["exp"], tz=dt_timezone.utc
                    ).isoformat(),
                    "user_type": user.user_type,
                },
                status=status.HTTP_200_OK,
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



class CustomPasswordResetView(APIView):
    """
    Custom Password Reset View that generates the token and UID separately
    and sends a frontend link via email.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Same response whether or not the account exists, so this endpoint
        # can't be used to probe which emails are registered.
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            pass
        else:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            self.send_password_reset_email(user, uid, token, request)

        return Response(
            {"message": "If an account exists for this email, a password reset link has been sent."},
            status=status.HTTP_200_OK,
        )

    def send_password_reset_email(self, user, uid, token, request):
        """Send a password reset link to the user's email."""
        base_url = settings.FRONTEND_URL.rstrip("/")
        if user.is_talent():
            reset_url = f"{base_url}/talents/reset-password/?uid={uid}&token={token}"
        elif user.is_company():
            reset_url = f"{base_url}/startups/reset-password/?uid={uid}&token={token}"
        else:
            reset_url = f"{base_url}/admin/reset-password/?uid={uid}&token={token}"

        context = {
            "email": user.email,
            "reset_url": reset_url,
        }
        EmailHandler(user.email).send_mail(
            subject="Reset your password",
            context=context,
            template="emails/password_reset.html",
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
    pagination_class = TiaagoPagination

    def list(self, request):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CustomUserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
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
    pagination_class = TiaagoPagination
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
    pagination_class = TiaagoPagination

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
    pagination_class = TiaagoPagination

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


class CompanyOnboardingAPIView(APIView):
    """Status, per-card saves, and completion for company onboarding cards."""

    permission_classes = [IsAuthenticated]

    def _get_company(self, request):
        company = getattr(request.user, "company", None)
        if company is None:
            raise NotFound("No company profile found for this user.")
        return company

    def get(self, request):
        company = self._get_company(request)
        serializer = CompanyOnboardingSerializer(company)
        return Response(serializer.data)

    def patch(self, request):
        company = self._get_company(request)
        serializer = CompanyOnboardingSerializer(
            company, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        company = serializer.save()

        update_fields = []
        # "complete": true marks onboarding as finished — the cards never
        # show again. "skip": true only defers it: the dashboard stops
        # force-redirecting but the flow stays open for resuming later.
        if request.data.get("complete") and company.onboarding_completed_at is None:
            company.onboarding_completed_at = now()
            update_fields.append("onboarding_completed_at")
        if request.data.get("skip") and company.onboarding_skipped_at is None:
            company.onboarding_skipped_at = now()
            update_fields.append("onboarding_skipped_at")
        if update_fields:
            company.save(update_fields=update_fields)

        return Response(CompanyOnboardingSerializer(company).data)


class CompanyTeamListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = CompanyTeamMember.objects.filter(user=request.user).first()
        if not membership:
            company = Company.objects.filter(company_rep=request.user).first()
            if not company:
                return Response({"detail": "Not a team member of any company."}, status=status.HTTP_403_FORBIDDEN)
            membership = CompanyTeamMember.objects.create(
                company=company, user=request.user, role=CompanyTeamMember.ROLE.ADMIN
            )

        company = membership.company
        members = CompanyTeamMember.objects.filter(company=company).select_related("user", "invited_by")
        invites = CompanyTeamInvite.objects.filter(company=company, status=CompanyTeamInvite.STATUS_PENDING).select_related("invited_by")

        return Response({
            "members": CompanyTeamMemberSerializer(members, many=True).data,
            "invites": CompanyTeamInviteSerializer(invites, many=True).data,
            "company_id": company.id,
            "user_role": membership.role,
        })


class CompanyTeamRoleAPIView(APIView):
    """Lightweight endpoint that returns just the user's team role."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = CompanyTeamMember.objects.filter(user=request.user).first()
        if not membership:
            company = Company.objects.filter(company_rep=request.user).first()
            if not company:
                return Response({"role": None}, status=status.HTTP_200_OK)
            membership = CompanyTeamMember.objects.create(
                company=company, user=request.user, role=CompanyTeamMember.ROLE.ADMIN
            )
        return Response({"role": membership.role}, status=status.HTTP_200_OK)


class CompanyTeamInviteCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Ensure inviter is a company admin and derive the company from their membership
        membership = CompanyTeamMember.objects.filter(user=request.user).first()
        if not membership:
            company = Company.objects.filter(company_rep=request.user).first()
            if company:
                membership = CompanyTeamMember.objects.create(
                    company=company, user=request.user, role=CompanyTeamMember.ROLE.ADMIN
                )
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
            # Upgrade user_type if currently a talent
            if request.user.user_type == CustomUser.USER_TYPE.TALENT:
                request.user.user_type = CustomUser.USER_TYPE.COMPANY_REP
                request.user.save(update_fields=["user_type"])
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