import mimetypes
import os
from django.conf import settings
from django.contrib.auth import get_user_model
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image


def get_mime_type(file_obj):
    """Get MIME type from file object using filename extension"""
    try:
        # Reset file pointer to beginning
        file_obj.seek(0)
        # Get the filename or use a default
        filename = getattr(file_obj, 'name', 'file')
        # Get MIME type from filename extension
        mime_type, _ = mimetypes.guess_type(filename)
        # Reset file pointer back to beginning
        file_obj.seek(0)
        return mime_type or 'application/octet-stream'
    except Exception:
        return 'application/octet-stream'
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.utils.http import urlsafe_base64_decode
from django.utils import timezone
from django.db import transaction
from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
from phonenumber_field.serializerfields import PhoneNumberField
from create_user.serializers import SocialMediaLinkSerializer
from create_user.utils import generate_referral_code

from base.utils import get_media_url
from jobs.models import Portfolio, Tool
from roles.models import Role
from skill_assessment.models import CandidateAssessmentSubmission
from subscriptions.models import FreePlan

from ..models import CustomUser, Company, SocialMediaLink, TalentProfile, Referral, ReferralWallet, WithdrawalRequest, CompanyTeamMember, CompanyTeamInvite
from ..utils import get_company_billing_type, get_active_subscription, get_wallet_balance
from subscriptions.helper import convert_wallet_currency

User = get_user_model()


class ToolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tool
        fields = ["name", "category", "icon", "id"]


class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "profile_pic",
            "email",
            "user_type",
            "verified",
        )
        read_only_fields = (
            "username",
            "first_name",
            "last_name",
            "profile_pic",
            "email",
            "user_type",
            "created",
        )

def _convert_image_to_jpeg(file_obj, quality=85):
    """Convert incoming image (webp/heic/large png) to optimized JPEG."""
    file_obj.seek(0)
    im = Image.open(file_obj).convert("RGB")
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True)
    buf.seek(0)
    # Build a new UploadedFile
    name_root = (getattr(file_obj, "name", "image").rsplit(".", 1)[0]) or "image"
    new_file = InMemoryUploadedFile(
        buf,
        field_name="profile_pic",
        name=f"{name_root}.jpg",
        content_type="image/jpeg",
        size=buf.getbuffer().nbytes,
        charset=None,
    )
    return new_file


