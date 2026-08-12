from django.urls import path, include
from rest_framework.routers import DefaultRouter


from .views import (
    SubPlanListAPIView,
    SubPlanListForMeAPIView,
    SubPlanDetailAPIView,
    FlutterwavePaymentCallbackView,
    PaystackPaymentCallbackView,
    PaystackPlanViewSet,
    PaystackSubscriptionAPIView,
    PaystackSubscriptionViewSet,
    PaystackPlanListRetrieveViewSet,
    PaystackFreePlanViewSet,
    handle_webhook_event,
    
    # stripe
    create_stripe_subscription_plan,
    StripePlanPriceRetreiveViewSet,
    create_stripe_checkout_session,
    StripeSubscriptionViewSet,
    stripe_webhook,
    FundWalletView,
    WalletTopupStatusView,
    WalletTransactionViewSet,
    paystack_wallet_fund_webhook,
    stripe_wallet_fund_webhook,
    bachs_wallet_fund_webhook,
    get_wallet_balance,
    update_wallet_settings,
    export_wallet_transactions_csv,
    PricingConfigListView,
    PricingConfigUpdateView,
    PlatformSettingListView,
    PlatformSettingUpdateView,
    FreePlanViewSet,
    SubscriptionTransactionViewSet,
    get_user_usage,
    get_wallet_usage,
    free_plan_subscription,
)

router = DefaultRouter()
router.register(r'paystack-plans', PaystackPlanListRetrieveViewSet, basename='paystack-plan')
router.register(r'paystack-subscriptions', PaystackSubscriptionViewSet, basename='paystack-subscription')
router.register(r'stripe-plan-prices', StripePlanPriceRetreiveViewSet, basename='stripe-plan-price')
router.register(r'stripe-subscriptions', StripeSubscriptionViewSet, basename='stripe-subscription')
router.register(r'wallet-transactions', WalletTransactionViewSet, basename='wallet-transaction')
router.register(r'free-plans', FreePlanViewSet, basename='free-plan')
router.register(r'subscription-transactions', SubscriptionTransactionViewSet, basename='subscription-transaction')
# router.register(r'user-usage', UserUsageViewSet, basename='user-usage')


urlpatterns = [
    path("sub_plan/", SubPlanListAPIView.as_view(), name='sub_plan_list'),
    path("sub_plan/for-me/", SubPlanListForMeAPIView.as_view(), name='sub_plan_for_me'),
    path("sub_plan/<int:pk>/", SubPlanDetailAPIView.as_view(), name='sub_plan_detail'),
    path("paystack-payment-callback/", PaystackPaymentCallbackView.as_view(), name='paystack-payment-callback'),
    path('flutterwave-payment-callback/', FlutterwavePaymentCallbackView.as_view(), name='flutterwave-payment-callback'),
    path('paystack-webhook/', handle_webhook_event, name='paystack-webhook'),
    path('paystack-plans-create/', PaystackPlanViewSet.as_view({'post': 'create'}), name='paystack-plan-create'),
    path('paystack/subscriptions/', PaystackSubscriptionAPIView.as_view(), name='paystack-subscription'),
    path('subscription-free-plans/', PaystackFreePlanViewSet.as_view(), name='subscription-free-plans'),
    path('create-stripe-subscription-plan/', create_stripe_subscription_plan, name='create-stripe-subscription-plan'),
    path('create-stripe-checkout-session/', create_stripe_checkout_session, name='create-stripe-checkout-session'),
    path('stripe-webhook/', stripe_webhook, name='stripe-webhook'),
    path('fund-wallet/', FundWalletView.as_view(), name='fund-wallet'),
    path('topup/<uuid:topup_id>/status/', WalletTopupStatusView.as_view(), name='wallet-topup-status'),
    path('paystack-wallet-fund-webhook/', paystack_wallet_fund_webhook, name='paystack-wallet-fund-webhook'),
    path('stripe-wallet-fund-webhook/', stripe_wallet_fund_webhook, name='stripe-wallet-fund-webhook'),
    path('bachs-wallet-fund-webhook/', bachs_wallet_fund_webhook, name='bachs-wallet-fund-webhook'),
    path('get-wallet-balance/', get_wallet_balance, name='get-wallet-balance'),
    path('wallet-settings/', update_wallet_settings, name='update-wallet-settings'),
    path('wallet-transactions/export/', export_wallet_transactions_csv, name='export-wallet-transactions'),
    path('pricing-config/', PricingConfigListView.as_view(), name='pricing-config-list'),
    path('pricing-config/<str:key>/', PricingConfigUpdateView.as_view(), name='pricing-config-update'),
    path('platform-settings/', PlatformSettingListView.as_view(), name='platform-settings-list'),
    path('platform-settings/<str:key>/', PlatformSettingUpdateView.as_view(), name='platform-settings-update'),
    path('get-user-usage/', get_user_usage, name='get-user-usage'),
    path('get-wallet-usage/', get_wallet_usage, name='get-wallet-usage'),
    path('free-plan-subscription/', free_plan_subscription, name='free-plan-subscription'),
    path('', include(router.urls)),
]