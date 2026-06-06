import hmac
import hashlib
import json
from decimal import Decimal
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from allauth.utils import build_absolute_uri
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from base.permissions import IsCompanyRepUser
from create_user.models import Company, TalentProfile, Referral
from subscriptions.models import SubPlan
from rest_framework import status
from contract.models import Contract
from utils.paystack_handler import paystack_handler
from utils.flutterwave_handler import flutterwave_handler
from utils.email_handler import EmailHandler
from .utils import (
    generate_transaction_reference,
    calculate_fees,
    calculate_referral_reward,
    usage_unbilled_for_company,
    UNIT_PRICE_NGN,
)
from .models import CouponUsage,Coupon,Payment,Pricing,PaymentMethod,Invoice,UsageEvent
from skill_assessment.models import SkillAssessmentPayment
from .tasks import charge_startup_card_task
from .serializers import *
import stripe
from django.shortcuts import get_object_or_404
from base.mixins.pagination import TiaagoPagination
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
import time
import uuid
import requests
from rest_framework.views import APIView
from rest_framework import serializers
import datetime
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from loguru import logger

User = get_user_model()
STRIPE_API_KEY = settings.STRIPE_SECRET_KEY


stripe.api_key = STRIPE_API_KEY

class PaymentCreateAPIView(generics.CreateAPIView):
    serializer_class = PaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        plan_id = serializer.validated_data["plan_id"]  # get the plan id
        is_recurring = request.GET.get("is_recurring", False)

        try:
            sub_plan = SubPlan.objects.get(pk=plan_id)
        except SubPlan.DoesNotExist:
            return Response(
                {"detail": "Invalid subscription plan"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if the subscription plan is valid for the user type
        if sub_plan.user_type != request.user.user_type:
            return Response(
                {"detail": "You can't subscribe to this subscription plan"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # check if the user has an active subscription
        if user.is_subscribed():
            return Response(
                {"detail": "You have an active subscription plan"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # get the plan code for recurring payment
        if is_recurring and sub_plan.currency == "NGN":
            if (
                sub_plan.sub_type == SubPlan.SUB_TYPE.BASIC
                and sub_plan.user_type == User.USER_TYPE.TALENT
            ):
                plan_code = settings.PAYSTACK_BASIC_PLAN_CODE_FOR_TALENTS
            elif (
                sub_plan.sub_type == SubPlan.SUB_TYPE.PREMIUM
                and sub_plan.user_type == User.USER_TYPE.TALENT
            ):
                plan_code = settings.PAYSTACK_PREMIUM_PLAN_CODE_FOR_TALENTS
            elif (
                sub_plan.sub_type == SubPlan.SUB_TYPE.BASIC
                and sub_plan.user_type == User.USER_TYPE.COMPANY_REP
            ):
                plan_code = settings.PAYSTACK_BASIC_PLAN_CODE_FOR_STARTUPS
            else:
                plan_code = settings.PAYSTACK_PREMIUM_PLAN_CODE_FOR_STARTUPS
        elif is_recurring and sub_plan.currency != "NGN":
            if (
                sub_plan.sub_type == SubPlan.SUB_TYPE.BASIC
                and sub_plan.user_type == User.USER_TYPE.TALENT
            ):
                plan_code = settings.FLW_BASIC_PLAN_CODE_FOR_TALENTS
            elif (
                sub_plan.sub_type == SubPlan.SUB_TYPE.PREMIUM
                and sub_plan.user_type == User.USER_TYPE.TALENT
            ):
                plan_code = settings.FLW_PREMIUM_PLAN_CODE_FOR_TALENTS
            elif (
                sub_plan.sub_type == SubPlan.SUB_TYPE.BASIC
                and sub_plan.user_type == User.USER_TYPE.COMPANY_REP
            ):
                plan_code = settings.FLW_BASIC_PLAN_CODE_FOR_STARTUPS
            else:
                plan_code = settings.FLW_PREMIUM_PLAN_CODE_FOR_STARTUPS

        # initiate recurring payment with paystack
        if is_recurring and sub_plan.currency == "NGN":
            callback_url = build_absolute_uri(
                request, reverse("paystack-payment-callback")
            )
            initialized = paystack_handler.initialize_plan_recurring_payment(
                plan_code=plan_code,
                amount=sub_plan.amount,
                callback_url=callback_url,
            )
            if initialized["status"]:
                payment_url = initialized["data"]["authorization_url"]
                serializer.save(
                    user=user,
                    ref=initialized["data"]["reference"],
                )
                return Response(
                    {"payment_url": payment_url}, status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"detail": "Error recorded. Try again later"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif not is_recurring and sub_plan.currency == "NGN":
            callback_url = build_absolute_uri(
                request, reverse("paystack-payment-callback")
            )
            initialized = paystack_handler.initialize_payment(
                email=user.email, amount=sub_plan.amount, callback_url=callback_url
            )
            if initialized["status"]:
                payment_url = initialized["data"]["authorization_url"]
                serializer.save(
                    user=user,
                    ref=initialized["data"]["reference"],
                )
                return Response(
                    {"payment_url": payment_url}, status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"detail": "Error recorded. Try again later"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif sub_plan.currency != "NGN":  # initiate payment with flutterwave
            tx_ref = generate_transaction_reference()
            callback_url = build_absolute_uri(
                request, reverse("flutterwave-payment-callback")
            )
            initialized = flutterwave_handler.initialize_flutterwave_plan_payment(
                plan_id=plan_code,
                amount=sub_plan.amount,
                email=user.email,
                callback_url=callback_url,
                tx_ref=tx_ref,
                phone_number=user.phone_number,
                name=user.get_full_name(),
            )
            if initialized["status"] == "success":
                payment_url = initialized["data"]["link"]
                serializer.save(
                    user=user,
                    ref=tx_ref,
                )
                return Response(
                    {"payment_url": payment_url}, status=status.HTTP_201_CREATED
                )
            else:
                serializer.save(user=user, ref=tx_ref, status="failed")
                return Response(
                    {"detail": "Error recorded. Try again later"},
                    status=status.HTTP_400_BAD_REQUEST,
                )


class PaymentListApiView(generics.ListAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentInvoiceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        q = queryset.filter(user=self.request.user)
        return q


# ######## WALLET ##########
class CreateWalletAPIView(generics.CreateAPIView):
    """
    Allows authenticated users to create a wallet if they don't already have one.
    """

    serializer_class = CreateWalletSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Check if the user already has a wallet
        if Wallet.objects.filter(user=request.user).exists():
            return Response(
                {"message": "You already have a wallet."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Wallet created successfully", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class FundWalletAPIView(generics.CreateAPIView):
    """
    Enables a company representative to fund their wallet by initializing a Paystack payment.
    """

    serializer_class = FundWalletSerializer
    permission_classes = [IsCompanyRepUser]

    @transaction.atomic()
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        company = Company.objects.get(company_rep=user)
        try:
            wallet = Wallet.objects.get(user=user)
        except Wallet.DoesNotExist:
            return Response(
                {"message": "Wallet not found"}, status=status.HTTP_404_NOT_FOUND
            )
        if wallet.user_type == User.USER_TYPE.COMPANY_REP:
            callback_url = build_absolute_uri(
                request, reverse("paystack-payments-callback")
            )
            initialized = paystack_handler.initialize_payment(
                email=company.company_email,
                amount=request.data.get("amount"),
                callback_url=callback_url,
            )

            if not initialized:
                # If the response is None, return a failure message
                return Response(
                    {"detail": "Payment initialization failed. Try again later."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if initialized["status"]:
                payment_url = initialized["data"]["authorization_url"]
                serializer.save(
                    user=user,
                    ref=initialized["data"]["reference"],
                    wallet=wallet,
                    transaction_type=WalletTransaction.TRANSACTION_TYPE.COMPANY_WALLET_FUNDING,
                    status="available",
                )
                return Response(
                    {"payment_url": payment_url}, status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"detail": "Error recorded. Try again later"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(
            {
                "message": "Only company reps are allowed to fund their wallet via this method"
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )


class PaystackPaymentCallbackView(generics.GenericAPIView):
    """
    Serves as the callback URL for verifying payment status with Paystack and updating wallet balances.
    """

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        # verify payment status with Paystack
        transaction_reference = request.query_params.get("reference")
        response = paystack_handler.verify_transaction(transaction_reference)
        payment = WalletTransaction.objects.filter(ref=transaction_reference).first()
        if payment:
            if response["data"]["status"] == "success":
                # update payment status
                payment.status = response["data"]["status"]
                payment.save()

                wallet = payment.wallet
                amount = Decimal(response["data"]["amount"]) / Decimal(
                    100
                )  # convert kobo to naira
                wallet.balance += amount
                wallet.save()

                return Response({"status": "success"}, status=status.HTTP_201_CREATED)

            else:
                return Response(
                    {"status": "failed"}, status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {"message": "Payment with transaction reference provided not found"},
                status=status.HTTP_404_NOT_FOUND,
            )


class InitializeAndVerifyCard(generics.GenericAPIView):
    """
    Charges a small amount to validate a company's card and save it for future direct charges.
    """

    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic()
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        contract_id = serializer.validated_data.get("contract_id")
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {"message": "Contract not found"}, status=status.HTTP_404_NOT_FOUND
            )

        company_rep = contract.company.company_rep
        company_email = contract.company.company_email

        try:
            wallet = Wallet.objects.get(user=company_rep)
        except Wallet.DoesNotExist:
            return Response(
                {"message": "Company wallet not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Charge small amount for card validation
        amount = 50
        callback_url = build_absolute_uri(
            request, reverse("paystack-recurrent-callback")
        )
        charge_response = paystack_handler.initialize_payment(
            email=company_email, amount=amount, callback_url=callback_url
        )
        if not charge_response["status"]:
            return Response(
                {"message": "Initial charge failed. Try again later."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reference = charge_response["data"]["reference"]

        # Handle challenged transactions
        if charge_response["data"].get("paused"):
            return Response(
                {
                    "message": "Transaction authorization required.",
                    "authorization_url": charge_response["data"]["authorization_url"],
                    "reference": reference,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if charge_response["status"]:
            charge_url = charge_response["data"]["authorization_url"]
            serializer.save(
                user=company_rep,
                ref=reference,
                amount=amount,
                wallet=wallet,
                transaction_type=WalletTransaction.TRANSACTION_TYPE.COMPANY_CARD_DIRECT_DEBIT,
                status="available",
            )
            return Response({"charge_url": charge_url}, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {"detail": "Error recorded. Try again later"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Card authorization completed successfully. Your card has been saved for future transactions."
            },
            status=status.HTTP_201_CREATED,
        )


class CardRecurrentCallbackView(generics.GenericAPIView):
    """
    Handles the callback for saving card details after a validation request to Paystack.
    """

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        # Verify payment status with Paystack
        transaction_reference = request.query_params.get("reference")
        response = paystack_handler.verify_transaction(transaction_reference)
        if not response["status"]:
            return Response(
                {"message": "Verification failed."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Save authorization code
        authorization_data = response.get("data", {}).get("authorization", {})
        print("Authorization Data:", authorization_data)
        if not authorization_data:
            return Response(
                {"message": "Authorization data missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Retrieve the user (company_rep) from the transaction
        try:
            transaction = WalletTransaction.objects.get(ref=transaction_reference)
            company_rep = transaction.contract.company.company_rep
        except WalletTransaction.DoesNotExist:
            return Response(
                {"message": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # extract unique signature
        signature = authorization_data.get("signature")
        # Check if the card already exists for the user
        existing_card = Card.objects.filter(
            user=company_rep, signature=signature
        ).first()
        if existing_card:
            return Response(
                {"message": "Card already saved."}, status=status.HTTP_200_OK
            )

        card_serializer = CardSerializer(data=authorization_data)
        if card_serializer.is_valid():
            # Fetch company_rep using the transaction reference
            try:
                transaction = WalletTransaction.objects.get(ref=transaction_reference)
                company_rep = transaction.contract.company.company_rep
            except WalletTransaction.DoesNotExist:
                return Response(
                    {"message": "Transaction not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            card = card_serializer.save(
                user=company_rep
            )  # Save card and associate with user
            WalletTransaction.objects.filter(ref=transaction_reference).update(
                card=card
            )
        else:
            return Response(
                {
                    "message": "Failed to save card data.",
                    "errors": card_serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        transaction = WalletTransaction.objects.get(ref=transaction_reference)
        # Link the card to the transaction
        transaction.card = card
        transaction.status = response["data"]["status"]
        transaction.save()

        # Update the wallet balance
        company_rep = transaction.contract.company.company_rep
        wallet = Wallet.objects.get(user=company_rep)
        amount = Decimal(response["data"]["amount"]) / Decimal(
            100
        )  # Convert from kobo to naira
        wallet.balance += amount
        wallet.save()

        return Response(
            {"message": "Card debit authorized and card saved"},
            status=status.HTTP_201_CREATED,
        )


class CompleteCardAuthorization(generics.GenericAPIView):
    """
    Finalizes the authorization process for challenged card transactions.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        reference = request.data.get("reference")
        if not reference:
            return Response(
                {"message": "Reference is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify transaction
        verification_response = paystack_handler.verify_transaction(reference)
        if not verification_response["status"]:
            return Response(
                {"message": "Transaction verification failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save authorization code
        authorization_data = verification_response.get("data", {}).get(
            "authorization", {}
        )
        if not authorization_data:
            return Response(
                {"message": "Authorization data missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = request.user
            card_serializer = CardSerializer(data=authorization_data)
            if card_serializer.is_valid():
                card = card_serializer.save(
                    user=user
                )  # Save card and associate with user
                WalletTransaction.objects.filter(ref=reference).update(card=card)
                return Response(
                    {"message": "Authorization completed and card saved successfully."},
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {
                        "message": "Failed to save card data.",
                        "errors": card_serializer.errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            return Response(
                {"message": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChargeAndVerifyCardAutomatic(generics.GenericAPIView):
    """
    Starts the background process to charge and verify cards automatically using a Celery task.
    """

    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        charge_startup_card_task.delay()

        return Response(
            {"message": "Payment processing has started"}, status=status.HTTP_200_OK
        )


class ChargeAndVerifyCard(generics.GenericAPIView):
    """
    View to charge a company's card manually if their wallet balance is insufficient to pay talent salaries.
    If the card is successfully charged, the transaction is verified and notifications are sent.
    If the wallet balance is sufficient, it deducts from the wallet instead.
    """

    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        contract_id = serializer.validated_data.get("contract_id")
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {"message": "Contract not found"}, status=status.HTTP_404_NOT_FOUND
            )

        company_rep = contract.company.company_rep
        company_email = contract.company.company_email
        talent_salary = contract.talent_salary

        try:
            company_wallet = Wallet.objects.get(user=company_rep)
        except Wallet.DoesNotExist:
            return Response(
                {"message": "Company wallet not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if company_wallet.balance < talent_salary:
            try:
                card = Card.objects.get(user=company_rep)
            except Card.DoesNotExist:
                return Response(
                    {"message": "No card linked to this account."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Charge the card
            try:
                charge_response = paystack_handler.charge_account(
                    email=company_email,
                    amount=talent_salary,
                    authorization_code=card.authorization_code,
                )
                salary = Decimal(charge_response["data"]["amount"]) / Decimal(100)
                tiaago_fees, net_amount = calculate_fees(salary)
                reference = charge_response["data"]["reference"]

                if charge_response["status"]:
                    # Create a pending transaction
                    transaction = serializer.save(
                        user=company_rep,
                        ref=reference,
                        tiaago_fees=tiaago_fees,
                        transaction_type=WalletTransaction.TRANSACTION_TYPE.COMPANY_CARD_DIRECT_DEBIT,
                        status="pending",
                        wallet=Wallet.objects.get(user=contract.talent.user),
                        amount=net_amount,
                    )

                    # Verify the transaction
                    verification_response = paystack_handler.verify_transaction(
                        reference
                    )
                    if verification_response["data"]["status"] == "success":
                        # Notify startup and talent
                        EmailHandler(
                            [company_email, contract.talent.user.email]
                        ).send_basic_email(
                            "Payment Successful",
                            f"The payment of {salary:.2f} was successful and {tiaago_fees:.2f} was deducted as platform fees. Payment is pending approval. {net_amount:.2f} will be credited into talent's wallet once approved",
                        )
                        return Response(
                            {"message": "Payment charged and verified successfully"},
                            status=status.HTTP_200_OK,
                        )
                    else:
                        EmailHandler(
                            [company_email, contract.talent.user.email]
                        ).send_basic_email(
                            "Payment Failed",
                            f"The payment attempt for {salary:.2f} failed. We will retry on the 25th.",
                        )
                        return Response(
                            {"message": "Payment verification failed"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    return Response(
                        {"message": "Card charge failed"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            except Exception as e:
                return Response(
                    {"message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # Deduct from wallet and transfer to talent
            company_wallet.balance -= talent_salary
            company_wallet.save()

            try:
                talent_wallet = Wallet.objects.get(user=contract.talent.user)
                talent_wallet.balance += talent_salary * Decimal(
                    0.9
                )  # Net amount after fees
                talent_wallet.save()

                # Record transaction and send notifications
                tiaago_fees, net_amount = calculate_fees(talent_salary)
                WalletTransaction.objects.create(
                    user=company_rep,
                    ref=generate_transaction_reference(),
                    tiaago_fees=tiaago_fees,
                    transaction_type=WalletTransaction.TRANSACTION_TYPE.CREDIT_TALENT_WALLET,
                    status="available",
                    wallet=talent_wallet,
                    amount=net_amount,
                )
                EmailHandler([contract.talent.user.email]).send_basic_email(
                    "Payment Successful",
                    f"The payment of {salary:.2f} was successful and {tiaago_fees:.2f} was deducted as platform fees. {net_amount:.2f} has been credited into your wallet",
                )
                EmailHandler(company_email).send_basic_email(
                    "Wallet DebitSuccessful",
                    f"The sum of {salary:.2f} for {contract.talent.user.first_name}'s salary was deducted from your wallet",
                )
                return Response(
                    {"message": "Talent wallet funded successfully"},
                    status=status.HTTP_200_OK,
                )
            except Wallet.DoesNotExist:
                return Response(
                    {"message": "Talent wallet not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )


class ApprovePaymentView(generics.GenericAPIView):
    """
    Approves a payment transaction, changing its status to 'Available'
    and updating the talent's wallet balance. It also sends a notification
    to the talent that the payment was approved.
    """

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, transaction_id):

        try:
            # Attempt to retrieve the transaction with the given ID and status 'Pending'
            transaction = WalletTransaction.objects.get(
                id=transaction_id, status="pending"
            )
        except WalletTransaction.DoesNotExist:
            return Response(
                {"message": "Transaction not found or already processed."}, status=404
            )

        # Ensure the requesting user is authorized
        company = transaction.contract.company
        if request.user != company.company_rep:
            return Response({"message": "Unauthorized action."}, status=403)

        # Update status to "Available" and notify talent
        transaction.status = "available"
        transaction.transaction_type = (
            WalletTransaction.TRANSACTION_TYPE.CREDIT_TALENT_WALLET
        )
        transaction.save()
        # referral reward logic

        talent = transaction.contract.talent
        if talent.referred_by:
            try:
                referral = Referral.objects.get(invitee=talent.user)
            except Referral.DoesNotExist:
                return Response(
                    {"message": "Talent not linked to a Referral model"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not referral.has_received_reward:
                try:
                    inviter_wallet = Wallet.objects.get(user=referral.inviter.user)
                except Wallet.DoesNotExist:
                    return Response(
                        {"message": "Wallet not found for inviter"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                platform_fees = transaction.tiaago_fees
                reward = calculate_referral_reward(platform_fees=platform_fees)

                inviter_wallet.balance += reward
                inviter_wallet.save()

                referral.reward = reward
                referral.has_received_reward = True
                WalletTransaction.objects.create(
                    user=referral.inviter.user,
                    contract=transaction.contract,
                    wallet=inviter_wallet,
                    referral=referral,
                    amount=reward,
                    tiaago_fees=platform_fees,
                    transaction_type=WalletTransaction.TRANSACTION_TYPE.TALENT_REFERRAL_REWARD,
                    ref=generate_transaction_reference(),
                    transfer_code="",
                    recipient_code="",
                    status="available",
                )
                referral.save()
        amount = transaction.amount
        # Update wallet balance
        Wallet.objects.filter(id=transaction.wallet.id).update(
            balance=F("balance") + amount
        )

        # Trigger notification to talent
        EmailHandler(talent.user.email).send_basic_email(
            "Payment Approved",
            f"Your payment of {amount} has been approved and is now available in your wallet.",
        )
        return Response(
            {"message": "Payment approved successfully."}, status=status.HTTP_200_OK
        )


class TalentRecipientCodeView(generics.GenericAPIView):
    """
    Generates or retrieves a recipient code for the talent based on their bank account details.
    It checks if the account is valid and associates the recipient code with the talent.
    """

    serializer_class = TalentRecipientCodeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account_number = serializer.validated_data["account_number"]
        bank_name = serializer.validated_data["bank_name"]

        # Get the user and their talent profile
        user = request.user
        try:
            talent = TalentProfile.objects.get(user=user)
        except TalentProfile.DoesNotExist:
            return Response(
                {"message": "Talent profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if the bank is in the database
        try:
            bank = Bank.objects.get(name__iexact=bank_name)
        except Bank.DoesNotExist:
            return Response(
                {"message": "Bank not found. Please select a valid bank."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve account 
        
        #print(f"Bank Code: {bank.code}, Account Number: {account_number}")
        response = paystack_handler.resolve_account(account_number, bank.code)
        if not response.get("status"):
            error_message = response.get("message", "Invalid account details.")
            return Response(
                {"message": error_message}, status=status.HTTP_400_BAD_REQUEST
            )

        account_name = response["data"]["account_name"]

        # Check if recipient code already exists, else create it
        if not talent.recipient_code:
            recipient_response = paystack_handler.get_talent_recipient_code(
                type="nuban",
                name=account_name,
                account_number=account_number,
                bank_code=bank.code,
            )
            if not recipient_response.get("status"):
                return Response(
                    {"message": "Failed to generate recipient code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            talent.recipient_code = recipient_response["data"]["recipient_code"]
            talent.account_name = account_name
            talent.account_number = account_number
            talent.bank_name = bank.name
            talent.save()

        return Response(
            {"message": "Recipient code successfully generated."},
            status=status.HTTP_200_OK,
        )


class TalentPayoutView(generics.GenericAPIView):
    """
    Processes a payout request for the talent. It ensures the user has a sufficient balance
    in their wallet and a recipient code for the transfer, and initiates the transfer to the bank.
    """

    serializer_class = TalentPayoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Serialize and validate input data
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        amount = serializer.validated_data.get("amount")

        # Retrieve the user's wallet
        try:
            talent_wallet = Wallet.objects.get(user=user)
        except Wallet.DoesNotExist:
            return Response(
                {"message": "No Wallet linked to user"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Retrieve the user's TalentProfile and check for the recipient code
        try:
            talent_profile = user.profile
            recipient_code = talent_profile.recipient_code
        except TalentProfile.DoesNotExist:
            return Response(
                {
                    "message": "Talent profile not found. Please complete your profile setup."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if the user has a recipient code

        if not recipient_code:
            return Response(
                {"message": "Recipient code not found. Please add bank details first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure wallet balance is sufficient
        if amount > talent_wallet.balance:
            return Response(
                {"message": "Insufficient wallet balance"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Initiate transfer
        transfer_response = paystack_handler.initiate_transfer_to_bank(
            source="balance",
            reason="Payout to bank",
            amount=amount,
            recipient=recipient_code,
        )

        # Check transfer response
        if not transfer_response.get("status"):
            return Response(
                {
                    "message": transfer_response.get(
                        "message", "Transfer failed. Please try again."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        bank_transfer_ref = transfer_response["data"]["reference"]

        # Save transaction and update wallet balance atomically
        try:
            with transaction.atomic():
                # Save transaction using the serializer
                transaction_obj = serializer.save(
                    user=user,
                    ref=bank_transfer_ref,
                    transaction_type=WalletTransaction.TRANSACTION_TYPE.TALENT_BANK_TRANSFER_PAYOUT,
                    status="pending",
                )

                # Deduct balance
                talent_wallet.balance -= amount
                talent_wallet.save()

            return Response(
                {
                    "message": "Transfer initiated successfully",
                    "transaction": {
                        "id": transaction_obj.id,
                        "reference": bank_transfer_ref,
                        "amount": amount,
                        "status": "pending",
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            # Handle unexpected errors during the atomic operation
            return Response(
                {
                    "message": "An error occurred while processing the payout.",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PaystackWebhookView(generics.GenericAPIView):
    """
    Webhook endpoint for Paystack to notify the system of transfer status updates.
    It verifies the signature of the request and processes transfer success,
    failure, or reversal events.
    """

    @csrf_exempt
    def post(self, request, *args, **kwargs):
        # Get the request body and signature
        request_body = request.body
        paystack_signature = request.headers.get("x-paystack-signature")

        # Calculate the expected signature
        secret_key = settings.PAYSTACK_PRIVATE_KEY.encode("utf-8")
        calculated_signature = hmac.new(
            secret_key, request_body, hashlib.sha512
        ).hexdigest()

        # Verify that the signature matches
        if calculated_signature != paystack_signature:
            return Response({"message": "Invalid signature"}, status=400)

        # Parse the incoming event
        event_data = json.loads(request_body)
        event = event_data.get("event")

        if event == "transfer.success":
            return self.handle_transfer_success(event_data)
        elif event == "transfer.failed":
            return self.handle_transfer_failed(event_data)
        elif event == "transfer.reversed":
            return self.handle_transfer_reversed(event_data)
        elif event == "charge.success":
            return self.handle_charge_success(event_data)
        else:
            return Response({"message": "Unknown event"}, status=400)

    def handle_transfer_success(self, event_data):
        reference = event_data["data"]["reference"]
        try:
            transaction = WalletTransaction.objects.get(ref=reference)
            transaction.status = "success"
            transaction.save()
            return Response(
                {"message": "Transfer successfully marked as successful"}, status=200
            )
        except WalletTransaction.DoesNotExist:
            return Response({"message": "Transaction not found"}, status=404)

    def handle_transfer_failed(self, event_data):
        reference = event_data["data"]["reference"]
        try:
            transaction = WalletTransaction.objects.get(ref=reference)
            transaction.status = "failed"
            transaction.save()
            return Response({"message": "Transfer failed"}, status=200)
        except WalletTransaction.DoesNotExist:
            return Response({"message": "Transaction not found"}, status=404)

    def handle_transfer_reversed(self, event_data):
        reference = event_data["data"]["reference"]
        try:
            transaction = WalletTransaction.objects.get(ref=reference)
            transaction.status = "reversed"
            transaction.save()
            return Response({"message": "Transfer reversed"}, status=200)
        except WalletTransaction.DoesNotExist:
            return Response({"message": "Transaction not found"}, status=404)
    def handle_charge_success(self, event_data):
        reference = event_data["data"]["reference"]
        amount_paid = int(event_data["data"]["amount"]) / 100
        status = event_data["data"]["status"]
        
        if status == "success":
            try:
                payment = SkillAssessmentPayment.objects.get(payment_reference=reference)
                if not payment.is_paid:
                    payment.is_paid = True
                    payment.paid_at = timezone.now()
                    payment.save(update_fields=['is_paid', 'paid_at'])
                    return Response({"message": "Assessment payment marked as paid"}, status=200)
                else:
                    return Response({"message": "Already marked as paid"}, status=200)
            except SkillAssessmentPayment.DoesNotExist:
                return Response({"message": "Payment not found"}, status=404)
        else:
            return Response({"message": "Payment not successful"}, status=400)

class TalentPendingPaymentsView(generics.ListAPIView):
    """
    View to list all pending transactions for a talent linked to a contract.
    """

    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return pending transactions for the wallet associated with the current user's talent profile.
        """
        user = self.request.user

        try:
            talent_wallet = Wallet.objects.filter(user=user)
        except Wallet.DoesNotExist:
            return WalletTransaction.objects.none()

        # Filter pending transactions linked to these wallets
        return WalletTransaction.objects.filter(
            wallet_id__in=talent_wallet, status="pending"
        )

    def list(self, request, *args, **kwargs):
        """
        Custom response when no pending payments are found.
        """
        queryset = self.get_queryset()
        if not queryset.exists():
            return Response(
                {"message": "No pending payments found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TalentWithdrawalHistoryView(generics.ListAPIView):
    """
    Lists all transactions related to payouts made to the talent's bank account.
    """

    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Get the wallet associated with the currently authenticated user
        wallet = Wallet.objects.filter(user=self.request.user).first()

        if not wallet:
            return WalletTransaction.objects.none()

        # Filter transactions linked to the wallet and of the correct type
        return WalletTransaction.objects.filter(
            wallet=wallet,
            transaction_type=WalletTransaction.TRANSACTION_TYPE.TALENT_BANK_TRANSFER_PAYOUT,
        )

class PricingCreateView(generics.CreateAPIView):
    queryset = Pricing.objects.all()
    serializer_class = PricingSerializer
    permission_classes = [IsAdminUser]
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
class PricingListView(generics.ListAPIView):
    queryset = Pricing.objects.filter(is_active=True)
    serializer_class = PricingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, DjangoFilterBackend]
    filterset_fields = ['price', 'name']
    search_fields = ['name']
    pagination_class = TiaagoPagination

class SetupIntentCreateView(generics.CreateAPIView):
    serializer_class = EmptySetupIntentSerializer
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        try:
            user = request.user
            if not user.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=user.email
                )
                user.stripe_customer_id = customer.id
                user.save()

            setup_intent = stripe.SetupIntent.create(
                customer=user.stripe_customer_id,
                payment_method_types=['card'],
            )
            return Response({
                'client_secret': setup_intent.client_secret
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
class PaymentMethodListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = TiaagoPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PaymentMethodCreateSerializer
        return PaymentMethodListSerializer

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)
    def post(self, request, *args, **kwargs):
        stripe_payment_method_id = request.data.get('payment_method_id')
        
        try:
            payment_method = stripe.PaymentMethod.retrieve(stripe_payment_method_id)
            user = request.user
            existing = PaymentMethod.objects.filter(
                user=user,
                stripe_payment_method_id=payment_method.id
            ).first()
            if existing:
                return Response({'detail': 'This payment method already exists.'}, status=status.HTTP_200_OK)
            is_first_payment_method = not PaymentMethod.objects.filter(user=user).exists()
            stripe.PaymentMethod.attach(
                payment_method.id,
                customer=user.stripe_customer_id,
            )
            if is_first_payment_method:
                stripe.Customer.modify(
                    user.stripe_customer_id,
                    invoice_settings={'default_payment_method': payment_method.id}
                )
                
            #take price id from env instead of db
            stripe_price_id=settings.STRIPE_PRICE_ID_STANDARD_JOB_POSTING
            if not stripe_price_id:
                return Response({'detail': 'Pricing not found.'}, status=status.HTTP_400_BAD_REQUEST)
            subscription = stripe.Subscription.create(
                customer=user.stripe_customer_id,
                items=[{
                    'price': stripe_price_id,
                }],
                default_payment_method=payment_method.id
            )
            subscription_item_id = subscription['items']['data'][0]['id']
            PaymentMethod.objects.create(
                user=user,
                stripe_payment_method_id=payment_method.id,
                card_last4=payment_method.card.last4,
                card_brand=payment_method.card.brand,
                exp_month=payment_method.card.exp_month,
                exp_year=payment_method.card.exp_year,
                subscription_item_id=subscription_item_id,
                is_default=is_first_payment_method  
            )
            
            return Response({'detail': 'card added successfully and subscription created' if is_first_payment_method else 'card added successfully'})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
class SetDefaultPaymentMethodView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SetDefaultPaymentMethodSerializer

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)

class DeletePaymentMethodView(generics.DestroyAPIView):
    """View for deleting a payment method."""
    serializer_class = EmptySetupIntentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Prevent schema generation from breaking
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return PaymentMethod.objects.none()
        return PaymentMethod.objects.filter(user=self.request.user)
    def delete(self, request, *args, **kwargs):
        payment_method = self.get_object()
        
        if PaymentMethod.objects.filter(user=request.user).count() == 1:
            return Response({
                'detail': 'Cannot delete the only payment method'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if payment_method.is_default:
            return Response({
                'detail': 'Cannot delete default payment method'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if payment_method.stripe_payment_method_id:
                try:
                    stripe.PaymentMethod.detach(payment_method.stripe_payment_method_id)
                except:
                    pass
            elif payment_method.paystack_card_signature:
                pass
            payment_method.delete()
            
            return Response({
                'detail': 'Payment method deleted successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'detail': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

#testing view and serializer to simulate the stripe usage accumulation
from jobs.models import JobApplication
class JobPostUsageSerializer(serializers.Serializer):
    value = serializers.IntegerField(min_value=1)
    service_type = serializers.ChoiceField(choices=["resume_analysis", "skill_assessment", "interview_screening"])
    identifier = serializers.CharField(required=False)
    timestamp = serializers.IntegerField(required=False)
class TestUsageReportView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        if not request.user.stripe_customer_id:
            return Response(
                {"detail": "User is not linked to a Stripe customer."},
                status=status.HTTP_400_BAD_REQUEST
            )
        payload = {
            "event_name": "resume_analyzed_skill_assessment_and_screening",
            "payload[stripe_customer_id]": request.user.stripe_customer_id,
            "payload[value]": "1",# str(data["value"]),
            "identifier": str(uuid.uuid4())#data.get("identifier", str(uuid.uuid4())),
            
        }
        try:
            response = requests.post(
                "https://api.stripe.com/v1/billing/meter_events",
                headers={"Authorization": f"Bearer {STRIPE_API_KEY}"},
                data=payload,
            )
            job_application = JobApplication.objects.filter(id=2).first()
            UsageEvent.objects.create(
                job_application=job_application,  
                service_type="resume_analysis",
                stripe_event_id=payload["identifier"],
                quantity=1
            )
            

            return Response(response.json(), status=response.status_code)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
#testing view end here
class InvoiceListView(generics.ListAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, DjangoFilterBackend]
    filterset_fields = ['amount', 'status']
    search_fields = ['stripe_invoice_id', 'amount', 'created_at']
    pagination_class = TiaagoPagination
    def get_queryset(self):
        return Invoice.objects.filter(user=self.request.user)

class UsageEventListView(ListAPIView):
    serializer_class = UsageEventSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TiaagoPagination
    def get_queryset(self):
        usage = UsageEvent.objects.filter(
            job_application__job__company__company_rep=self.request.user
        )  
        if usage.exists():
            return usage
        return UsageEvent.objects.all()
class UsageEventDetailView(RetrieveAPIView):
    queryset = UsageEvent.objects.all()
    serializer_class = UsageEventSerializer
    permission_classes = [IsAuthenticated]
    
#paystack webhook

@csrf_exempt
def paystack_webhook(request):
    payload = request.body
    signature = request.headers.get("x-paystack-signature")
    # Validate signature
    expected_signature = hmac.new(
        settings.PAYSTACK_PRIVATE_KEY.encode("utf-8"),
        payload,
        hashlib.sha512
    ).hexdigest()

    if signature != expected_signature:
        return JsonResponse({"error": "Invalid signature"}, status=400)

    # Parse JSON
    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid payload"}, status=400)

    event_type = event.get("event")
    data = event.get("data", {})
    if event_type == "charge.success":
        reference = data.get("reference")
        amount_paid = int(data.get("amount", 0)) / 100 
        metadata = data.get("metadata")
        coupon_code = metadata.get("coupon_code") if isinstance(metadata, dict) else None
        try:
            payment = SkillAssessmentPayment.objects.get(payment_reference=reference)

            if not payment.is_paid:
                payment.is_paid = True
                payment.paid_at = timezone.now()
                payment.save(update_fields=['is_paid', 'paid_at'])
                if coupon_code:
                    try:
                        coupon = Coupon.objects.get(code=coupon_code)
                        if not CouponUsage.objects.filter(coupon=coupon, user=payment.talent.user).exists():
                            CouponUsage.objects.create(coupon=coupon, user=payment.talent.user)
                            coupon.used_count += 1
                            coupon.save(update_fields=["used_count"])
                        else:
                            logger.warning(f"Coupon {coupon.code} already used by user {payment.talent.user.id}")
                    except Coupon.DoesNotExist:
                        logger.error(f"Coupon with code {coupon_code} does not exist")

        except SkillAssessmentPayment.DoesNotExist:
            return JsonResponse({"error": "Payment not found"}, status=404)

    return HttpResponse(status=200)

#webhook for stripe ,handling sucee and failed event 
@csrf_exempt
def stripe_webhook(request):
    logger.info(f"request: {request}")
    payload = request.body
    sig_header = request.META['HTTP_STRIPE_SIGNATURE']
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    event_type = event['type']
    data_object = event['data']['object']
    if event_type == 'invoice.paid':
        handle_paid_invoice(data_object)
    elif event_type == 'invoice.payment_failed':
        handle_payment_failed(data_object)
    elif event_type == 'invoice.payment_failed':
        handle_payment_failed(data_object)
    elif event_type == 'checkout.session.completed':
        handle_checkout_success(data_object)
    return HttpResponse(status=200)
def handle_paid_invoice(invoice_data):
    try:
        user = User.objects.get(stripe_customer_id=invoice_data['customer']) 
    except User.DoesNotExist:
        return

    Invoice.objects.create(
        user=user,
        stripe_invoice_id=invoice_data['id'],
        amount=invoice_data['amount_paid'] / 100, 
        status='paid',
        invoice_pdf=invoice_data.get('invoice_pdf'),
        paid_at=timezone.now()
    )
    UsageEvent.objects.filter(
        provider='stripe',
        billed=False,
        job_application__job__company__company_rep=user 
    ).update(
        billed=True,
        billed_at=timezone.now(),
        external_id=invoice_data['id']
    )
    EmailHandler(user.email).send_basic_email(
        subject="Payment received – thank you!",
        message=f"""
                Your payment of ₦{invoice_data['amount_paid'] / 100} was successful.View your invoice: {invoice_data.get('invoice_pdf')}
                Thanks for using Tiaago!
                """
            )

def handle_payment_failed(invoice_data):
    try:
        user = User.objects.get(stripe_customer_id=invoice_data['customer'])
    except User.DoesNotExist:
        return

    Invoice.objects.create(
        user=user,
        stripe_invoice_id=invoice_data['id'],
        amount=invoice_data['amount_due'] / 100,
        status='uncollectible',
        invoice_pdf=invoice_data.get('invoice_pdf'),
        created_at=timezone.now()
    )
    EmailHandler(user.email).send_basic_email(
        subject="Payment failed!",
        message=f"""
                Your payment of ₦{invoice_data['amount_paid'] / 100} was successful.View your invoice:{invoice_data.get('invoice_pdf')}
                Thanks for using Tiaago!
                """
            )
def handle_checkout_success(session):
    reference = session['id'] 
    coupon_code = session.get("metadata", {}).get("coupon_code") 
    try:
        payment = SkillAssessmentPayment.objects.get(payment_reference=reference)
        if not payment.is_paid:
            payment.is_paid = True
            payment.paid_at = timezone.now()
            payment.save(update_fields=['is_paid', 'paid_at'])
            if coupon_code:
                try:
                    coupon = Coupon.objects.get(code=coupon_code)
                    if not CouponUsage.objects.filter(coupon=coupon, user=payment.talent.user).exists():
                        CouponUsage.objects.create(coupon=coupon, user=payment.talent.user)
                        coupon.used_count += 1
                        coupon.save(update_fields=["used_count"])
                    else:
                        logger.warning(f"Coupon {coupon.code} already used by user {payment.talent.user.id}")
                except Coupon.DoesNotExist:
                    logger.error(f"Coupon with code {coupon_code} does not exist")

    except SkillAssessmentPayment.DoesNotExist:
        logger.debug(f"No coupon code provided for payment ")


#paystack payg
class PaystackPaymentMethodCreateView(generics.CreateAPIView):
    """
    Saves a reusable (reusable=true) Paystack card for the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = PaystackPaymentMethodSerializer
    queryset           = PaymentMethod.objects.none() 

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reference = serializer.validated_data["transaction_ref"]
        
        verify_url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers    = {"Authorization": f"Bearer {settings.PAYSTACK_PRIVATE_KEY}"}
        logger.info(f"Headers: {headers}")
        logger.info(f"verify_url: {verify_url}")

        try:
            resp = requests.get(verify_url, headers=headers, timeout=15)
            resp.raise_for_status()
        except Exception as exc:
            return Response(
                {"detail": f"Unable to contact Paystack: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        payload = resp.json()
        if not payload.get("status"):
            return Response({"detail": "Transaction verification failed."}, status=400)

        txn       = payload["data"]
        customer  = txn.get("customer", {})
        auth      = txn.get("authorization", {})
        signature = auth.get("signature")
        reusable  = auth.get("reusable", False)

        customer_code = customer.get("customer_code")
        if customer_code and not request.user.paystack_customer_id:
            request.user.paystack_customer_id = customer_code
            request.user.save(update_fields=["paystack_customer_id"])

        if PaymentMethod.objects.filter(
            user=request.user,
            paystack_card_signature=signature
        ).exists():
            return Response({"detail": "Card already exists."}, status=200)

        if reusable:
            is_first = not PaymentMethod.objects.filter(user=request.user).exists()
            PaymentMethod.objects.create(
                user=request.user,
                paystack_authorisation_code=auth.get("authorization_code"),
                paystack_card_signature=signature,
                card_last4=auth.get("last4"),
                card_brand=auth.get("brand"),
                exp_month=auth.get("exp_month"),
                exp_year=auth.get("exp_year"),
                is_default=is_first
            )
            return Response({"detail": "Card saved successfully."}, status=201)

        
        return Response(
            {"detail": "Card is not reusable; cannot be saved."},
            status=status.HTTP_400_BAD_REQUEST
        )
#upcoming invoice
class UpcomingInvoiceView(ListAPIView):
    """
    Returns the PAY‑as‑you‑go usage total for the *current* open
    20th‑based billing cycle and the next due date.
    """
    permission_classes = [IsAuthenticated]
    queryset = []
    
    def list(self, request, *args, **kwargs):
        user = request.user
        if not user.is_company():
            return Response(
                {"detail": "Only company representatives can view invoices."},
                status=403,
            )
        qty, cycle_start, due_date = usage_unbilled_for_company(user.company)
        amount_due = qty * UNIT_PRICE_NGN
        today      = cycle_start 
        status = (
            "overdue" if amount_due and today > due_date else "open"
        )

        payload = {
            "amount_due": int(amount_due),
            "due_date": due_date.isoformat(),
            "units": qty,
            "status": status,
        }
        return Response(payload)
    
class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.all().order_by("-created_at")
    serializer_class = CommunitySerializer
    permission_classes = [IsAdminUser] 
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["created_at", "name"]
    ordering = ["-created_at"]
    pagination_class = TiaagoPagination
    
class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.select_related("community").all().order_by("-created_at")
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["code", "community__name"] 
    ordering_fields = ["created_at", "expires_at", "max_usage", "used_count"]
    ordering = ["-created_at"]
    pagination_class = TiaagoPagination

