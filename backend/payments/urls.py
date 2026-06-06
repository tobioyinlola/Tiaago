from django.urls import path

from .views import (
    CreateWalletAPIView,
    FundWalletAPIView,
    PaymentCreateAPIView,
    PaymentListApiView,
    PaystackPaymentCallbackView,
    CardRecurrentCallbackView,
    InitializeAndVerifyCard,
    CompleteCardAuthorization,
    ChargeAndVerifyCard,
    ApprovePaymentView,
    TalentRecipientCodeView,
    TalentPayoutView,
    PaystackWebhookView,
    TalentPendingPaymentsView,
    TalentWithdrawalHistoryView,
    PricingCreateView,
    PricingListView,
    SetupIntentCreateView,
    PaymentMethodListCreateView,
    DeletePaymentMethodView,
    SetDefaultPaymentMethodView,
    TestUsageReportView,
    InvoiceListView,
    stripe_webhook,
    UsageEventListView,
    UsageEventDetailView,
    PaystackPaymentMethodCreateView,
    UpcomingInvoiceView,
    paystack_webhook,
    CouponViewSet,
    CommunityViewSet,
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("coupons", CouponViewSet, basename="coupon")
router.register("communities", CommunityViewSet, basename="community")

urlpatterns = [
    path("upcoming-invoice/",UpcomingInvoiceView.as_view(),name="upcoming-invoice",),
    path('paystack-payment-method/', PaystackPaymentMethodCreateView.as_view(), name='paystack-payment-method'),
    path('payg-usage/', UsageEventListView.as_view(), name='usage-list'),
    path('payg-usage/<int:pk>/', UsageEventDetailView.as_view(), name='usage-detail'),
    path('stripe-webhook/', stripe_webhook, name='stripe-webhook'),
    path('paystack-webhook/', paystack_webhook, name='paystack-webhook'),
    path('payg-invoices/', InvoiceListView.as_view(), name='invoice-list'),
    path('payments/test-usage/', TestUsageReportView.as_view(), name='test-usage'),#to test
    path('pricing/create/', PricingCreateView.as_view(), name='pricing-create'),
    path('payment-method/<int:pk>/delete/', DeletePaymentMethodView.as_view(), name='delete-payment-method'),
    path('payment-method/<int:pk>/set-default/', SetDefaultPaymentMethodView.as_view(), name='set-default-payment-method'),
    path('payment-methods/',PaymentMethodListCreateView.as_view(), name='payment-method-list'),
    path('setup-intent/', SetupIntentCreateView.as_view(), name='setup-intent-create'),
    path('pricing/', PricingListView.as_view(), name='pricing-list'),
    path("initialize/", PaymentCreateAPIView.as_view(), name="payment-create"),
    path("invoice/", PaymentListApiView.as_view(), name="payment-invoice"),
    path("wallet/create-wallet/", CreateWalletAPIView.as_view(), name="create_wallet"),
    path("wallet/fund-wallet/", FundWalletAPIView.as_view(), name="fund_wallet"),
    path(
        "wallet/paystack-payments-callback/",
        PaystackPaymentCallbackView.as_view(),
        name="paystack-payments-callback",
    ),
    path(
        "wallet/paystack-recurrent-callback/",
        CardRecurrentCallbackView.as_view(),
        name="paystack-recurrent-callback",
    ),
    path(
        "wallet/cards/initialize-verify/",
        InitializeAndVerifyCard.as_view(),
        name="initialize_and_verify_card",
    ),
    path(
        "wallet/cards/complete-authorization/",
        CompleteCardAuthorization.as_view(),
        name="complete_card_authorization",
    ),
    path(
        "wallet/cards/charge-verify/",
        ChargeAndVerifyCard.as_view(),
        name="charge_and_verify_card",
    ),
    path(
        "wallet/cards/charge-verify-card-celery/",
        ChargeAndVerifyCard.as_view(),
        name="charge_and_verify_card",
    ),
    path(
        "wallet/transactions/<int:transaction_id>/approve/",
        ApprovePaymentView.as_view(),
        name="approve_payment",
    ),
    path(
        "wallet/talent/recipient-code/",
        TalentRecipientCodeView.as_view(),
        name="talent_transfer_recipient_code",
    ),
    path("wallet/talent/payout/", TalentPayoutView.as_view(), name="talent_payout"),
    path(
        "wallet/webhook/paystack/",
        PaystackWebhookView.as_view(),
        name="paystack_webhook",
    ),
    path(
        "wallet/talent/pending-payments/",
        TalentPendingPaymentsView.as_view(),
        name="talent-pending-payments",
    ),
    path(
        "wallet/talent/withdrawal-history/",
        TalentWithdrawalHistoryView.as_view(),
        name="talent-withdrawal-history",
    ),
]

urlpatterns += router.urls
