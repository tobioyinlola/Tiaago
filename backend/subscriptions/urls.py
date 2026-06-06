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
    WalletTransactionViewSet,
    paystack_wallet_fund_webhook,
    stripe_wallet_fund_webhook,
    get_wallet_balance,
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
    path('paystack-wallet-fund-webhook/', paystack_wallet_fund_webhook, name='paystack-wallet-fund-webhook'),
    path('stripe-wallet-fund-webhook/', stripe_wallet_fund_webhook, name='stripe-wallet-fund-webhook'),
    path('get-wallet-balance/', get_wallet_balance, name='get-wallet-balance'),
    path('get-user-usage/', get_user_usage, name='get-user-usage'),
    path('get-wallet-usage/', get_wallet_usage, name='get-wallet-usage'),
    path('free-plan-subscription/', free_plan_subscription, name='free-plan-subscription'),
    path('', include(router.urls)),
]