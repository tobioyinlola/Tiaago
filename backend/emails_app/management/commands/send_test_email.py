"""
Send any Tiaago email to a test address using its sample context.

    python manage.py send_test_email welcome you@example.com
    python manage.py send_test_email --list

With the console backend, the rendered message prints to stdout, which is
handy for eyeballing the multipart text + HTML output.
"""
from django.core.management.base import BaseCommand, CommandError

from emails_app.sample_context import SAMPLE_CONTEXT, EMAIL_META, EMAIL_ORDER
from emails_app.services import send_tiaago_email


class Command(BaseCommand):
    help = "Render and send a Tiaago transactional email using sample context."

    def add_arguments(self, parser):
        parser.add_argument("name", nargs="?", help="Template name, e.g. welcome")
        parser.add_argument("to", nargs="?", help="Recipient email address")
        parser.add_argument("--list", action="store_true", help="List template names")

    def handle(self, *args, **opts):
        if opts.get("list") or not opts.get("name"):
            self.stdout.write(self.style.MIGRATE_HEADING("Available emails:"))
            for name in EMAIL_ORDER:
                label = EMAIL_META.get(name, (name, ""))[0]
                self.stdout.write(f"  {name:<32} {label}")
            return

        name = opts["name"]
        to = opts.get("to") or "test@example.com"
        if name not in SAMPLE_CONTEXT:
            raise CommandError(f"Unknown email '{name}'. Use --list to see options.")

        send_tiaago_email(name, to, SAMPLE_CONTEXT[name])
        self.stdout.write(self.style.SUCCESS(f"Sent '{name}' to {to}."))
