import os

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction

from create_user.models import CustomUser


class Command(BaseCommand):
    help = (
        "Create (or promote) a platform admin with all required flags: "
        "user_type=ST, is_staff=True, is_superuser=True. "
        "Password is read from --password or the ADMIN_PASSWORD env var."
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Admin email address")
        parser.add_argument(
            "--password",
            help="Admin password (prefer the ADMIN_PASSWORD env var to keep it out of shell history)",
        )
        parser.add_argument("--first-name", default="Tiaago", help="First name (default: Tiaago)")
        parser.add_argument("--last-name", default="Admin", help="Last name (default: Admin)")

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        password = options.get("password") or os.environ.get("ADMIN_PASSWORD")

        existing = CustomUser.objects.filter(email=email).first()

        if existing:
            # Promote an existing account instead of failing
            existing.user_type = CustomUser.USER_TYPE.STAFF
            existing.is_staff = True
            existing.is_superuser = True
            existing.is_verified = True
            existing.verified = True
            if password:
                self._validate(password, existing)
                existing.set_password(password)
            existing.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Existing user {email} promoted to admin"
                    + (" and password updated ✅" if password else " (password unchanged) ✅")
                )
            )
            return

        if not password:
            raise CommandError(
                "No password provided. Pass --password or set the ADMIN_PASSWORD env var."
            )
        self._validate(password)

        user = CustomUser.objects.create_superuser_and_verify(
            username=email.split("@")[0],
            email=email,
            password=password,
            first_name=options["first_name"],
            last_name=options["last_name"],
            is_verified=True,
            verified=True,
        )
        self.stdout.write(self.style.SUCCESS(f"Admin {user.email} created ✅"))
        self.stdout.write("Login at /admin/signin")

    def _validate(self, password, user=None):
        try:
            validate_password(password, user=user)
        except ValidationError as e:
            raise CommandError("Password rejected: " + "; ".join(e.messages))
