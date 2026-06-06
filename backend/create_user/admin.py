from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin

# from allauth.account.models import EmailConfirmation

from .forms import CustomUserCreationForm, CustomUserChangeForm
from .models import TalentProfile, Company, OneTimePassword, CustomUser, CompanyTeamMember, CompanyTeamInvite

CustomUser = get_user_model()


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser
    list_display = ("email", "pk", "username", "user_type", "verified")
    list_filter = ()
    fieldsets = (
        *UserAdmin.fieldsets,
        (
            "Custom Field Heading",
            {
                "fields": (
                    "phone_number",
                    "country",
                    "profile_pic",
                    "user_type",
                    "verified",
                )
            },
        ),
    )


@admin.register(TalentProfile)
class TalentProfileAdmin(admin.ModelAdmin):
    list_select_related = ["user", "role"]
    autocomplete_fields = ["user", "role"]
    list_filter = ["user"]
    list_display = (
        "user",
        "pk",
        "gender",
        "experience_level",
        "role",
        "has_passed_tiaago_assessment",
    )
    search_fields = ["user__username", "user__email"]
    fieldsets = (

        ("Personal Information", {"fields": ("user", "gender")}),
        (
            "Professional Details",
            {
                "fields": (
                    "experience_level",
                    "role",
                    "portfolio",
                    "resume",
                    "has_passed_tiaago_assessment",
                ),
                "description": "Information about experience and professional role",
            },
        ),
    )


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("company_rep", "pk", "company_name")
    fieldsets = (
        (
            "Company Details",
            {"fields": ("company_name", "company_email", "website", "address")},
        ),
    )
    search_fields = ["company_name"]


# # register allauth email confirmation model to admin
# @admin.register(EmailConfirmation)
# class EmailConfirmationAdmin(admin.ModelAdmin):
#     list_display = ('created', 'sent', 'key', 'email_address')
#     ordering = ('-created',)


@admin.register(OneTimePassword)
class OneTimePasswordAdmin(admin.ModelAdmin):
    list_display = ("user", "otp_expires")
    search_fields = ["user__email"]


@admin.register(CompanyTeamMember)
class CompanyTeamMemberAdmin(admin.ModelAdmin):
    list_display = ("company", "user", "role", "invited_by", "created_at")
    list_filter = ("role",)
    search_fields = ["company__company_name", "user__email"]


@admin.register(CompanyTeamInvite)
class CompanyTeamInviteAdmin(admin.ModelAdmin):
    list_display = ("company", "email", "role", "invited_by", "created_at")
    list_filter = ("role",)
    search_fields = ["company__company_name", "email"]