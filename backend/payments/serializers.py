import stripe
from rest_framework import serializers
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from subscriptions.models import SubPlan
from create_user.models import ReferralWallet, WithdrawalRequest
from .services import WithdrawalService
from .models import (
    Community, Coupon, UsageEvent, Payment, Wallet, WalletTransaction,
    Card, Bank, Pricing, PaymentMethod, Invoice
)


class PaymentInvoiceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Payment
        fields = ("id", "ref", "plan_id", "date_created", "status")


class PaymentSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    plan_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "user",
            "ref",
            "date_created",
            "date_modified",
            "status",
            "plan_id",
        )
        read_only_fields = (
            "id",
            "user",
            "status",
            "ref",
            "date_created",
            "date_modified",
        )

    def get_plan_name(self, obj):
        sub = SubPlan.objects.get(id=obj.plan_id)
        return sub.name


class CreateWalletSerializer(serializers.ModelSerializer):
    # balance = serializers.SerializerMethodField()

    # def get_balance(self, obj):
    #     bal = WalletTransaction.objects.filter(
    #         wallet=obj,
    #         status="success"
    #     ).aggregate(Sum("amount"))[("amount__sum")]

    #     return bal
    class Meta:
        model = Wallet
        fields = ["id", "user", "currency", "balance", "pin", "user_type"]
        read_only_fields = ["id", "user", "balance"]

    def create(self, validated_data):
        user = self.context["request"].user
        pin = validated_data.pop("pin")
        wallet = Wallet.objects.create(user=user, **validated_data)
        wallet.set_pin(pin)
        wallet.save()
        return wallet


class FundWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ["amount", "wallet", "status"]
        read_only_fields = ["wallet"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value


class WalletTransactionSerializer(serializers.ModelSerializer):
    contract_id = serializers.IntegerField(required=True)

    class Meta:
        model = WalletTransaction
        fields = [
            "id",
            "user",
            "amount",
            "contract_id",
            "card",
            "wallet",
            "referral",
            "transaction_type",
            "status",
            "ref",
            "retry_attempts",
            "next_retry_date",
            "date_created",
            "date_modified",
            "tiaago_fees",
        ]
        read_only_fields = [
            "id",
            "date_created",
            "wallet",
            "referral",
            "transaction_type",
            "ref",
            "retry_attempts",
            "next_retry_date",
            "status",
            "date_modified",
            "amount",
            "tiaago_fees",
        ]


class TalentRecipientCodeSerializer(serializers.Serializer):
    account_number = serializers.CharField(max_length=10)
    bank_name = serializers.CharField(max_length=100)


class TalentPayoutSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = WalletTransaction
        fields = ["amount"]

    def create(self, validated_data):
        user = self.context.get("user")
        ref = validated_data.pop("ref", None)
        transaction_type = validated_data.pop(
            "transaction_type",
            WalletTransaction.TRANSACTION_TYPE.TALENT_BANK_TRANSFER_PAYOUT,
        )
        status = validated_data.pop("status", "pending")

        # Create and return the WalletTransaction
        return WalletTransaction.objects.create(
            user=user,
            ref=ref,
            transaction_type=transaction_type,
            status=status,
            **validated_data
        )


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = "__all__"


class BankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bank
        fields = "__all__"

class PricingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pricing
        fields = '__all__'

class EmptySetupIntentSerializer(serializers.Serializer):
    pass

class PaymentMethodCreateSerializer(serializers.Serializer):
    payment_method_id = serializers.CharField()


class PaymentMethodListSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ['id', 'card_last4', 'card_brand', 'exp_month', 'exp_year', 'is_default']

class InvoiceSerializer(serializers.ModelSerializer):
    invoice = serializers.SerializerMethodField()
    billing_date = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ['invoice', 'amount', 'billing_date', 'invoice_pdf','paystack_reference_id','stripe_invoice_id','status']

    def get_invoice(self, obj):
        created_date = obj.created_at
        if obj.stripe_invoice_id:
            invoice_id = obj.stripe_invoice_id.replace('in_', '')[-8:]
        else:
            invoice_id = "N/A"
        return f"#{invoice_id}-{created_date.strftime('%b-%Y')}"

    def get_billing_date(self, obj):
        return obj.created_at.strftime("%b %d, %Y")

    def get_amount(self, obj):
        return f"${obj.amount:.2f}" if obj.amount else "$0.00"

class UsageEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageEvent
        fields = '__all__'

#paystack

class PaystackPaymentMethodSerializer(serializers.Serializer):
    transaction_ref = serializers.CharField(required=True)
    
class SetDefaultPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["id", "is_default", "stripe_payment_method_id", "paystack_card_signature"]
        read_only_fields = fields 
    def update(self, instance, validated_data):
        user = instance.user

        if instance.stripe_payment_method_id:
            stripe.Customer.modify(
                user.stripe_customer_id,
                invoice_settings={'default_payment_method': instance.stripe_payment_method_id}
            )

        
        elif instance.paystack_card_signature:
            pass

        
        PaymentMethod.objects.filter(user=user).update(is_default=False)
        instance.is_default = True
        instance.save()
        return instance


class CouponSerializer(serializers.ModelSerializer):
    remaining_uses = serializers.SerializerMethodField()
    community_name = serializers.CharField(source="community.name", read_only=True)
    community_id = serializers.PrimaryKeyRelatedField(
        queryset=Community.objects.all(), source="community"
    )

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "community_id",
            "community_name",
            "discount_amount_ngn",
            "discount_amount_usd",
            "discount_percent",
            "max_usage",
            "used_count",
            "expires_at",
            "created_at",
            "remaining_uses",
        ]
        read_only_fields = ["code", "used_count", "remaining_uses", "created_at", "community_name"]

    def get_remaining_uses(self, obj):
        return max(0, obj.max_usage - obj.used_count)

    def validate(self, attrs):
        percent = attrs.get("discount_percent")
        ngn = attrs.get("discount_amount_ngn")
        usd = attrs.get("discount_amount_usd")
        if percent is None and not ngn and not usd:
            raise serializers.ValidationError(
                "Provide discount_percent or at least one of discount_amount_ngn/discount_amount_usd."
            )
        if percent is not None and (ngn or usd):
            raise serializers.ValidationError("Use either percent OR fixed amounts, not both.")
        return attrs

    def create(self, validated_data):
        community = validated_data.get("community")
        validated_data["code"] = Coupon.generate_code(community.name)
        return super().create(validated_data)


class CommunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Community
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class ReferralRewardTransactionSerializer(serializers.ModelSerializer):
    """Serializer for referral reward transactions"""
    referred_user = serializers.SerializerMethodField()
    transaction_type_display = serializers.CharField(source='get_transaction_type_display')

    class Meta:
        model = WalletTransaction
        fields = [
            'id',
            'amount',
            'transaction_type',
            'transaction_type_display',
            'ref',
            'status',
            'referred_user',
            'date_created'
        ]

    def get_referred_user(self, obj):
        if obj.referral:
            return obj.referral.invitee.get_full_name()
        return None