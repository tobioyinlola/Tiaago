import requests
from urllib.parse import urlparse
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from paystackapi.transaction import Transaction
from rest_framework import generics
from rest_framework import permissions
from rest_framework import status
from rest_framework.views import APIView
from rest_framework import mixins, viewsets
from rest_framework.response import Response
from subscriptions.permissions import IsCompanyRepOrTalentUser
from payments.models import Payment
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from utils.paystack_sub_handler import PayStackSubscriptionHandler
import logging
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
import csv
from .permissions import IsUserVerified
import hmac
import hashlib
import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from decimal import Decimal
from django.db.models import Sum
from base.mixins.pagination import TiaagoPagination


from .models import (
    SubPlan,
    Subscription,
    PaystackPlan,
    PaystackSubscription,
    SubscriptionTransaction,
    PaystackWebhookLog,
    StripePlanPrice,
    StripeSubscription,
    WalletTransaction,
    Wallet,
    WalletTopup,
    PricingConfig,
    FreePlan,
    UserUsage,
    WalletUserUsage,
    CandidateBillingRecord,
)
from .serializers import (
    SubPlanSerializer,
    PaystackPlanSerializer,
    PaystackSubscriptionSerializer,
    PaystackSubscriptionModelSerializer,
    StripePlanPriceSerializer,
    StripeSubscriptionSerializer,
    UsageBaseWalletTransactionSerializer,
    FreePlanSerializer,
    UserUsageSerializer,
    SubscriptionTransactionSerializer,
)
from .helper import determine_plan_usage, determine_free_plan_usage, get_pricing_decimal, get_action_price, COUNTRY_CURRENCY_MAP
from emails import emails
from utils.stripe_sub_handler import create_stripe_product_price, create_checkout_session, stripe_api_key, fund_wallet_stripe
import stripe
from create_user.models import Company
from create_user.permissions import get_user_company
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from staff.permissions import requirePermission

User = get_user_model()
stripe.api_key = stripe_api_key

# Configure logger at the top of your file
logger = logging.getLogger(__name__)


def _wallet_url():
    return f"{str(settings.FRONTEND_URL).rstrip('/')}/recruiter/dashboard/billing"


def _is_allowed_redirect_url(url: str) -> bool:
    """Anti-open-redirect check for client-supplied Stripe success_url values.

    A strict string-prefix match against FRONTEND_URL is fragile: the
    frontend's own BASE_URL constant falls back to the apex domain
    (https://tiaago.com) while FRONTEND_URL falls back to the www
    subdomain (https://www.tiaago.com/), so a same-site redirect could get
    rejected as "invalid" purely over a www/non-www or trailing-slash
    difference. Compare parsed scheme+host (treating a leading "www." as
    equivalent on both sides) instead of raw string prefixes -- still
    rejects any other host, just not brittle same-site variations.
    """
    try:
        target = urlparse(url)
        allowed = urlparse(str(settings.FRONTEND_URL))
    except ValueError:
        return False

    if target.scheme not in ("http", "https") or not target.netloc:
        return False

    target_host = target.hostname or ""
    allowed_host = allowed.hostname or ""
    return (
        target.scheme == allowed.scheme
        and target_host.removeprefix("www.") == allowed_host.removeprefix("www.")
    )

class SubPlanListAPIView(generics.ListCreateAPIView):
    queryset = SubPlan.objects.all()
    serializer_class = SubPlanSerializer
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.request.method in permissions.SAFE_METHODS:
            permission_classes = [permissions.AllowAny]
        elif self.request.method == "POST":
            permission_classes = [requirePermission("revenue.manage")]
        else:
            permission_classes = self.permission_classes

        return [permission() for permission in permission_classes]

class SubPlanListForMeAPIView(generics.ListAPIView):
    queryset = SubPlan.objects.all()
    serializer_class = SubPlanSerializer
    permission_classes = [IsCompanyRepOrTalentUser]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.is_talent() and user.country == 'Nigeria':
            queryset = queryset.filter(user_type=User.USER_TYPE.TALENT, currency='NGN')
        elif user.is_talent and not user.country == 'Nigeria':
            queryset = queryset.filter(user_type=User.USER_TYPE.TALENT, currency='USD')
        elif user.is_company() and user.country == 'Nigeria':
            queryset = queryset.filter(user_type=User.USER_TYPE.COMPANY_REP, currency='NGN')
        elif user.is_company() and not user.country == 'Nigeria':
            queryset = queryset.filter(user_type=User.USER_TYPE.COMPANY_REP, currency='USD')
        
        return queryset
        

class SubPlanDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SubPlan.objects.all()
    serializer_class = SubPlanSerializer
    permission_classes = [requirePermission("revenue.manage")]

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.request.method in permissions.SAFE_METHODS:
            permission_classes = [permissions.AllowAny]
        elif self.request.method in ["PUT", "PATCH","DELETE"]:
            permission_classes = [requirePermission("revenue.manage")]
        else:
            permission_classes = self.permission_classes

        return [permission() for permission in permission_classes]

class PaystackPaymentCallbackView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        # verify payment status with Paystack
        transaction_reference = request.query_params.get('reference')
        url = f"https://api.paystack.co/transaction/verify/{transaction_reference}"
        headers = {
                "Authorization": f"Bearer {settings.PAYSTACK_PRIVATE_KEY}",
                'Content-Type' : 'application/json',
                }
        x = requests.get(url, headers=headers)
        response = x.json()

        payment = Payment.objects.get(ref=transaction_reference)

        try:
            if response['data']['status'] == 'success':
                # update subscription status
                payment.status = response['data']['status']
                payment.save()
                
                subscription = Subscription.objects.create(
                    user=payment.user,
                    sub_plan_id=payment.plan_id,
                    transaction_reference=transaction_reference,
                )
                subscription.status = response['data']['status']
                subscription.start_date = timezone.now()
                subscription.save()

                return Response({'status': 'success'}, status=status.HTTP_201_CREATED)
            
            else:
                return Response({'status': 'failed'}, status=status.HTTP_400_BAD_REQUEST)
        except:
            return Response({'status': 'failed'}, status=status.HTTP_400_BAD_REQUEST)

class FlutterwavePaymentCallbackView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        # verify payment status with Flutterwave
        tx_ref = request.query_params.get('tx_ref')
        transaction_id = request.query_params.get('transaction_id')
        payment_status = request.query_params.get('status')

        response = requests.get(f'https://api.flutterwave.com/v3/transactions/{transaction_id}/verify', headers={
            'Authorization': f'Bearer {settings.FLW_SEC_KEY}'
        })
        response = response.json()
        print(response)

        if (
            response['status'] == "success"
            and response['data']['tx_ref']== tx_ref
            and response['data']['currency'] == "USD"
        ):
            payment = Payment.objects.get(ref=tx_ref)
            payment.status = response['status']
            payment.save()

            subscription = Subscription.objects.create(
                    user=payment.user,
                    sub_plan_id=payment.plan_id,
                    transaction_reference=tx_ref,
                )
            subscription.status = response['status']
            subscription.start_date = timezone.now()
            subscription.save()

            return Response({'status': 'success'}, status=status.HTTP_201_CREATED)
            
        else:
                return Response({'status': 'failed'}, status=status.HTTP_400_BAD_REQUEST)
            

