from rest_framework import serializers

from .models import (
    SubPlan,
    Subscription,
    PaystackPlan,
    PaystackSubscription,
    StripePlanPrice,
    StripeSubscription,
    WalletTransaction,
    FreePlan,
    UserUsage,
    SubscriptionTransaction,
)


from .models import (
    SubPlan,
    Subscription
)

class SubPlanSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = SubPlan
        fields = ('pk', 'name', 'sub_type', 'user_type', 'amount', 'no_of_days', 'currency')
        read_only_fields = ('pk',)

class SubscriptionSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.email')
    sub_plan = serializers.ReadOnlyField(source='sub_plan.name')

    class Meta:
        model = Subscription
        fields = ('pk', 'company', 'sub_plan', 'status', 'start_date', 'end_date', 'transaction_reference')
        read_only_fields = ('pk', 'start_date', 'end_date', 'status', 'transaction_reference')
        
class PaystackPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaystackPlan
        fields = ["id", "name", "plan_code", "interval", "amount",  "created_at"]
        read_only_fields = ["id", "plan_code", "created_at"]
    
class PaystackSubscriptionSerializer(serializers.Serializer):
    plan_code = serializers.CharField()


class PaystackSubscriptionModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaystackSubscription
        fields = ["id", "company", "plan", "customer_code", "status", "next_payment_date", "started_at", "cancelled_at"]

class StripePlanPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StripePlanPrice
        fields = ["id", "name", "description", "price_id", "currency", "unit_amount", "recurring_interval"]
        read_only_fields = ["id", "price_id"]


class StripeSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StripeSubscription
        fields = ["id", "company", "plan", "subscription_id", "status", "started_at", "cancelled_at"]
        read_only_fields = ["id", "subscription_id", "started_at", "cancelled_at"]

class UsageBaseWalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ["id", "wallet", "transaction_type", "amount", "currency", "reference", "created_at"]
        read_only_fields = ["id", "created_at"]

class FreePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = FreePlan
        fields = ["id", "company", "resume_limit", "assessment_limit", "created_at"]
        read_only_fields = ["id", "created_at"]

class UserUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserUsage
        fields = ["id", "company", "resumes_used", "assessments_used", "last_reset"]
        read_only_fields = ["id", "last_reset"]

class SubscriptionTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTransaction
        fields = ["id", "company", "company_email", "plan_name", "provider", "reference", "amount", "next_payment_date", "status", "channel", "paid_at", "created_at"]
        read_only_fields = ["id", "created_at"]