class TalentSerializer(RegisterSerializer):
    full_name = serializers.CharField()
    role = serializers.CharField()
    profile_pic = serializers.ImageField(allow_empty_file=True, required=False)
    resume = serializers.FileField(allow_empty_file=True, required=False)
    email = serializers.EmailField()
    referral_code = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField()

    class Meta:
        model = TalentProfile
        fields = (
            "id",
            "role",
            "user",
            "full_name",
            "email",
            "profile_pic",
            "resume",
            "account_name",
            "bank_name",
            "account_number",
            "created_at",
            "recipient_code",
            "referral_code",
            "country",
        )
        
    def validate_profile_pic(self, value):
        if not value:
            return value

        # Size check (early)
        if value.size > settings.UPLOAD_FILE_MAX_SIZE:
            # Try compressing before rejecting
            try:
                compressed = _convert_image_to_jpeg(value, quality=80)
                if compressed.size <= settings.UPLOAD_FILE_MAX_SIZE:
                    return compressed
            except Exception:
                pass
            raise serializers.ValidationError(
                f"Image too large. Max {settings.UPLOAD_FILE_MAX_SIZE // (1024*1024)}MB."
            )

        # Extension check
        ext = (value.name.rsplit(".", 1)[-1] or "").lower()
        if ext not in settings.WHITELISTED_IMAGE_TYPES.keys():
            # Try to convert unknown types to JPEG rather than failing
            try:
                return _convert_image_to_jpeg(value, quality=85)
            except Exception:
                raise serializers.ValidationError("Unsupported image format.")

        # Content-type check (tolerate octet-stream)
        ct_ok = value.content_type in settings.WHITELISTED_IMAGE_TYPES.values()
        is_octet = value.content_type == "application/octet-stream"
        if not ct_ok and not is_octet:
            # Try a conversion to normalize
            try:
                return _convert_image_to_jpeg(value, quality=85)
            except Exception:
                raise serializers.ValidationError("Invalid image content-type")

        # Mime-type (from filename) — be tolerant
        mime_type = get_mime_type(value)  # your helper
        mime_ok = (mime_type in settings.WHITELISTED_IMAGE_TYPES.values()) or (mime_type == "application/octet-stream")
        if not mime_ok:
            # Normalize instead of rejecting
            try:
                return _convert_image_to_jpeg(value, quality=85)
            except Exception:
                raise serializers.ValidationError("Invalid image mime-type")

        # If we reached here, pass-through original upload
        return value

    @transaction.atomic
    def save(self, request):
        user = super().save(request)
        user.full_name = self.validated_data.get("full_name", "")
        parts = user.full_name.split()
        user.first_name = parts[0] if parts else ""
        user.last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
        user.user_type = CustomUser.USER_TYPE.TALENT
        user.country = self.validated_data.get("country", "")

        pic = self.validated_data.get("profile_pic")
        if pic:
            user.profile_pic = pic  

        # Handle profile picture upload
        if 'profile_pic' in request.FILES:
            user.profile_pic = request.FILES['profile_pic']
        # Get role
        role_slug = self.validated_data.get("role")
        user.save()

        try:
            role = Role.objects.get(slug=role_slug)
        except Role.DoesNotExist:
            raise serializers.ValidationError({"role": "Invalid role provided."})

        # Extract referral_code if provided
        inviter = None
        referral_code = self.validated_data.get("referral_code", None)
        if referral_code:
            inviter = TalentProfile.objects.filter(referral_code=referral_code).first()

        # Create TalentProfile
        profile = TalentProfile.objects.create(
            user=user,
            role=role,
            referral_code=generate_referral_code(),
            referred_by=inviter,
        )

        # Handle resume upload
        if 'resume' in request.FILES:
            profile.resume = request.FILES['resume']
            profile.save()

        # Handle referral
        if inviter:
            Referral.objects.create(
                inviter=inviter,
                invitee=profile.user,
                invitee_email=user.email,
                date_invited=timezone.now(),
            )
            profile.save()
        return user

    def validate_username(self, value):
        exists = get_user_model().objects.filter(username=value).exists()
        if exists:
            return serializers.ValidationError("Username exists")

        return value

    def validate_email(self, value):
        """
        Check if the email already exists in the database.
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_role(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Role is required")
        value = value.strip()
        role = Role.objects.filter(slug__iexact=value).first()
        if role:
            return role.slug
        role = Role.objects.filter(title__iexact=value).first()
        if role:
            return role.slug
        role = Role.objects.create(title=value)
        return role.slug

    def validate_profile_pic(self, value):

        # Get the file extension
        file_extension = value.name.split(".")[-1].lower()
        # Check if the file extension is allowed
        if (
            not file_extension
            or file_extension not in settings.WHITELISTED_IMAGE_TYPES.keys()
        ):
            raise serializers.ValidationError("Only JPEG and PNG files are allowed.")

        # Check if the image size is within limits
        if value.size > settings.UPLOAD_FILE_MAX_SIZE:
            raise serializers.ValidationError("Image size too large. Max size is 1MB.")

        # check the content type
        if value.content_type not in settings.WHITELISTED_IMAGE_TYPES.values():
            raise serializers.ValidationError("Invalid image content-type")

        # check mime-type
        mime_type = get_mime_type(value)

        if (
            mime_type not in settings.WHITELISTED_IMAGE_TYPES.values()
            and mime_type != value.content_type
        ):
            raise serializers.ValidationError("Invalid image mime-type")

        return value

    def validate_resume(self, value):
        if value:
            # Check if the file size is within limits
            if value.size > settings.UPLOAD_FILE_MAX_SIZE:
                raise serializers.ValidationError(
                    "Resume file size too large. Max size is 2MB."
                )

            # Get the file extension
            file_extension = value.name.split(".")[-1].lower()
            # Check if the file extension is allowed
            ext_type = settings.WHITELISTED_RESUME_FORMAT.keys()
            if file_extension not in ext_type:
                raise serializers.ValidationError(f"Only {ext_type} files are allowed.")

            # Check MIME type using either guessed type or client-provided content type
            mime_type = get_mime_type(value)
            allowed_mimes = list(settings.WHITELISTED_RESUME_FORMAT.values())

            if (mime_type not in allowed_mimes) and (value.content_type not in allowed_mimes):
                raise serializers.ValidationError("Invalid resume mime-type")

        return value

    def validate_bio(self, value):
        if len(value) > 255:
            raise serializers.ValidationError("Bio too long")

        return value

    def validate_referral_code(self, value):
        if value:
            if not TalentProfile.objects.filter(referral_code=value).exists():
                raise serializers.ValidationError("Invalid referral code provided.")
        return value




class CompanySerializer(RegisterSerializer):
    full_name = serializers.CharField()
    company_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    size = serializers.ChoiceField(
        choices=Company.SIZE_CHOICES.choices, required=False, allow_blank=True
    )
    profile_pic = serializers.ImageField(allow_empty_file=True, required=False)
    country = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = Company
        fields = (
            "full_name",
            "company_name",
            "website",
            "size",
            "role",
            "created_at",
            "profile_pic",
            "country",
        )

    @transaction.atomic
    def save(self, request):
        user = super().save(request)
        user.full_name = self.validated_data.get("full_name")
        # Split full_name into first_name and last_name
        name_parts = user.full_name.split(" ")
        user.first_name = name_parts[0] if name_parts else ""
        user.last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        user.user_type = CustomUser.USER_TYPE.COMPANY_REP
        user.country = self.validated_data.get("country")
        
        # Handle profile picture upload
        if 'profile_pic' in request.FILES:
            user.profile_pic = request.FILES['profile_pic']



        user.save()

        # Skip company creation for invited users -- the view's create()
        # method links them to the inviting company instead.
        if request.data.get("invite_token"):
            return user

        # Handle role assignment safely; role is optional at signup and can be
        # provided later during onboarding
        role = None
        role_slug = self.validated_data.get("role")
        if role_slug:
            try:
                role = Role.objects.get(slug=role_slug)
            except Role.DoesNotExist:
                raise serializers.ValidationError({"role": "Invalid role provided."})
        referred_by = None
        ref_code = request.data.get("ref")
        if ref_code:
            referred_by = Company.objects.filter(referral_code=ref_code).first()

        company = Company.objects.create(
            company_rep_id=user.id,
            company_name=self.validated_data.get("company_name", ""),
            website=self.validated_data.get("website") or None,
            size=self.validated_data.get("size") or None,
            role=role,
            referred_by=referred_by,
            utm_source=request.data.get("utm_source") or None,
            utm_medium=request.data.get("utm_medium") or None,
            utm_campaign=request.data.get("utm_campaign") or None,
        )
        # Ensure the registering company rep is added to the company team as ADMIN
        try:
            # create membership if not exists
            CompanyTeamMember.objects.get_or_create(
                company=company,
                user=user,
                defaults={"role": CompanyTeamMember.ROLE.ADMIN, "invited_by": user},
            )
        except Exception:
            # avoid raising registration errors for membership creation failures
            pass

        FreePlan.objects.get_or_create(company=company, company_email=user.email)
        return user

    def validate(self, data):
        website = data.get("website")
        if not website:
            return data
        get_companies = Company.objects.filter(
            website=website,
            # company_rep__country=data['country']
        )
        if not get_companies:
            return data

        raise serializers.ValidationError("company already exists")

    def validate_profile_pic(self, value):

        # Get the file extension
        file_extension = value.name.split(".")[-1].lower()
        # Check if the file extension is allowed
        if (
            not file_extension
            or file_extension not in settings.WHITELISTED_IMAGE_TYPES.keys()
        ):
            raise serializers.ValidationError("Only JPEG and PNG files are allowed.")

        # Check if the image size is within limits
        if value.size > settings.UPLOAD_FILE_MAX_SIZE:
            raise serializers.ValidationError("Image size too large. Max size is 1MB.")

        # check the content type
        if value.content_type not in settings.WHITELISTED_IMAGE_TYPES.values():
            raise serializers.ValidationError("Invalid image content-type")

        # check mime-type
        mime_type = get_mime_type(value)

        if (
            mime_type not in settings.WHITELISTED_IMAGE_TYPES.values()
            and mime_type != value.content_type
        ):
            raise serializers.ValidationError("Invalid image mime-type")

        return value

    def validate_phone_number(self, value):
        phone_exists = get_user_model().objects.filter(phone_number=value).exists()
        if phone_exists:
            raise serializers.ValidationError("Phone number is already in use")

        return value

class CompanyOnboardingSerializer(serializers.ModelSerializer):
    """Per-card saves for the post-signup company onboarding flow."""

    role = serializers.SlugRelatedField(
        queryset=Role.objects.filter(is_recruiter_role=True),
        slug_field="slug",
        required=False,
        allow_null=True,
    )
    phone_number = PhoneNumberField(required=False, allow_blank=True, write_only=True)
    has_completed_onboarding = serializers.SerializerMethodField()
    has_skipped_onboarding = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = (
            "account_type",
            "company_name",
            "website",
            "industry",
            "size",
            "role",
            "phone_number",
            "heard_from",
            "heard_from_other",
            "onboarding_notes",
            "onboarding_completed_at",
            "onboarding_skipped_at",
            "has_completed_onboarding",
            "has_skipped_onboarding",
        )
        read_only_fields = ("onboarding_completed_at", "onboarding_skipped_at")
        extra_kwargs = {
            "website": {"required": False, "allow_null": True},
            "size": {"required": False, "allow_null": True},
        }

    def get_has_completed_onboarding(self, obj):
        return obj.onboarding_completed_at is not None

    def get_has_skipped_onboarding(self, obj):
        return obj.onboarding_skipped_at is not None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        phone_number = instance.company_rep.phone_number
        data["phone_number"] = str(phone_number) if phone_number else ""
        return data

    def update(self, instance, validated_data):
        phone_number = validated_data.pop("phone_number", None)
        if phone_number:
            instance.company_rep.phone_number = phone_number
            instance.company_rep.save(update_fields=["phone_number"])
        return super().update(instance, validated_data)


class CustomUserSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(required=False)
    subscribed_plan = serializers.SerializerMethodField()
    role = serializers.SlugRelatedField(read_only=True, slug_field="slug")
    phone_number = PhoneNumberField()
    profile_pic = serializers.SerializerMethodField()
    
    # New fields
    billing_type = serializers.SerializerMethodField()
    subscription = serializers.SerializerMethodField()
    wallet_balance = serializers.SerializerMethodField()

    # Staff RBAC. Named `staff_role` (not `role`) since `role` above is an
    # unrelated job-title concept.
    staff_role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    is_super_admin = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = (
            "pk",
            "username",
            "email",
            "first_name",
            "last_name",
            "bio",
            "phone_number",
            "country",
            "role",
            "is_staff",
            "is_superuser",
            "verified",
            "user_type",
            "profile_pic",
            "billing_type",
            "subscription",
            "wallet_balance",
            "subscribed_plan",
            "created",
            "staff_role",
            "permissions",
            "is_super_admin",
        )
        read_only_fields = (
            "pk",
            "verified",
            "email",
            #"phone_number",
            "is_superuser",
            "is_staff",
            "user_type",
        )
    
    def update(self, instance, validated_data):
        request = self.context.get("request")
        
        # Old country BEFORE update
        old_country = instance.country
        
        # New country (if provided)
        new_country = validated_data.get("country", old_country)

        # ---- Your custom logic ----
        if request.user.is_company():
            if new_country != old_country:
                # perform your conversion
                convert_wallet_currency(request.user.company, new_country)

        # Continue with normal update
        return super().update(instance, validated_data)
    
    def get_billing_type(self, obj):
        company = getattr(obj, 'company', None)
        if not company:
            return None
        return get_company_billing_type(company)

    def get_subscription(self, obj):
        company = getattr(obj, 'company', None)
        if not company:
            return None
        return get_active_subscription(company)

    def get_wallet_balance(self, obj):
        company = getattr(obj, 'company', None)
        if not company:
            return None
        return get_wallet_balance(company)

    def get_staff_role(self, obj):
        if obj.user_type != CustomUser.USER_TYPE.STAFF or not obj.staff_role:
            return None
        return {"name": obj.staff_role.name, "slug": obj.staff_role.slug}

    def get_permissions(self, obj):
        if obj.user_type != CustomUser.USER_TYPE.STAFF:
            return []
        from staff.permissions import get_staff_permissions

        return sorted(get_staff_permissions(obj))

    def get_is_super_admin(self, obj):
        if obj.user_type != CustomUser.USER_TYPE.STAFF:
            return False
        from staff.permissions import is_super_admin

        return is_super_admin(obj)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        return representation

    def get_subscribed_plan(self, obj):
        try:
            sub = obj.subscription
        except CustomUser.subscription.RelatedObjectDoesNotExist:
            return None

        return {
            "plan_id": sub.sub_plan.id,
            "plan": sub.sub_plan.name,
            "is_active": sub.is_active(),
        }

    def get_profile_pic(self, obj: CustomUser):
        f = getattr(obj, "profile_pic", None)
        if not f or not getattr(f, "name", ""):
            return None
        try:
            return f.url
        except Exception:
            return None 
# def get_profile_pic(self, obj):
#     return obj.get_profile_pic()


class TalentListSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source="user.id")
    has_passed_assessment = serializers.ReadOnlyField()

    class Meta:
        model = TalentProfile
        fields = (
            "id",
            "user_id",
            "name",
            "role",
            "country",
            "portfolio",
            "status",
            "has_passed_assessment",
            "created_at",
            "updated_at",
        )


class UserListSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(read_only=True, slug_field="slug")

    class Meta:
        model = get_user_model()
        fields = (
            "pk",
            "username",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        )


class CompanyListSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(source="company_rep", read_only=True)
    role = serializers.SlugRelatedField(read_only=True, slug_field="title")

    class Meta:
        model = Company
        fields = (
            "id",
            "user",
            "company_name",
            "company_email",
            "website",
            "role",
            "address",
            "size",
            "account_type",
            "industry",
            "heard_from",
            "onboarding_notes",
            "onboarding_completed_at",
            "onboarding_skipped_at",
            "created_at",
            "updated_at",
        )


class CompanyDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = (
            "id",
            "company_name",
            "website",
            "address",
            "logo",
            "created_at",
            "updated_at",
        )


class CompanyForUserProfileSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(source="company_rep", read_only=True)
    role = serializers.SlugRelatedField(queryset=Role.objects.filter(is_recruiter_role=True), slug_field="slug", required=False)
    user_role = serializers.SerializerMethodField(read_only=True)
    user_role_display = serializers.SerializerMethodField(read_only=True)


    class Meta:
        model = Company
        fields = (
            "id",
            "user",
            "company_name",
            "company_email",
            "website",
            "role",
            "address",
            "size",
            "user_role",
            "user_role_display",
            "created_at",
            "updated_at",
        )

    def update(self, instance, validated_data):
        # Update role if provided
        role = validated_data.get("role", None)
        if role:
            instance.role = role
        # Update other fields
        for attr, value in validated_data.items():
            if attr != "role":
                setattr(instance, attr, value)
        instance.save()
        return instance
    
    def get_user_role(self, obj):
        user = self.context['request'].user
        membership = CompanyTeamMember.objects.filter(company=obj, user=user).first()
        return membership.role if membership else None
    
    def get_user_role_display(self, instance):
        user = self.context['request'].user
        membership = CompanyTeamMember.objects.filter(company=instance, user=user).first()
        return membership.get_role_display() if membership else None    
    


class CompanyTeamMemberSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_profile_pic = serializers.SerializerMethodField()

    class Meta:
        model = CompanyTeamMember
        fields = ["id", "company", "user", "user_full_name", "user_email", "user_profile_pic", "role", "created_at"]
        read_only_fields = ["created_at", "invited_by"]

    def get_user_profile_pic(self, obj):
        pic = getattr(obj.user, "profile_pic", None)
        if pic and hasattr(pic, "url"):
            return pic.url
        return None



class CompanyTeamInviteSerializer(serializers.ModelSerializer):
    inviter_name = serializers.CharField(source="invited_by.get_full_name", read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = CompanyTeamInvite
        fields = ["id", "company", "email", "role", "token", "status", "created_at", "is_expired", "inviter_name"]
        read_only_fields = ["token", "created_at", "is_expired", "inviter_name"]

    def get_is_expired(self, obj):
        return obj.is_expired


class CompanyTeamInviteCreateSerializer(serializers.Serializer):
    emails = serializers.ListField(child=serializers.EmailField(), allow_empty=False)
    role = serializers.ChoiceField(choices=[(r.value, r.label) for r in CompanyTeamMember.ROLE])
  



class TalentForUserProfileSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(required=False)
    role = serializers.StringRelatedField(read_only=True)
    has_passed_assessment = serializers.BooleanField(
        source="has_passed_tiaago_assessment"
    )
    resume = serializers.FileField(required=False, allow_null=True)
    resume_url = serializers.SerializerMethodField()
    social_media_links = SocialMediaLinkSerializer(required=False, many=True)
    talent_portfolio_preview = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    bio=serializers.CharField(source="user.bio", required=False)
    class Meta:
        model = TalentProfile
        fields = (
            "id",
            "user",
            "experience_level",
            "profile_picture",
            "portfolio",
            "bio",
            "resume",
            "resume_url",
            "bank_name",
            "account_name",
            "account_number",
            "role",
            "has_passed_assessment",
            "created_at",
            "updated_at",
            "social_media_links",
            "talent_portfolio_preview",
        )

    def get_resume_url(self, obj: TalentProfile):
        return obj.resume.url if obj.resume else None
    
    def get_profile_picture(self, obj: TalentProfile):
        file = getattr(obj.user, "profile_pic", None)
        if not file or not getattr(file, "name", ""):
            return None
        try:
            return file.url
        except Exception:
            return None

    def validate_resume(self, value):
        if value:
            # Check if the file size is within limits
            if value.size > settings.UPLOAD_FILE_MAX_SIZE:
                raise serializers.ValidationError(
                    "Resume file size too large. Max size is 2MB."
                )

            # Get the file extension
            file_extension = value.name.split(".")[-1].lower()
            # Check if the file extension is allowed
            ext_type = settings.WHITELISTED_RESUME_FORMAT.keys()
            if file_extension not in ext_type:
                raise serializers.ValidationError(f"Only {ext_type} files are allowed.")

            # Check MIME type using either guessed type or client-provided content type
            mime_type = get_mime_type(value)
            allowed_mimes = list(settings.WHITELISTED_RESUME_FORMAT.values())

            if (mime_type not in allowed_mimes) and (value.content_type not in allowed_mimes):
                raise serializers.ValidationError("Invalid resume mime-type")

        return value

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data:
            user_serializer = CustomUserSerializer(
                instance=instance.user, data=user_data, partial=True
            )
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()

        #handle social media links
        social_media_links = validated_data.pop("social_media_links", None)
        updated_instance = super().update(instance, validated_data)
        if social_media_links:
            instance.social_media_links.update(deleted_at=timezone.now())
            new_social_media_links = SocialMediaLink.objects.bulk_create(
                [
                    SocialMediaLink(name=item.get("name"), url=item.get("url"))
                    for item in social_media_links
                ]
            )
            updated_instance.social_media_links.set(new_social_media_links)
        return updated_instance

    def get_talent_portfolio_preview(self, talent: TalentProfile):
        portfolio = (
            Portfolio.objects
            .filter(talent=talent)
            .only("about")
            .first()
        )

        verified_skillsets = (
            CandidateAssessmentSubmission.objects
            .filter(candidate=talent, is_passed=True)
            .exclude(skill_assessment__title__istartswith="Assessment for")
            .exclude(skill_assessment__title__icontains=" at ")
            .exclude(skill_assessment__title__icontains=" - Applicant")
            .exclude(skill_assessment__title__icontains=" role")
            .values_list(
                "skill_assessment__title",
                "skill_assessment__difficulty_level",
            )
        )

        level_mapping = {
            "JUNIOR": "Junior",
            "INTERMEDIATE": "Intermediate",
            "SENIOR": "Expert/Professional",
        }
        formatted_skillsets = [
            f"{title} – {level_mapping.get(level, level)}"
            for title, level in verified_skillsets
            if title and level
        ]

        if not portfolio:
            return {
                "about": "",
                "skillset": [],             
                "verified_skillsets": formatted_skillsets,
            }

        return {
            "about": portfolio.about or "",
            "skillset": ToolSerializer(portfolio.tools, many=True).data,
            "verified_skillsets": formatted_skillsets,
        }



class ApplicantDetailSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.StringRelatedField(read_only=True)
    email = serializers.ReadOnlyField(source="user.email")
    country = serializers.ReadOnlyField(source="user.country")
    phone_number = serializers.ReadOnlyField(
        source="user.phone_number.as_international"
    )
    profile_pic = serializers.ReadOnlyField(source="user.get_profile_pic")
    has_passed_assessment = serializers.ReadOnlyField()
    verified_skillsets = serializers.SerializerMethodField()

    class Meta:
        model = TalentProfile
        fields = (
            "id",
            "name",
            "email",
            "country",
            "phone_number",
            "resume",
            "profile_pic",
            "experience_level",
            "role",
            "has_passed_assessment",
            "verified_skillsets",
            "created_at",
            "updated_at",
        )

    def get_name(self, obj):
        return obj.user.first_name + " " + obj.user.last_name

    def get_verified_skillsets(self, obj):
        verified_skillsets = CandidateAssessmentSubmission.objects.filter(
            candidate=obj, is_passed=True
        ).values_list(
            "skill_assessment__title", 
            "skill_assessment__difficulty_level"
        )
        
        # Format skillsets with difficulty level
        formatted_skillsets = []
        for skillset_title, difficulty_level in verified_skillsets:
            if skillset_title and difficulty_level:
                # Map difficulty levels to more user-friendly names
                level_mapping = {
                    "JUNIOR": "Junior",
                    "INTERMEDIATE": "Intermediate", 
                    "SENIOR": "Expert/Professional"
                }
                friendly_level = level_mapping.get(difficulty_level, difficulty_level)
                formatted_skillsets.append(f"{skillset_title} – {friendly_level}")
        
        return formatted_skillsets


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset. Accepts UID, token, new_password1, and new_password2.
    """

    new_password1 = serializers.CharField(write_only=True, required=True)
    new_password2 = serializers.CharField(write_only=True, required=True)
    uidb64 = serializers.CharField(required=True)
    token = serializers.CharField(required=True)

    def validate(self, data):
        # Validate that new_password1 and new_password2 match
        if data["new_password1"] != data["new_password2"]:
            raise serializers.ValidationError("The two password fields didn't match.")

        # Optionally validate the password against Django's built-in validators
        try:
            validate_password(data["new_password1"])
        except serializers.ValidationError as e:
            raise serializers.ValidationError({"new_password1": list(e.messages)})

        return data

    def save(self):
        # Decode the uid and get the user
        uid = self.validated_data["uidb64"]
        try:
            uid = urlsafe_base64_decode(uid).decode()
            user = get_user_model().objects.get(pk=uid)
        except (get_user_model().DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError("Invalid UID.")

        # Check the token
        token = self.validated_data["token"]
        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError("Invalid or expired token.")

        # Set the new password
        user.set_password(self.validated_data["new_password1"])
        user.save()

        return user


class ReferralSerializer(serializers.ModelSerializer):
    inviter_name = serializers.CharField(
        source="inviter.user.get_full_name", read_only=True
    )
    invitee_name = serializers.CharField(source="invitee.get_full_name", read_only=True)
    invitee_profile_pic = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Referral
        fields = [
            "id",
            "invitee_email",
            "invitee_profile_pic",  
            "date_invited",
            "reward",
            "has_received_reward",
            "inviter_name",
            "invitee_name",
        ]

    def get_invitee_profile_pic(self, obj):
        user = getattr(obj, "invitee", None)
        if not user:
            return None
        pic = getattr(user, "profile_pic", None)
        if pic and hasattr(pic, "url"):
            return pic.url
        return None


class ReferralEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, write_only=True)
    referral_code = serializers.CharField(read_only=True)

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "This email is already registered to another user."
            )
        return value




