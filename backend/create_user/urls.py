from django.urls import include, path
from dj_rest_auth.views import (
    LoginView,
    LogoutView,
    PasswordChangeView,
    UserDetailsView,
)
#from dj_rest_auth.registration.views import VerifyEmailView
from .views import (
    AdminVerifyUserView,
    ConfirmEmailView,
    CustomRegisterView,
    CustomPasswordResetView,
    CustomPasswordResetConfirmView,
    CustomResendEmailVerificationView,
    RetrieveReferralCodeAPIView,
    UserListView,
    UserProfileView,
    # VerificationSentView,
    CompanyListView,
    TalentListView,
    ResendOtpView,
    ReferralTrackingAPIView,
    SendReferralMailAPIView,
    TalentProfileStatusAPIView,
    GenerateReferralCodeAPIView,
    CompanyOnboardingAPIView,
    CompanyTeamInviteCreateAPIView,
    ComapnayTeamInviteValidateAPIView,
    CompanyTeamInviteAcceptAPIView,
    CompanyTeamInvieResendAPIView,
    CompanyTeamInviteRequestNewAPIView,
    CompanyTeamInviteRevokeAPIView,
    CompanyTeamMemberRemoveAPIView,
    ReferralRewardViewSet,
    AdminReferralWithdrawalViewSet,
)

from rest_framework import routers

router = routers.DefaultRouter()

router.register("referral-rewards", ReferralRewardViewSet, basename="referral-rewards")
router.register("admin/referral-withdrawals", AdminReferralWithdrawalViewSet, basename="admin-referral-withdrawals")




urlpatterns = [
    # URLs for registration and registration verification
    path("register/", CustomRegisterView.as_view(), name="rest_register"),
    path(
        "resend-email/",
        CustomResendEmailVerificationView.as_view(),
        name="rest_resend_email",
    ),
    path("verify-email/", ConfirmEmailView.as_view(), name="rest_verify_email"),
    # path(
    #     "account-confirm-email/<str:key>/",
    #     ConfirmEmailView.as_view(),
    #     name="account_confirm_email"
    # ),
    path(
        "account-confirm-email/",
        ConfirmEmailView.as_view(),
        name="account_confirm_email",
    ),
    # path(
    #     "account-email-verification-sent/",
    #     VerificationSentView.as_view(),
    #     name="account_email_verification_sent"
    # ),
    path("resend-otp/", ResendOtpView.as_view(), name="resend_otp"),
    # # URLs that do not require a session or valid token
    path("password/reset/", CustomPasswordResetView.as_view(), name="password_reset"),
    path(
        "password/reset/confirm/<uidb64>/<token>/",
        CustomPasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path("login/", LoginView.as_view(), name="login"),
    # URLs that require a user to be logged in with a valid session / token.
    path("logout/", LogoutView.as_view(), name="logout"),
    path("password/change/", PasswordChangeView.as_view(), name="password_change"),
    path("users/me", UserDetailsView.as_view(), name="user_details"),
    path("users/profile", UserProfileView.as_view(), name="user_profile"),
    path("all-users/", UserListView.as_view(), name="user_list"),
    path("all-talents/", TalentListView.as_view(), name="talents_list"),
    path("all-companies/", CompanyListView.as_view(), name="companies_list"),
    path(
        "verify-user/<int:user_id>/",
        AdminVerifyUserView.as_view(),
        name="admin_verify_user",
    ),
    path(
        "referrals/referral-code/generate/",
        GenerateReferralCodeAPIView.as_view(),
        name="generate-referral-code",
    ),
    path(
        "referrals/referral-code/",
        RetrieveReferralCodeAPIView.as_view(),
        name="get-referral-code",
    ),
    path(
        "referrals/tracking/",
        ReferralTrackingAPIView.as_view(),
        name="referral_tracking",
    ),
    path(
        "referrals/send-invite-link/",
        SendReferralMailAPIView.as_view(),
        name="send_invite_link",
    ),
    # Company team invites
    path("companies/invite/", CompanyTeamInviteCreateAPIView.as_view(), name="company_invite_create"),
    path("invite/validate/<uuid:token>/", ComapnayTeamInviteValidateAPIView.as_view(), name="company_invite_validate"),
    path("invite/accept/<uuid:token>/", CompanyTeamInviteAcceptAPIView.as_view(), name="company_invite_accept"),
    path("invite/resend/<int:invite_id>/", CompanyTeamInvieResendAPIView.as_view(), name="company_invite_resend"),
    path("invite/request-new/<uuid:token>/", CompanyTeamInviteRequestNewAPIView.as_view(), name="company_invite_request_new"),
    path("invite/revoke/<int:invite_id>/", CompanyTeamInviteRevokeAPIView.as_view(), name="company_invite_revoke"),
    path("companies/<int:company_id>/team/<int:member_id>/remove/", CompanyTeamMemberRemoveAPIView.as_view(), name="company_member_remove"),
    path(
        "verify-user/<int:user_id>/",
        AdminVerifyUserView.as_view(),
        name="admin_verify_user",
    ),
    path(
        "talent-profile-status",
        TalentProfileStatusAPIView.as_view(),
        name="talent_profile_status",
    ),
    path(
        "company-onboarding/",
        CompanyOnboardingAPIView.as_view(),
        name="company_onboarding",
    ),
]

urlpatterns += router.urls