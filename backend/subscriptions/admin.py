from django.contrib import admin

from .models import (
    Subscription,
    SubPlan,
    BachsWebhookLog,
    PaystackWebhookLog,
    PaystackPlan,
    PaystackSubscription,
    SubscriptionTransaction,
    StripePlanPrice,
    StripeSubscription,
    Wallet,
    WalletTransaction,
    FreePlan,
    UserUsage,
    WalletUserUsage,
)

@admin.register(SubPlan)
class SubPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'id', 'sub_type', 'user_type', 'amount', 'no_of_days')

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'sub_plan', 'status', 'start_date', 'end_date')

@admin.register(PaystackPlan)
class PaystackPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'plan_code', 'amount', 'interval', 'created_at')

@admin.register(PaystackSubscription)
class PaystackSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'company_email', 'plan', 'customer_code', 'status', 'next_payment_date')
    
@admin.register(SubscriptionTransaction)
class SubscriptionTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'company_email', 'plan_name', 'next_payment_date', 'amount', 'reference', 'status', 'channel', 'paid_at', 'created_at')
    
@admin.register(PaystackWebhookLog)
class PaystackWebhookLogAdmin(admin.ModelAdmin):
    list_display = ('event', 'received_at', 'processed')
    list_filter = ('processed', 'event')
    search_fields = ('event', 'notes')
    readonly_fields = ('payload',)


@admin.register(BachsWebhookLog)
class BachsWebhookLogAdmin(admin.ModelAdmin):
    """Bachs is the default wallet top-up gateway, so this is the first place
    to look when a payment succeeds on Bachs' side but the wallet is never
    credited -- crediting happens only in bachs_wallet_fund_webhook, so an
    absent row here means the delivery never reached us at all (wrong webhook
    URL in the Bachs dashboard, or blocked before Django), and a row with
    event='signature.invalid' means BACHS_WEBHOOK_SECRET doesn't match the
    dashboard's."""

    list_display = ('event', 'received_at', 'processed', 'notes')
    list_filter = ('processed', 'event')
    search_fields = ('event', 'notes')
    readonly_fields = ('payload', 'received_at')
    ordering = ('-received_at',)

@admin.register(StripePlanPrice)
class StripePlanPriceAdmin(admin.ModelAdmin):
    list_display = ('name', 'price_id', 'currency', 'unit_amount', 'recurring_interval')
    search_fields = ('name', 'price_id', 'currency')

@admin.register(StripeSubscription)
class StripeSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('company', 'company_email', 'plan', 'subscription_id', 'status', 'started_at', 'cancelled_at')
    search_fields = ('subscription_id', 'company__company_name')
    list_filter = ('status',)

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('company', 'balance', 'currency', 'updated_at')

@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('amount', 'currency', 'transaction_type', 'reference', 'description', 'created_at')
    search_fields = ('amount', 'currency', 'transaction_type')
    list_filter = ('transaction_type', 'currency', 'created_at')

@admin.register(FreePlan)
class FreePlanAdmin(admin.ModelAdmin):
    list_display = ('company', 'company_email', 'resume_limit', 'assessment_limit', 'created_at')
    search_fields = ('company__company_name',)

@admin.register(UserUsage)
class UserUsageAdmin(admin.ModelAdmin):
    list_display = ('company', 'resumes_used', 'assessments_used', 'last_reset')
    search_fields = ('company', 'resumes_used', 'assessments_used')
    list_filter = ('last_reset',)

@admin.register(WalletUserUsage)
class WalletUserUsageAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'resumes_used', 'assessments_used', 'last_reset')
    search_fields = ('wallet__company__company_name', 'resumes_used', 'assessments_used')
    list_filter = ('last_reset',)