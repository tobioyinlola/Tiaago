from django.db import models
from django.contrib.auth.models import UserManager
from allauth.account.models import EmailAddress
from .constants import UserTypes

class CustomUserManager(UserManager):

    def _create_email_address(self, user, email, **extra_fields):
        extra_fields.setdefault("verified", True)
        extra_fields.setdefault("primary", True)
        return EmailAddress.objects.create(user=user, email=email, **extra_fields)

    def create_user(self, username, email=None, password=None, **extra_fields):
        valid_user_types = [UserTypes.talent, UserTypes.company, UserTypes.staff]
        if not extra_fields.get('user_type'):
            raise ValueError("You must specify a user type")
        if extra_fields.get('user_type') not in valid_user_types:
            raise ValueError("invalid user type")
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(username, email, password, **extra_fields)


    def create_user_and_verify(self, username, email=None, password=None, **extra_fields):
        user = self.create_user(username, email, password, **extra_fields)
        self._create_email_address(user=user, email=email) # create associated email
        return user

    def create_talent_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('user_type', UserTypes.talent)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(username, email, password, **extra_fields)

    def create_talent_user_and_verify(self, username, email=None, password=None, **extra_fields):
        user = self.create_talent_user(username, email, password, **extra_fields)
        self._create_email_address(user=user, email=email) # create associated email
        return user

    def create_company_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('user_type', UserTypes.company)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(username, email, password, **extra_fields)

    def create_company_user_and_verify(self, username, email=None, password=None, **extra_fields):
        user = self.create_company_user(username, email, password, **extra_fields)
        self._create_email_address(user=user, email=email) # create associated email
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("user_type", UserTypes.staff)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("user_type") != "ST":
            raise ValueError("Superuser must have user_type=ST")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(username, email, password, **extra_fields)

    def create_superuser_and_verify(self, username, email=None, password=None, **extra_fields):
        user = self.create_superuser(username, email, password, **extra_fields)
        self._create_email_address(user=user, email=email) # create associated email
        return user

class TalentManager(models.Manager):
    
    def get_queryset(self):
        return super().get_queryset().filter(user_type=UserTypes.talent)

class CompanyManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(user_type=UserTypes.company)

class StaffManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(user_type=UserTypes.staff)