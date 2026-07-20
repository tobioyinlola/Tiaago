import getpass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from staff.models import StaffRole
from staff.permissions import SUPER_ADMIN_SLUG

CustomUser = get_user_model()


class Command(BaseCommand):
    help = (
        "Creates (or promotes) a Super Admin account for the admin dashboard. "
        "Intended for one-off bootstrap of the FIRST admin on a fresh deploy -- "
        "run this directly on the server (e.g. via a Render/Heroku one-off "
        "shell command), never expose it through a web endpoint. Every "
        "subsequent admin should be added via the existing staff-invite flow "
        "in the dashboard instead, which emails them a secure set-password "
        "link rather than sharing a password out of band."
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email address for the admin account.")
        parser.add_argument("--first-name", default="", help="First name (optional).")
        parser.add_argument("--last-name", default="", help="Last name (optional).")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        first_name = options["first_name"]
        last_name = options["last_name"]

        role = StaffRole.objects.filter(slug=SUPER_ADMIN_SLUG).first()
        if not role:
            raise CommandError(
                "No 'super_admin' StaffRole found -- run migrations first "
                "(the staff app seeds roles/permissions via migration 0002)."
            )

        # getpass never echoes to the terminal and is never captured in shell
        # history or a process list the way a --password flag would be.
        password = getpass.getpass("Password: ")
        password_confirm = getpass.getpass("Password (again): ")
        if not password or password != password_confirm:
            raise CommandError("Passwords did not match (or were empty).")
        if len(password) < 8:
            raise CommandError("Password must be at least 8 characters.")

        user, created = CustomUser.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": first_name,
                "last_name": last_name,
                "user_type": CustomUser.USER_TYPE.STAFF,
            },
        )
        user.user_type = CustomUser.USER_TYPE.STAFF
        user.staff_role = role
        user.is_verified = True
        user.is_active = True
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        user.set_password(password)
        user.save()

        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Promoted existing user to'} Super Admin: {email}"
        ))
        self.stdout.write("Log in at /admin/signin with this email and the password you just set.")
