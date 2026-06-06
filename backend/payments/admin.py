from django.contrib import admin

from .models import Payment, Wallet, WalletTransaction, Card, Bank, TiaagoPricing, Coupon, Community


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("ref", "user", "date_created", "date_modified", "status")


@admin.register(TiaagoPricing)
class TiaagoPricingAdmin(admin.ModelAdmin):
    list_display = [
        "resume_screening_fee",
        "mcq_skill_assessment_per_candidate_fee",
        "code_skill_assessment_per_candidate_fee",
        "ai_interview_fee",
        "free_candidate_screening_count",
        "created_at",
    ]


admin.site.register(Wallet)
admin.site.register(WalletTransaction)
admin.site.register(Card)
admin.site.register(Bank)
admin.site.register(Coupon)
admin.site.register(Community)