#Paystack Plan and Subscription Views
class  PaystackPlanViewSet(
    mixins.CreateModelMixin,
    viewsets.GenericViewSet
):
    """
    ViewSet for managing Paystack Plans.
    """
    queryset = PaystackPlan.objects.all()
    serializer_class = PaystackPlanSerializer
    permission_classes = [IsAuthenticated, requirePermission("revenue.manage")]
    
    def perform_create(self, serializer):
        instance = serializer.save()
        
        # Create a paystack plan
        paystack_handler = PayStackSubscriptionHandler()
        
        # free plans do not get a plan code from paystack
        if instance.amount == 0:
            instance.plan_code = f"FREE-{instance.created_at.strftime('%Y%m%d%H%M%S')}"
            instance.save(update_fields=["plan_code"])
            logger.debug(f"Free Paystack plan created successfully: {instance.plan_code}")
        else:
            response = paystack_handler.create_plan(
                name=instance.name,
                interval=instance.interval,
                amount=instance.amount,
            )
            
            if response and response.get("status") and response.get("data"):
                plan_code = response["data"].get("plan_code")
                
                if not plan_code:
                    raise ValidationError("Paystack did not return a valid plan code.")
                
                instance.plan_code = plan_code
                instance.save(update_fields=["plan_code"])
                logger.debug(f"Paystack plan created successfully: {plan_code}")
            else:
                logger.error(f"Failed to create Paystack plan for {instance.name}: {response}")
                raise ValidationError("Failed to create plan on Paystack.")


# List and Retrieve plans created by the admin
class PaystackPlanListRetrieveViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """
    List and Retrieve plans created by admin
    """
    queryset = PaystackPlan.objects.all()
    serializer_class = PaystackPlanSerializer
    permission_classes = [AllowAny]


# Free plan viewset
class PaystackFreePlanViewSet(APIView):
    """
    ViewSet for free subscription
    """
    permission_classes = [IsAuthenticated, IsUserVerified]
    serializer_class = PaystackSubscriptionSerializer
    
    def post(self, request):
        print(request.user, request.user.is_authenticated)
        user = request.user
        free_plan = PaystackPlan.objects.filter(amount=0).first()
        
        if not free_plan:
            return Response({'error': 'No free plan available'}, status=status.HTTP_404_NOT_FOUND)
        
        plan_name = free_plan.name
        plan_interval = free_plan.interval

        plan_usage = determine_free_plan_usage(plan_name, plan_interval)

        # Create a subscription record for the free plan
        PaystackSubscription.objects.update_or_create(
            user=user,
            defaults={
                'plan': free_plan,
                'subscription_code': f"FREE-{user.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}",
                'status': 'active',
                'next_payment_date': None,
                'resume_limit': plan_usage["resume_limit"],
                'assessment_limit': plan_usage["assessment_limit"],
            }
        )
        
        logger.debug(f"Free subscription created successfully for user {user.email}")
        return Response({'status': 'free subscription created'}, status=status.HTTP_201_CREATED)

# Endpoint to create subscription plan for a user
class PaystackSubscriptionAPIView(APIView):
    """
    ViewSet for managing Paystack Subscriptions.
    """
    permission_classes = [IsAuthenticated, IsUserVerified]
    serializer_class = PaystackSubscriptionSerializer
    
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = request.user.email
        plan_code = serializer.validated_data.get('plan_code')
        
        # validate plan code
        plan = PaystackPlan.objects.filter(plan_code=plan_code).first()        
        if not plan:
            return Response({'error': 'Invalid plan code'}, status=status.HTTP_400_BAD_REQUEST)

        amount = plan.amount
        paystack_handler = PayStackSubscriptionHandler()
        response = paystack_handler.create_subscription(
            customer_email=email,
            plan_code=plan_code,
            amount=amount,
        )
        
        if response.get("status") and response.get("data"):
            data = {
                "authorization_url": response["data"].get("authorization_url"),
                "access_code": response["data"].get("access_code"),
                "reference": response["data"].get("reference"),
            }
            logger.debug(f"Subscription created successfully for user {email}")
            return Response({'status': 'subscription created', 'data': data}, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Failed to create subscription for user {email}")
            return Response({'error': 'Failed to create subscription'}, status=status.HTTP_400_BAD_REQUEST)
    

# Viewset for free tiers 
class FreePlanViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """
    ViewSet for managing Free Plans.
    """
    queryset = FreePlan.objects.all()
    serializer_class = FreePlanSerializer
    permission_classes = [IsAuthenticated, requirePermission("revenue.manage")]


# subscription history 
class SubscriptionTransactionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """
    ViewSet for managing Subscription Transactions.
    """
    queryset = SubscriptionTransaction.objects.all()
    serializer_class = SubscriptionTransactionSerializer
    permission_classes = [IsAuthenticated, IsUserVerified]
    pagination_class = TiaagoPagination

    def get_queryset(self):
        company = get_user_company(self.request.user)
        if company:
            return self.queryset.filter(company=company).order_by("-created_at")
        return self.queryset.none()
        

# User usage viewset
# class UserUsageViewSet(
#     mixins.ListModelMixin,
#     mixins.RetrieveModelMixin,
#     viewsets.GenericViewSet
# ):
#     """
#     ViewSet for managing User Usage.
#     """
#     queryset = UserUsage.objects.all()
#     serializer_class = UserUsageSerializer
#     permission_classes = [IsAuthenticated, IsUserVerified]


# subscribe user to free plan endpoint
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsUserVerified])
def free_plan_subscription(request):
    user = request.user
    company = get_user_company(user)
    if not company:
        return Response({'error': 'No company associated'}, status=status.HTTP_403_FORBIDDEN)
    
    # check if the active subscription for any of the paid plan
    stripe_active_subscription = StripeSubscription.objects.filter(company=company).order_by("-started_at").first()
    if stripe_active_subscription and stripe_active_subscription.status == "active":
        stripe_active_subscription.status = "inactive"
        stripe_active_subscription.cancelled_at = timezone.now()
        stripe_active_subscription.save(update_fields=['status', 'cancelled_at'])
    
    paystack_active_subscription = PaystackSubscription.objects.filter(company=company).order_by("-started_at").first()
    if paystack_active_subscription and paystack_active_subscription.status == "active":
        paystack_active_subscription.status = "inactive"
        paystack_active_subscription.cancelled_at = timezone.now()
        paystack_active_subscription.save(update_fields=['status', 'cancelled_at'])
    
    # subscribe user to free plan
    FreePlan.objects.update_or_create(
        company=company,
        defaults={
            "company_email": user.email,
            "end_at": timezone.now() + relativedelta(months=1),
        }
    )
    
    return Response({'status': 'subscribed to free plan'}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsUserVerified])
