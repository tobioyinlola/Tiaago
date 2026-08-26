"""Credits wallet top-ups that Bachs has taken payment for but whose webhook
never landed.

Crediting normally happens only in subscriptions.views.bachs_wallet_fund_webhook
-- deliberately, since the webhook is Bachs' source of truth and the
/billing/bachs/callback page never writes. That design has one failure mode
with no recovery path: if the delivery never arrives (wrong webhook URL in the
Bachs dashboard, a signature mismatch rejecting it with 401, an outage, or a
deploy restarting the container mid-delivery), the recruiter's money is gone
and the WalletTopup row sits at PENDING forever with nothing to move it.

This command is that recovery path. It re-queries Bachs for every stale PENDING
top-up and credits the ones Bachs reports as paid, reusing the webhook's own
_credit_wallet_from_bachs_payment so the idempotency checks, the job-resume
side effect, the confirmation email and the WalletTransaction row are all
identical to the webhook path -- a top-up credited here and one credited by a
webhook are indistinguishable afterwards.

Usage:
    python manage.py reconcile_bachs_topups                # last 7 days, live
    python manage.py reconcile_bachs_topups --dry-run      # report only
    python manage.py reconcile_bachs_topups --days 30
    python manage.py reconcile_bachs_topups --topup-id <uuid>
"""

import logging

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from subscriptions.models import BachsWebhookLog, WalletTopup
from utils.bachs_handler import BachsHandler

logger = logging.getLogger("bachs")

# Bachs checkout-session states that mean the money was actually collected.
# Anything else (pending, expired, cancelled, failed) is left alone -- this
# command only ever credits, it never marks a top-up failed, because a
# transient API error must not be mistaken for a declined payment.
PAID_STATES = {"paid", "succeeded", "completed", "collection.succeeded"}


class Command(BaseCommand):
    help = "Credit Bachs wallet top-ups that are stuck PENDING because their webhook never arrived."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days", type=int, default=7,
            help="How far back to look for stuck PENDING top-ups (default: 7).",
        )
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Report what would be credited without writing anything.",
        )
        parser.add_argument(
            "--topup-id", type=str, default=None,
            help="Reconcile a single top-up by id, ignoring --days.",
        )

    def handle(self, *args, **options):
        from subscriptions.views import _credit_wallet_from_bachs_payment

        dry_run = options["dry_run"]
        topup_id = options["topup_id"]

        qs = WalletTopup.objects.filter(
            payment_provider=WalletTopup.Provider.BACHS,
            status=WalletTopup.Status.PENDING,
        ).select_related("wallet", "organisation")

        if topup_id:
            qs = qs.filter(id=topup_id)
        else:
            qs = qs.filter(initiated_at__gte=timezone.now() - timedelta(days=options["days"]))

        topups = list(qs.order_by("initiated_at"))
        if not topups:
            self.stdout.write(self.style.SUCCESS("No stuck PENDING Bachs top-ups found."))
            return

        self.stdout.write(f"Found {len(topups)} PENDING Bachs top-up(s) to check.")
        bachs = BachsHandler()
        credited = skipped = errored = 0

        for topup in topups:
            label = f"{topup.id} ({topup.amount} {topup.currency}, {topup.organisation.company_name})"

            # provider_payment_id is a "pending-<uuid>" placeholder until the
            # checkout session is created (see FundWalletView) -- such a row
            # never reached Bachs at all, so there is nothing to reconcile.
            if not topup.provider_payment_id or topup.provider_payment_id.startswith("pending-"):
                self.stdout.write(f"  SKIP  {label}: never got a Bachs checkout id.")
                skipped += 1
                continue

            session = bachs.retrieve_checkout_session(topup.provider_payment_id)
            if session is None:
                self.stdout.write(self.style.WARNING(f"  ERROR {label}: could not retrieve session."))
                errored += 1
                continue

            state = str(session.get("status") or session.get("payment_status") or "").lower()
            if state not in PAID_STATES:
                self.stdout.write(f"  SKIP  {label}: Bachs reports '{state or 'unknown'}', not paid.")
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(self.style.WARNING(f"  WOULD CREDIT {label}: Bachs reports '{state}'."))
                credited += 1
                continue

            # Shape the session into the same payload the webhook handler
            # expects. amount stays a Bachs decimal string; falling back to
            # topup.amount keeps us crediting exactly what was charged if the
            # session response omits it.
            data = {
                "id": session.get("payment_id") or session.get("id") or topup.provider_payment_id,
                "checkout_id": topup.provider_payment_id,
                "amount": session.get("amount") or str(topup.amount),
                "currency": session.get("currency") or topup.currency,
                "metadata": session.get("metadata") or {"topup_id": str(topup.id)},
            }
            log_entry = BachsWebhookLog.objects.create(
                event="reconciliation.manual",
                payload={"source": "reconcile_bachs_topups", "session": session},
                notes=f"Reconciling top-up {topup.id} stuck PENDING; Bachs reports '{state}'.",
            )
            try:
                _credit_wallet_from_bachs_payment(data, log_entry, "collection.succeeded")
                topup.refresh_from_db()
                if topup.status == WalletTopup.Status.COMPLETED:
                    self.stdout.write(self.style.SUCCESS(f"  CREDITED {label}"))
                    credited += 1
                else:
                    self.stdout.write(self.style.WARNING(f"  NO-OP {label}: still {topup.status}."))
                    skipped += 1
            except Exception:
                logger.exception("Reconciliation failed for Bachs top-up %s", topup.id)
                self.stdout.write(self.style.ERROR(f"  ERROR {label}: see logs."))
                errored += 1

        verb = "would be credited" if dry_run else "credited"
        self.stdout.write(self.style.SUCCESS(f"\nDone. {credited} {verb}, {skipped} skipped, {errored} errored."))