class ReferralWalletSerializer(serializers.ModelSerializer):
    """Serializer for ReferralWallet model"""
    class Meta:
        model = ReferralWallet
        fields = [
            'balance',
            'total_earned',
            'total_withdrawn',
            'date_created',
            'date_modified'
        ]
        read_only_fields = fields

class WithdrawalRequestSerializer(serializers.ModelSerializer):
    """Serializer for creating withdrawal requests"""
    bank_name = serializers.CharField(source='talent.bank_name', read_only=True)
    account_name = serializers.CharField(source='talent.account_name', read_only=True)
    account_number = serializers.CharField(source='talent.account_number', read_only=True)
  
    class Meta:
        model = WithdrawalRequest
        fields = [
            'amount',
            'bank_name',
            'account_name',
            'account_number',
        ]

    def validate_amount(self, value):
        from decimal import Decimal
        from payments.services import WithdrawalService
        
        user = self.context['request'].user
        try:
            talent_profile = user.profile
        except TalentProfile.DoesNotExist:
            raise serializers.ValidationError("Talent profile not found")
        
        try:
            wallet = ReferralWallet.objects.get(talent=talent_profile)
            if not wallet.can_withdraw(value):
                raise serializers.ValidationError(
                    f"Insufficient balance. Available: ₦{wallet.balance}"
                )
        except ReferralWallet.DoesNotExist:
            # Wallet will be created if it doesn't exist
            pass

        min_amount = WithdrawalService.MINIMUM_WITHDRAWAL
        if value < min_amount:
            raise serializers.ValidationError(
                f"Minimum withdrawal amount is ₦{min_amount}"
            )

        return value


class WithdrawalRequestDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for withdrawal requests"""
    bank_name = serializers.CharField(source='talent.bank_name', read_only=True)
    account_name = serializers.CharField(source='talent.account_name', read_only=True)
    account_number = serializers.CharField(source='talent.account_number', read_only=True)
    talent_name = serializers.CharField(source='talent.full_name', read_only=True)
    talent_email = serializers.EmailField(source='talent.user.email', read_only=True)
    fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    net_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = [
            'id',
            'amount',
            'fee',
            'net_amount',
            'status',
            'reference',
            'bank_name',
            'account_name',
            'account_number',
            'talent_name',
            'talent_email',
            'transfer_code',
            'failure_reason',
            'approved_by',
            'date_created',
            'approved_at',
            'completed_at',
            'date_modified'
        ]
        read_only_fields = fields





class DummySerializer(serializers.Serializer):
    message = serializers.CharField(
        default="This is a dummy serializer for Swagger documentation purposes."
    )
    status = serializers.CharField(default="success")

    class Meta:
        fields = ["message", "status"]


class ConfirmEmailSerializer(serializers.Serializer):
    otp = serializers.CharField(help_text="The Otp sent to the user's email.")
    email = serializers.EmailField(
        help_text="The email address of the user to confirm."
    )

    def validate_otp(self, value):
        if not value:
            raise serializers.ValidationError("otp is required.")
        return value
