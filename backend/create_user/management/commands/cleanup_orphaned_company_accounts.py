from django.core.management.base import BaseCommand

from create_user.models import Company, CustomUser


class Command(BaseCommand):
    help = (
        "Retroactive cleanup for organisations that were removed before "
        "OrganisationDeleteAPIView existed (or by any other means that "
        "deleted the Company row without also deleting its company_rep "
        "CustomUser). Those leftover CustomUser/EmailAddress rows still "
        "hold the org's email, blocking that address from signing up "
        "again -- deleting the orphaned CustomUser here frees it, exactly "
        "as a normal admin org deletion would have. Company reps that "
        "still have a live Company are never touched. Defaults to a dry "
        "run; pass --apply to actually delete."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually delete the orphaned accounts. Without this flag, only lists them.",
        )

    def handle(self, *args, **options):
        orphaned = CustomUser.objects.filter(
            user_type=CustomUser.USER_TYPE.COMPANY_REP,
        ).exclude(
            id__in=Company.objects.values_list("company_rep_id", flat=True),
        )

        count = orphaned.count()
        if not count:
            self.stdout.write(self.style.SUCCESS("No orphaned company-rep accounts found."))
            return

        self.stdout.write(f"Found {count} orphaned company-rep account(s):")
        for user in orphaned:
            self.stdout.write(f"  id={user.id} email={user.email!r} username={user.username!r}")

        if not options["apply"]:
            self.stdout.write(self.style.WARNING("Dry run only -- re-run with --apply to delete these and free their emails."))
            return

        deleted_emails = list(orphaned.values_list("email", flat=True))
        orphaned.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {len(deleted_emails)} orphaned account(s). Freed emails: {deleted_emails}"))