def get_user_usage(request):
    user = request.user
    company = get_user_company(user)
    if not company:
        return Response({'error': 'No company associated'}, status=status.HTTP_403_FORBIDDEN)

    usage = UserUsage.objects.filter(company=company).first()

    subscription = company.active_subscription
    if subscription is None:
        return Response({'error': 'No active subscription found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Ensure cycle auto-reset logic runs if usage exists
    if usage:
        subscription.check_and_update_cycle()
    
    # Defaults if usage doesn't exist
    resumes_used = usage.resumes_used if usage else 0
    assessments_used = usage.assessments_used if usage else 0

    resume_limit = subscription.resume_limit
    assessment_limit = subscription.assessment_limit

    return Response({
        "user": user.email,

        "resume_limit": resume_limit,
        "assessment_limit": assessment_limit,

        "resumes_used": resumes_used,
        "assessments_used": assessments_used,

        "resume_remaining": resume_limit - resumes_used,
        "assessment_remaining": assessment_limit - assessments_used,
        
    }, status=status.HTTP_200_OK)


# ViewSet for Paystack Subscriptions (Admin Only)
class PaystackSubscriptionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """
    ViewSet for managing Paystack Subscriptions.
    """
    queryset = PaystackSubscription.objects.all()
    serializer_class = PaystackSubscriptionModelSerializer
    permission_classes = [IsAuthenticated, requirePermission("revenue.manage")]
    pagination_class = TiaagoPagination


# View set to create stripe subscription price plan
@api_view(['POST'])
@permission_classes([IsAuthenticated, requirePermission("revenue.manage")])
def create_stripe_subscription_plan(request):
    serializer = StripePlanPriceSerializer(data=request.data)
    
    if serializer.is_valid():
        name = serializer.validated_data.get('name')
        description = serializer.validated_data.get('description', '')
        currency = serializer.validated_data.get('currency', 'usd')
        unit_amount = serializer.validated_data.get('unit_amount', 0)
        recurring_interval = serializer.validated_data.get('recurring_interval', 'month')
        
        try:
            price = create_stripe_product_price(
                name=name,
                description=description,
                currency=currency,
                unit_amount=unit_amount,
                recurring_interval=recurring_interval
            )
            
            if price:
                # check if strip price_id exist in our db
                stripe_price_id = price.id
                existing_price = StripePlanPrice.objects.filter(price_id=stripe_price_id).first()
                if existing_price:
                    return Response({'error': 'Stripe price with this price_id already exists.'}, status=status.HTTP_400_BAD_REQUEST)
                
                stripe_plan_price = StripePlanPrice.objects.create(
                    name=name,
                    description=description,
                    price_id=stripe_price_id,
                    currency=currency,
                    unit_amount=unit_amount,
                    recurring_interval=recurring_interval
                )
                logger.debug(f"Stripe plan price created successfully: {stripe_price_id}")
                return Response({'status': 'Stripe plan price created', 'data': StripePlanPriceSerializer(stripe_plan_price).data}, status=status.HTTP_201_CREATED)
            else:
                logger.error("Failed to create Stripe plan price.")
                return Response({'error': 'Failed to create Stripe plan price.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating Stripe plan price: {e}")
            return Response({'error': 'Error creating Stripe plan price.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# list and retrieve plans created
class StripePlanPriceRetreiveViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """
    List and Retrieve Stripe plans created
    """
    queryset = StripePlanPrice.objects.all()
    serializer_class = StripePlanPriceSerializer
    permission_classes = [AllowAny]


# Stripe checkout session creation view
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsUserVerified])
def create_stripe_checkout_session(request):
    price_id = request.data.get('price_id')
    success_url = request.data.get('success_url')
    
    if not price_id or not success_url:
        return Response({'error': 'price_id and success_url are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not _is_allowed_redirect_url(success_url):
        logger.warning(
            "Rejected success_url %r for subscription checkout -- does not match FRONTEND_URL %r",
            success_url, settings.FRONTEND_URL,
        )
        return Response({'error': 'Invalid success_url.'}, status=status.HTTP_400_BAD_REQUEST)

    # create checkout session
    try:
        session = create_checkout_session(
            price_id=price_id,
            success_url=success_url,
            customer_email=request.user.email
        )
        
        if session:
            logger.debug(f"Stripe checkout session created successfully for user {request.user.email}")
            return Response({'status': 'checkout session created', 'data': {'session_id': session.id, 'checkout_url': session.url}}, status=status.HTTP_201_CREATED)
        else:
            logger.error("Failed to create Stripe checkout session.")
            return Response({'error': 'Failed to create checkout session.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error creating Stripe checkout session: {e}")
        return Response({'error': 'Error creating checkout session.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ViewSet for Stripe Subscriptions (Admin Only)
class StripeSubscriptionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """
    ViewSet for managing Stripe Subscriptions.
    """
    queryset = StripeSubscription.objects.all()
    serializer_class = StripeSubscriptionSerializer
    permission_classes = [IsAuthenticated, requirePermission("revenue.manage")]
    pagination_class = TiaagoPagination

    
# Paystack or Stripe funding of wallet
class FundWalletView(APIView):
    permission_classes = [IsAuthenticated, IsUserVerified]
    
    def post(self, request):
        provider = request.data.get('provider')
        amount = request.data.get('amount')
        success_url = request.data.get('success_url')

        if not provider or not amount or not success_url:
            return Response({'error': 'provider, amount, and success_url are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # success_url is client-supplied and handed straight to Stripe as the
        # post-payment redirect target -- without pinning it to our own
        # origin, this is an open redirect (attacker gets a legitimate
        # Stripe checkout page for the victim, then redirects them to a
        # phishing page after a real payment succeeds).
        if not _is_allowed_redirect_url(success_url):
            logger.warning(
                "Rejected success_url %r for wallet funding -- does not match FRONTEND_URL %r",
                success_url, settings.FRONTEND_URL,
            )
            return Response({'error': 'Invalid success_url.'}, status=status.HTTP_400_BAD_REQUEST)

        company = get_user_company(request.user)
        if not company:
            return Response({'error': 'No company associated with this account.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            amount_decimal = Decimal(str(amount))
        except Exception:
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        min_key = "minimum_topup_usd" if provider == "stripe" else "minimum_topup_ngn"
        minimum = get_pricing_decimal(min_key, "10.00" if provider == "stripe" else "5000.00")
        if amount_decimal < minimum:
            return Response(
                {'error': f'Minimum top-up amount is {minimum}.'}, status=status.HTTP_400_BAD_REQUEST
            )

        wallet, _ = Wallet.objects.get_or_create(
            company=company, defaults={"currency": COUNTRY_CURRENCY_MAP.get(company.country, "USD")}
        )

        if provider == 'stripe':
            # create checkout session
            try:
                session = fund_wallet_stripe(
                    amount=amount,
                    success_url=success_url,
                    customer_email=request.user.email
                )

                if session:
                    WalletTopup.objects.create(
                        wallet=wallet, organisation=company, amount=amount_decimal, currency="USD",
                        payment_provider=WalletTopup.Provider.STRIPE, provider_payment_id=session.id,
                    )
                    logger.debug(f"Stripe wallet funding session created successfully for user {request.user.email}")
                    return Response({'status': 'wallet funding session created', 'data': {'session_id': session.id, 'checkout_url': session.url}}, status=status.HTTP_201_CREATED)
                else:
                    logger.error("Failed to create Stripe wallet funding session.")
                    return Response({'error': 'Failed to create wallet funding session.'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error creating Stripe wallet funding session: {e}")
                return Response({'error': 'Error creating wallet funding session.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # create Paystack checkout session
            try:
                paystack_handler = PayStackSubscriptionHandler()
                response = paystack_handler.fund_wallet(
                    customer_email=request.user.email,
                    amount=amount,
                )
                if response.get("status") and response.get("data"):
                    reference = response["data"].get("reference")
                    data = {
                        "authorization_url": response["data"].get("authorization_url"),
                        "access_code": response["data"].get("access_code"),
                        "reference": reference,
                    }
                    WalletTopup.objects.create(
                        wallet=wallet, organisation=company, amount=amount_decimal, currency="NGN",
                        payment_provider=WalletTopup.Provider.PAYSTACK, provider_payment_id=reference,
                    )
                    logger.debug(f"Paystack wallet funding session created successfully for user {request.user.email}")
                    return Response({'status': 'wallet funding session created', 'data': data}, status=status.HTTP_201_CREATED)
                else:
                    logger.error("Failed to create Paystack wallet funding session.")
                    return Response({'error': 'Failed to create wallet funding session.'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error creating Paystack wallet funding session: {e}")
                return Response({'error': 'Error creating wallet funding session.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# view to get wallet transaction based on user
class WalletTransactionViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet
):
    """
    ViewSet for managing Wallet Transactions.
    """
    serializer_class = UsageBaseWalletTransactionSerializer
    permission_classes = [IsAuthenticated, IsUserVerified]
    pagination_class = TiaagoPagination

    def get_queryset(self):
        company = get_user_company(self.request.user)
        if not company:
            return WalletTransaction.objects.none()
        wallet = getattr(company, 'wallet', None)
        if not wallet:
            return WalletTransaction.objects.none()
        queryset = WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')

        # ?type=credit|debit|free_credit -- "credit" excludes free-credit
        # entries so they show under their own "Free credits" filter tab
        # instead of double-counting as generic credits.
        type_filter = self.request.query_params.get("type")
        if type_filter == "credit":
            queryset = queryset.filter(transaction_type=WalletTransaction.TransactionType.CREDIT).exclude(
                service_type=WalletTransaction.ServiceType.FREE_CREDIT
            )
        elif type_filter == "debit":
            queryset = queryset.filter(transaction_type=WalletTransaction.TransactionType.DEBIT)
        elif type_filter == "free_credit":
            queryset = queryset.filter(service_type=WalletTransaction.ServiceType.FREE_CREDIT)

        return queryset


def _csv_safe(value):
    """Neutralizes CSV/formula injection: a cell starting with =, +, -, @,
    tab, or CR is interpreted as a formula by Excel/Sheets when the file is
    opened. Transaction descriptions embed a candidate's own full_name
    (attacker-controlled at signup), which a recruiter then downloads and
    typically opens in Excel -- so this is a real injection path, not just
    theoretical. Prefixing with a single quote forces text interpretation
    everywhere without changing what a normal description looks like."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsUserVerified])
def export_wallet_transactions_csv(request):
    """Streams ALL of the caller's wallet transactions (not just the
    current page) as a CSV download."""
    company = get_user_company(request.user)
    if not company:
        return Response({'error': 'No company associated'}, status=status.HTTP_403_FORBIDDEN)
    wallet = getattr(company, 'wallet', None)

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="wallet_transactions.csv"'
    writer = csv.writer(response)
    writer.writerow(["Date", "Description", "Type", "Amount", "Currency", "Balance After", "Status"])

    if wallet:
        for txn in WalletTransaction.objects.filter(wallet=wallet).order_by("-created_at"):
            label = (
                "Free credit" if txn.service_type == WalletTransaction.ServiceType.FREE_CREDIT
                else txn.transaction_type.capitalize()
            )
            writer.writerow([
                txn.created_at.isoformat(), _csv_safe(txn.description), label,
                txn.amount, txn.currency or "", txn.balance_after if txn.balance_after is not None else "",
                txn.status,
            ])

    return response


# view to get wallet balance
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsUserVerified])
def get_wallet_balance(request):
    user = request.user
    company = get_user_company(user)
    if not company:
        return Response({'error': 'No company associated'}, status=status.HTTP_403_FORBIDDEN)

    wallet, created = Wallet.objects.get_or_create(
        company=company,
        defaults={
            'balance': 0.00,
            'currency': COUNTRY_CURRENCY_MAP.get(company.country, "USD"),
        },
    )
    currency = wallet.currency or COUNTRY_CURRENCY_MAP.get(company.country, "USD")

    return Response(
        {
            'balance': wallet.balance,
            'currency': currency,
            'free_credits_remaining': wallet.free_credits_remaining,
            'low_balance_threshold': wallet.low_balance_threshold,
            'low_balance_alert_enabled': wallet.low_balance_alert_enabled,
            'pricing': {
                'resume_screening_price': get_action_price("resume_screening", currency),
                'assessment_price': get_action_price("assessment", currency),
                'minimum_topup': get_pricing_decimal(
                    f"minimum_topup_{currency.lower()}", "10.00" if currency == "USD" else "5000.00"
                ),
                'free_tier_limit': get_pricing_decimal("free_tier_limit", "100"),
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsUserVerified])
def update_wallet_settings(request):
    """Recruiter-facing low-balance alert settings: enable/disable, and the
    balance threshold that triggers BillingService.check_and_send_low_balance_alert."""
    company = get_user_company(request.user)
    if not company:
        return Response({'error': 'No company associated'}, status=status.HTTP_403_FORBIDDEN)

    wallet, _ = Wallet.objects.get_or_create(
        company=company, defaults={"currency": COUNTRY_CURRENCY_MAP.get(company.country, "USD")}
    )

    update_fields = []
    if "low_balance_alert_enabled" in request.data:
        wallet.low_balance_alert_enabled = bool(request.data["low_balance_alert_enabled"])
        update_fields.append("low_balance_alert_enabled")
    if "low_balance_threshold" in request.data:
        raw = request.data["low_balance_threshold"]
        if raw in (None, ""):
            wallet.low_balance_threshold = None
        else:
            try:
                threshold = Decimal(str(raw))
            except Exception:
                return Response({'error': 'low_balance_threshold must be a number.'}, status=status.HTTP_400_BAD_REQUEST)
            if threshold < 0:
                return Response({'error': 'low_balance_threshold must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
            wallet.low_balance_threshold = threshold
        update_fields.append("low_balance_threshold")

    if update_fields:
        wallet.save(update_fields=update_fields)

    return Response(
        {
            'low_balance_threshold': wallet.low_balance_threshold,
            'low_balance_alert_enabled': wallet.low_balance_alert_enabled,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsUserVerified])
def get_wallet_usage(request):
    user = request.user
    company = get_user_company(user)
    if not company:
        return Response({'error': 'No company associated'}, status=status.HTTP_403_FORBIDDEN)

    wallet = Wallet.objects.filter(company=company).first()
    if wallet is None:
        return Response({'error': 'Wallet not found'}, status=status.HTTP_404_NOT_FOUND)

    # Computed straight from CandidateBillingRecord (the actual billing
    # source of truth BillingService writes to) instead of WalletUserUsage --
    # nothing ever incremented WalletUserUsage's counters, so this endpoint
    # always reported 0 regardless of real usage. A candidate counts here
    # whether they were covered by a free credit or a real wallet charge --
    # this month's *volume*, not spend (total_amount_spent below is spend).
    month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    records_this_month = CandidateBillingRecord.objects.filter(organisation=company)
    resumes_used = records_this_month.filter(
        resume_screening_charged=True, resume_screening_charged_at__gte=month_start
    ).count()
    assessments_used = records_this_month.filter(
        assessment_charged=True, assessment_charged_at__gte=month_start
    ).count()

    # total amount spent this month
    total_spent = wallet.transactions.filter(
        transaction_type="debit", created_at__gte=month_start
    ).aggregate(total=Sum("amount"))["total"] or 0

    return Response({
        "user": user.email,
        "wallet_balance": wallet.balance,   # optional if you want to show wallet balance

        "resumes_used": resumes_used,
        "assessments_used": assessments_used,
        "total_amount_spent": total_spent,
    }, status=status.HTTP_200_OK)



# listen to webhook event to manage subscription
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def handle_webhook_event(request):
    if request.method != "POST":
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    payload = request.body
    signature = hmac.new(
        settings.PAYSTACK_PRIVATE_KEY.encode('utf-8'),
        payload,
        hashlib.sha512
    ).hexdigest()

    # Constant-time comparison -- a plain != leaks how many leading bytes
    # matched via response timing, letting an attacker forge a valid
    # signature byte-by-byte.
    if not hmac.compare_digest(signature, request.headers.get('X-paystack-signature', '')):
        logger.error("Invalid Paystack webhook signature")
        return JsonResponse({'error': 'Invalid signature'}, status=400)
        
    # process the webhook payload
    event = json.loads(payload)
    event_type = event.get('event')
    data = event.get('data', {})
    
    # Log webhook event to DB
    log_entry = PaystackWebhookLog.objects.create(
        event=event_type,
        payload=event
    )
    logger.info(f"Webhook received: {event_type}")
        
    # ----------------------------------------
    # When a new subscription is created
    # ----------------------------------------
    try:
        if event_type == 'charge.success':
            subscription_auth = data["metadata"]["type"]
            
            if subscription_auth != "subscription_auth":
                log_entry.notes = f"Ignored charge.success event for non-subscription"
                log_entry.processed = True
                log_entry.save()
                return JsonResponse({'status': 'ignored'}, status=200)
            
            customer_email = data['customer']['email']
            customer_code = data['customer']['customer_code']
            plan_code = data['plan']['plan_code']
            status = data['status']
            next_payment_date = timezone.now() + relativedelta(months=1)
            amount = data['amount']
            reference = data['reference']

            
            company = Company.objects.filter(company_email=customer_email).first()
            plan = PaystackPlan.objects.filter(plan_code=plan_code).first()
            
            logger.info(f"Company: {company}, Plan: {plan}")
        
            if company and plan:
                # compute end_at manually
                if plan.interval.lower() == "monthly":
                    end_at = timezone.now() + relativedelta(months=1)
                elif plan.interval.lower() == "annually":
                    end_at = timezone.now() + relativedelta(years=1)
                else:
                    end_at = None
            
            # plan name and plan month
            plan_name = plan.name.strip().lower() 
            plan_interval = plan.interval.strip().lower() 
            
            plan_usage = determine_plan_usage(plan_name, plan_interval)
            logger.info(f"Plan usage: {plan_usage}")
            
            # check if user have active plans and deactivate them before creating new one
            active_subscriptions = PaystackSubscription.objects.filter(company=company).order_by('-started_at').first()
            if active_subscriptions and (active_subscriptions.plan.name != plan_name or
               active_subscriptions.plan.interval != plan_interval):
                if active_subscriptions.status == "active" or active_subscriptions.status == "inactive" :
                    active_subscriptions.status = "inactive"
                    active_subscriptions.cancelled_at = timezone.now()
                    active_subscriptions.resume_limit = 0
                    active_subscriptions.assessment_limit = 0
                    active_subscriptions.save(update_fields=['status', 'cancelled_at', 'resume_limit', 'assessment_limit'])
                    
            
            if company and plan:
                PaystackSubscription.objects.update_or_create(
                    customer_code=customer_code,
                    defaults={
                        'company': company,
                        'company_email': customer_email,
                        'plan': plan,
                        'customer_code': customer_code,
                        'status': 'active',
                        'next_payment_date': next_payment_date,
                        'end_at': end_at,
                        'resume_limit': plan_usage["resume_limit"],
                        'assessment_limit': plan_usage["assessment_limit"]
                    }
                )
                
                SubscriptionTransaction.objects.update_or_create(
                    reference=reference,
                    defaults={
                        'company': company,
                        'company_email': customer_email,
                        'plan_name': plan_name,
                        'provider': 'paystack',
                        'reference': reference,
                        'amount': amount,
                        'next_payment_date': next_payment_date,
                        'status': status,
                        'channel': "card",
                        'paid_at': timezone.now(),
                    }
                )
    
                # deactivate the free plan
                FreePlan.objects.filter(company=company).update(
                    status="inactive"
                )
                
                log_entry.processed = True
                log_entry.notes = "Subscription created successfully."
            else:
                log_entry.notes = f"User or Plan not found for subscription {customer_code}"
        elif event_type == 'charge.failed':
            """
            Handle charge failed event
            """
            reference = data['reference']
            logger.info(f"Wallet funding failed for reference: {reference}")
            
            log_entry.processed = True
            log_entry.notes = "Subscription charge failed handled successfully."
        elif event_type == 'subscription.disable':
            """
            Handle subscription disable event
            """
            customer_code = data['customer']['customer_code']
            subscription = PaystackSubscription.objects.filter(subscription_code=customer_code).first()
            
            if subscription:
                subscription.status = 'disabled'
                subscription.cancelled_at = timezone.now()
                subscription.resume_limit = 0
                subscription.assessment_limit = 0
                subscription.save()
                
                # Downgrade company plan to free tier
                FreePlan.objects.update_or_create(
                    company=subscription.company,
                    defaults={
                        "company_email": subscription.company_email,
                        "end_at": timezone.now() + relativedelta(months=1),
                    }
                )
            
            log_entry.processed = True
            log_entry.notes = "Subscription disabled successfully."
        elif event_type == 'subscription.not_renew':
            """
            Handle subscription non-renewing event
            """
            customer_code = data['customer']['customer_code']
            subscription = PaystackSubscription.objects.filter(subscription_code=customer_code).first()
            
            if subscription:
                subscription.status = 'non-renewing'
                subscription.cancelled_at = timezone.now()
                subscription.resume_limit = 0
                subscription.assessment_limit = 0
                subscription.save()
                
                # Downgrade company plan to free tier
                FreePlan.objects.update_or_create(
                    company=subscription.company,
                    defaults={
                        "company_email": subscription.company_email,
                        "end_at": timezone.now() + relativedelta(months=1),
                    }
                )
            
            
            log_entry.processed = True
            log_entry.notes = "Subscription set to non-renewing successfully."
        elif event_type == 'subscription.cancel':
            """
            Handle subscription cancellation event
            """            
            customer_code = data['customer']['customer_code']
            subscription = PaystackSubscription.objects.filter(subscription_code=customer_code).first()
            
            if subscription:
                subscription.status = 'cancelled'
                subscription.cancelled_at = timezone.now()
                subscription.resume_limit = 0
                subscription.assessment_limit = 0
                subscription.save()
                
                # Downgrade company plan to free tier
                FreePlan.objects.update_or_create(
                    company=subscription.company,
                    defaults={
                        "company_email": subscription.company_email,
                        "end_at": timezone.now() + relativedelta(months=1),
                    }
                )
            
            log_entry.processed = True
            log_entry.notes = "Subscription cancelled successfully."
        else:
            log_entry.notes = f"Unhandled event: {event_type}"
    except Exception as e:
        logger.error(f"Error processing webhook event {event_type}: {e}")
        log_entry.notes = f"Error processing event: {str(e)}"
    
    # Save log entry updates
    log_entry.save()
    return JsonResponse({'status': 'success'}, status=200)


# Stripe webhook
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint = settings.STRIPE_SUBSCRIPTION_WEBHOOK_KEY
    print(f"Endpoint: {endpoint}")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid Stripe webhook payload: {e}")
        return JsonResponse({'error': 'Invalid payload'}, status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid Stripe webhook signature: {e}")
        return JsonResponse({'error': 'Invalid signature'}, status=400)
    
    # Handle the events
    # get price id to use in the session completed

    if event['type'] == 'invoice.payment_succeeded':
        try:
            session = event['data']['object']
            # print(json.dumps(event['data']['object'], indent=2))
        
            # Retrieve line items (to get the price Id)            
            price_id = session['lines']['data'][0]['pricing']['price_details']['price']
            
            if not price_id:
                JsonResponse({'error': 'Price ID not found in line items'}, status=400)
        
            customer_email = session.get('customer_email')
            subscription_id = session['lines']['data'][0]['parent']['subscription_item_details']['subscription']
            
            if not subscription_id:
                return JsonResponse({'error': 'Subscription ID not found in session'}, status=200)
        
            plan_subscribed = StripePlanPrice.objects.filter(price_id=price_id).first()
            company = Company.objects.filter(company_email=customer_email).first()
            
            if company and plan_subscribed:
                # compute end_at manually
                if  plan_subscribed.recurring_interval.lower() == "month":
                    end_at = timezone.now() + relativedelta(months=1)
                elif plan_subscribed.recurring_interval.lower() == "year":
                    end_at = timezone.now() + relativedelta(years=1)
                else:
                    end_at = None
            
            # plan usage
            plan_name = plan_subscribed.name.strip().lower() 
            interval = plan_subscribed.recurring_interval.strip().lower() 
            plan_usage = determine_plan_usage(plan_name, interval)
            
            # check if user have active plans and deactivate them before creating new one
            active_subscriptions = StripeSubscription.objects.filter(company=company).order_by('-started_at').first()
            if active_subscriptions and (active_subscriptions.plan.name != plan_name or
                active_subscriptions.plan.recurring_interval != interval):
                if active_subscriptions.status == "active" or active_subscriptions.status == "inactive" :
                    active_subscriptions.status = "inactive"
                    active_subscriptions.cancelled_at = timezone.now()
                    active_subscriptions.resume_limit = 0
                    active_subscriptions.assessment_limit = 0
                    active_subscriptions.save(update_fields=['status', 'cancelled_at', 'resume_limit', 'assessment_limit'])

            if company and plan_subscribed:
                StripeSubscription.objects.update_or_create(
                    subscription_id=subscription_id,
                    defaults={
                        'company': company,
                        'company_email': customer_email,
                        'plan': plan_subscribed,
                        'subscription_id': subscription_id,
                        'status': 'active',
                        'end_at': end_at,
                        'resume_limit': plan_usage["resume_limit"],
                        'assessment_limit': plan_usage["assessment_limit"]
                    }
                )
                logger.info(f"Stripe subscription created/updated: {subscription_id}")
                
                # create transaction history
                SubscriptionTransaction.objects.update_or_create(
                    reference=subscription_id,
                    defaults={
                        'company': company,
                        'company_email': customer_email,
                        'plan_name': plan_name,
                        'provider': 'stripe',
                        'reference': subscription_id,
                        'amount': session.get('amount_paid', 0),
                        'next_payment_date': end_at,
                        'status': 'succeeded',
                        'channel': 'card',
                        'paid_at': timezone.now(),
                    }
                )
                
                # deactivate the free plan
                FreePlan.objects.filter(company=company).update(
                    status="inactive"
                )
            else:
                logger.error(f"Company or Plan not found for Stripe subscription: {subscription_id}")
        except Exception as e:
            logger.error(f"Error processing Stripe checkout.session.completed: {e}")
            return JsonResponse({'error': 'Error processing event'}, status=500)

    elif event['type'] == 'invoice.payment_failed':
        try:
            print(json.dumps(event['data']['object'], indent=2))
            invoice = event['data']['object']
            subscription_id = invoice.get('subscription')

            if not subscription_id:
                return JsonResponse({'error': 'Subscription ID not found in invoice payment'}, status=400)

            # Update subscription status to failed
            StripeSubscription.objects.filter(subscription_id=subscription_id).update(
                status='failed'
            )
            logger.info(f"Stripe subscription payment failed: {subscription_id}")
        except Exception as e:
            logger.error(f"Error processing Stripe invoice.payment_failed: {e}")
            return JsonResponse({'error': 'Error processing event'}, status=500)

    elif event['type'] == 'customer.subscription.deleted':
        try:
            print(json.dumps(event['data']['object'], indent=2))
            subscription = event['data']['object']
            subscription_id = subscription.get('id')
           
            if not subscription_id:
               return JsonResponse({'error': 'Subscription ID not found in deleted subscription'}, status=400)

            # Update subscription status to canceled
            subscription = StripeSubscription.objects.filter(subscription_id=subscription_id).first()
            
            if subscription:
                subscription.status = 'canceled'
                subscription.cancelled_at = timezone.now()
                subscription.resume_limit = 0
                subscription.assessment_limit = 0
                subscription.save()
                
                # Downgrade company plan to free tier
                FreePlan.objects.update_or_create(
                    company=subscription.company,
                    defaults={
                        "company_email": subscription.company_email,
                        "end_at": timezone.now() + relativedelta(months=1),
                    }
                )
        
            logger.info(f"Stripe subscription canceled: {subscription_id}")
        except Exception as e:
            logger.error(f"Error processing Stripe customer.subscription.deleted: {e}")
            return JsonResponse({'error': 'Error processing event'}, status=500)
    else:
        logger.info(f"Unhandled Stripe event type: {event['type']}")

    return JsonResponse({'status': 'success'}, status=200)

# paystack wallet funding webhook
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def paystack_wallet_fund_webhook(request):
    if request.method != "POST":
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    payload = request.body
    signature = hmac.new(
        settings.PAYSTACK_PRIVATE_KEY.encode('utf-8'),
        payload,
        hashlib.sha512
    ).hexdigest()

    # Constant-time comparison -- see handle_webhook_event for why.
    if not hmac.compare_digest(signature, request.headers.get('X-paystack-signature', '')):
        logger.error("Invalid Paystack webhook signature")
        return JsonResponse({'error': 'Invalid signature'}, status=400)
        
    # process the webhook payload
    event = json.loads(payload)
    event_type = event.get('event')
    data = event.get('data', {})
    
    # Log webhook event to DB
    log_entry = PaystackWebhookLog.objects.create(
        event=event_type,
        payload=event
    )
    logger.info(f"Webhook received: {event_type}")
    
    # ----------------------------------------
    # When a new transaction is created
    # ----------------------------------------
    
    if event_type == 'charge.success':
        try:
            reference = data['reference']
            wallet_funding = data["metadata"]["type"]
            # print the event
            # print(json.dumps(event, indent=2))
            
            if wallet_funding != 'wallet_funding':
                log_entry.notes = f"Ignored charge.success event for non-wallet funding: {reference}"
                log_entry.processed = True
                log_entry.save()
                return JsonResponse({'status': 'ignored'}, status=200)
            
            amount = Decimal(str(data['amount'])) / Decimal('100')
            customer_email = data['customer']['email']
            
            # get company
            company = Company.objects.filter(company_email=customer_email).first()
            
            if company:
                wallet, _ = Wallet.objects.get_or_create(company=company)

                # Idempotency: Paystack retries webhooks — never credit the
                # same reference twice. Checked against both the topup
                # record (provider_payment_id) and the transaction
                # reference, since older topups pre-date WalletTopup.
                topup = WalletTopup.objects.filter(provider_payment_id=reference).first()
                already_credited = (topup and topup.status == WalletTopup.Status.COMPLETED) or (
                    WalletTransaction.objects.filter(
                        wallet=wallet, transaction_type="credit", reference=reference
                    ).exists()
                )
                if already_credited:
                    log_entry.processed = True
                    log_entry.notes = f"Duplicate webhook ignored for reference: {reference}"
                    log_entry.save()
                    return JsonResponse({'status': 'already processed'}, status=200)

                # credit wallet
                txn = wallet.credit(amount=amount, reference=reference, description="Wallet funding via Paystack", currency="NGN", service_type=WalletTransaction.ServiceType.WALLET_TOPUP)

                if topup:
                    topup.status = WalletTopup.Status.COMPLETED
                    topup.provider_status = event_type
                    topup.completed_at = timezone.now()
                    topup.save(update_fields=["status", "provider_status", "completed_at"])

                try:
                    emails.wallet_topup_confirmed_mail(
                        company.company_rep, amount, txn.balance_after, "NGN", _wallet_url()
                    )
                except Exception:
                    logger.exception("Failed to send wallet-topup-confirmed email for company %s", company.id)

                from tags.tasks import evaluate_company_tags
                evaluate_company_tags.delay(company.id)

                # log entry
                log_entry.processed = True
                log_entry.notes = "Wallet funded successfully."
                log_entry.save()
                return JsonResponse({'status': 'wallet funded successfully'}, status=200)
            else:
                logger.error(f"Company not found for wallet funding with reference: {reference}")
                return JsonResponse({'error': 'Company not found'}, status=400)
        except Exception as e:
            logger.error(f"Error processing wallet funding webhook: {e}")
            return JsonResponse({'error': 'Error processing event'}, status=500)
    elif event_type == 'charge.failed':
        try:
            reference = data['reference']
            logger.info(f"Wallet funding failed for reference: {reference}")

            topup = WalletTopup.objects.filter(provider_payment_id=reference).first()
            if topup and topup.status == WalletTopup.Status.PENDING:
                failure_reason = data.get("gateway_response") or "Payment failed"
                topup.status = WalletTopup.Status.FAILED
                topup.provider_status = event_type
                topup.failed_at = timezone.now()
                topup.failure_reason = failure_reason[:500]
                topup.save(update_fields=["status", "provider_status", "failed_at", "failure_reason"])
                try:
                    emails.wallet_topup_failed_mail(
                        topup.organisation.company_rep, topup.amount, "NGN", failure_reason, _wallet_url()
                    )
                except Exception:
                    logger.exception("Failed to send wallet-topup-failed email for topup %s", topup.id)

            # log entry
            log_entry.processed = True
            log_entry.notes = "Wallet funding failed."
            log_entry.save()
            return JsonResponse({'status': 'wallet funding failed'}, status=200)
        except Exception as e:
            logger.error(f"Error processing wallet funding failure webhook: {e}")
            return JsonResponse({'error': 'Error processing event'}, status=500)
    elif event_type == 'charge.pending':
        try:
            reference = data['reference']
            logger.info(f"Wallet funding pending for reference: {reference}")
            
            # log entry
            log_entry.processed = True
            log_entry.notes = "Wallet funding pending."
            return JsonResponse({'status': 'wallet funding pending'}, status=200)
        except Exception as e:
            logger.error(f"Error processing wallet funding pending webhook: {e}")
            return JsonResponse({'error': 'Error processing event'}, status=500)
    else:
        logger.info(f"Unhandled event: {event_type}")
        
        # log entry and save 
        log_entry.notes = f"Unhandled event: {event_type}"
        log_entry.save()
        return JsonResponse({'status': 'unhandled event'}, status=200)
    

# Stripe wallet funding
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_wallet_fund_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint = settings.STRIPE_WEBHOOK_SECRET_KEY
    logger.debug(f"endpoint that is showing: {endpoint}")
    print("endpoint that is showing: ", endpoint)
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid Stripe webhook payload: {e}")
        return JsonResponse({'error': 'Invalid payload'}, status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid Stripe webhook signature: {e}")
        return JsonResponse({'error': 'Invalid signature'}, status=400)
    
    # Handle the events
    if event['type'] == 'checkout.session.completed':
        try:
            session = event ['data']['object']
            customer_email = session.get('customer_email')
            amount_total = session.get('amount_total') / Decimal(100)
            reference = session.get('id')
            
            # print(json.dumps(event['data']['object'], indent=2))

            if session['metadata'].get('type') != 'wallet_fund':
                return JsonResponse({'status': 'ignored'}, status=200)
            
            # get company
            company = Company.objects.filter(company_email=customer_email).first()
            if company:
                wallet, _ = Wallet.objects.get_or_create(company=company)

                # Idempotency: Stripe retries webhooks — never credit the
                # same checkout session twice. Checked against both the
                # topup record and the transaction reference, since older
                # topups pre-date WalletTopup.
                topup = WalletTopup.objects.filter(provider_payment_id=reference).first()
                already_credited = (topup and topup.status == WalletTopup.Status.COMPLETED) or (
                    WalletTransaction.objects.filter(
                        wallet=wallet, transaction_type="credit", reference=reference
                    ).exists()
                )
                if already_credited:
                    logger.info(f"Duplicate Stripe wallet funding webhook ignored: {reference}")
                    return JsonResponse({'status': 'already processed'}, status=200)

                # credit wallet
                txn = wallet.credit(amount=amount_total, reference=reference, description="Wallet funding via Stripe", currency="USD", service_type=WalletTransaction.ServiceType.WALLET_TOPUP)
                logger.info(f"Wallet funded successfully via Stripe for company: {company.company_email}")

                if topup:
                    topup.status = WalletTopup.Status.COMPLETED
                    topup.provider_status = event['type']
                    topup.completed_at = timezone.now()
                    topup.save(update_fields=["status", "provider_status", "completed_at"])

                try:
                    emails.wallet_topup_confirmed_mail(
                        company.company_rep, amount_total, txn.balance_after, "USD", _wallet_url()
                    )
                except Exception:
                    logger.exception("Failed to send wallet-topup-confirmed email for company %s", company.id)

                from tags.tasks import evaluate_company_tags
                evaluate_company_tags.delay(company.id)

                return JsonResponse({'status': 'wallet funded successfully'}, status=200)
            else:
                logger.error(f"Company not found for wallet funding with reference: {reference}")
                return JsonResponse({'error': 'Company not found'}, status=400)
        except Exception as e:
            logger.error(f"Error processing Stripe wallet funding webhook: {e}")
            return JsonResponse({'error': 'Error processing event'}, status=500)
    elif event['type'] == 'payment_intent.payment_failed':
        try:
            intent = event['data']['object']
            reference = intent.get('id')
            logger.info(f"Wallet funding failed via Stripe for reference: {reference}")

            topup = WalletTopup.objects.filter(provider_payment_id=reference).first()
            if topup and topup.status == WalletTopup.Status.PENDING:
                failure_reason = (
                    intent.get("last_payment_error", {}).get("message")
                    if intent.get("last_payment_error") else "Payment failed"
                )
                topup.status = WalletTopup.Status.FAILED
                topup.provider_status = event['type']
                topup.failed_at = timezone.now()
                topup.failure_reason = (failure_reason or "Payment failed")[:500]
                topup.save(update_fields=["status", "provider_status", "failed_at", "failure_reason"])
                try:
                    emails.wallet_topup_failed_mail(
                        topup.organisation.company_rep, topup.amount, "USD", failure_reason, _wallet_url()
                    )
                except Exception:
                    logger.exception("Failed to send wallet-topup-failed email for topup %s", topup.id)

            return JsonResponse({'status': 'wallet funding failed'}, status=200)
        except Exception as e:
            logger.error(f"Error processing Stripe wallet funding failure webhook: {e}")
            return JsonResponse({'error': 'Error processing event'}, status=500)
    else:
        logger.info(f"Unhandled Stripe event type: {event['type']}")

    return JsonResponse({'status': 'success'}, status=200)


def _serialize_pricing_row(row):
    return {
        "key": row.key,
        "value": row.value,
        "description": row.description,
        "updated_at": row.updated_at,
        "updated_by_admin": row.updated_by_admin.get_full_name() if row.updated_by_admin else None,
    }


class PricingConfigListView(APIView):
    """GET /subscriptions/pricing-config/ -- current admin-editable PAYG
    pricing values, for the admin Pricing panel (/admin/pricing)."""

    permission_classes = [requirePermission("revenue.view")]

    def get(self, request):
        rows = PricingConfig.objects.select_related("updated_by_admin").order_by("key")
        return Response([_serialize_pricing_row(r) for r in rows])


class PricingConfigUpdateView(APIView):
    """PATCH /subscriptions/pricing-config/<key>/ -- updates a single
    pricing value and logs the change to StaffActivityLog with the old and
    new value, per the admin Pricing panel's independent-per-field save."""

    permission_classes = [requirePermission("revenue.manage")]

    def patch(self, request, key):
        row = PricingConfig.objects.filter(key=key).first()
        if not row:
            return Response({"error": "Unknown pricing key"}, status=status.HTTP_404_NOT_FOUND)

        new_value = request.data.get("value")
        if new_value is None or str(new_value).strip() == "":
            return Response({"error": "value is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parsed_value = Decimal(str(new_value))
        except Exception:
            return Response({"error": "value must be a number"}, status=status.HTTP_400_BAD_REQUEST)
        if parsed_value < 0:
            return Response({"error": "value must not be negative"}, status=status.HTTP_400_BAD_REQUEST)

        old_value = row.value
        row.value = str(new_value)
        row.updated_by_admin = request.user
        row.save(update_fields=["value", "updated_by_admin", "updated_at"])

        from staff.utils import log_staff_activity
        log_staff_activity(
            request.user, "pricing.update", "PricingConfig", row.key,
            {"old_value": old_value, "new_value": row.value},
        )

        return Response(_serialize_pricing_row(row))
