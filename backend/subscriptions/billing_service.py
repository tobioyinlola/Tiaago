"""BillingService -- the only place in the codebase that should touch wallet
balances for candidate-processing charges (resume screening / assessment).
Consolidates the free-tier-then-wallet billing model onto the existing
subscriptions.Wallet system rather than adding a parallel one -- see
/Users/macuser/.claude/plans/staged-scribbling-comet.md for the full
design rationale.

This does not touch seat-based subscription billing (UserUsage/FreePlan/
PaystackSubscription/StripeSubscription) -- callers are expected to only
reach this service once an organisation has no active seat quota left,
same as the "subscription first, wallet fallback" flow it replaces
(subscriptions.helper.check_subscription_wallet_fallback)."""

import logging
from decimal import Decimal
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from create_user.models import Company
from emails import emails
from notifications.models import Notification
from notifications.utils import notify_user

from .helper import COUNTRY_CURRENCY_MAP, get_action_price, get_pricing_int
from .models import CandidateBillingRecord, Wallet, WalletTransaction

logger = logging.getLogger(__name__)

LOW_BALANCE_ALERT_COOLDOWN = timedelta(hours=24)


def _wallet_url():
    return f"{str(settings.FRONTEND_URL).rstrip('/')}/recruiter/dashboard/billing"


def _format_money(amount, currency):
    symbol = "₦" if (currency or "").upper() == "NGN" else "$"
    return f"{symbol}{Decimal(amount):,.2f}"


def get_or_create_wallet(company: Company) -> Wallet:
    """Currency is derived from the organisation's country -- Nigeria pays
    in NGN via Paystack, everyone else pays in USD via Stripe."""
    currency = COUNTRY_CURRENCY_MAP.get(company.country, "USD")
    wallet, _created = Wallet.objects.get_or_create(
        company=company,
        defaults={
            "currency": currency,
            "free_credits_remaining": get_pricing_int("free_tier_limit", 100),
        },
    )
    return wallet


def _candidate_description(candidate, job, stage):
    name = getattr(candidate, "full_name", "") or ""
    if not name and getattr(candidate, "user", None):
        name = candidate.user.get_full_name() or candidate.user.username
    role = getattr(job, "title", None) or getattr(job, "role", None) or "the role"
    return f"{stage} — {name or 'Candidate'} for {role}"


def _notify_billing_alert(company, title, message):
    recipient = getattr(company, "company_rep", None)
    if not recipient:
        return
    try:
        notify_user(
            recipient, title, message,
            notification_type=Notification.Type.BILLING_ALERT,
            link_path="recruiter/dashboard/billing", link_label="Fund wallet",
        )
    except Exception:
        logger.exception("Failed to create in-app billing notification for company %s", company.id)
    return recipient


def _notify_free_tier_exhausted(organisation):
    recipient = _notify_billing_alert(
        organisation, "You've used all 100 free candidate processings",
        "You have used all 100 of your free candidate processings. Your wallet will now be "
        "charged for each candidate you process.",
    )
    if not recipient:
        return
    wallet = get_or_create_wallet(organisation)
    resume_price = _format_money(get_action_price("resume_screening", wallet.currency), wallet.currency)
    assessment_price = _format_money(get_action_price("assessment", wallet.currency), wallet.currency)
    try:
        emails.free_tier_exhausted_mail(recipient, resume_price, assessment_price, _wallet_url())
    except Exception:
        logger.exception("Failed to send free-tier-exhausted email for company %s", organisation.id)


class BillingService:

    @staticmethod
    def check_and_send_low_balance_alert(wallet: Wallet):
        """Only fires if alerts are enabled, balance is below the org's
        configured threshold, and the last alert was sent >24h ago (or
        never). Sends both an in-app notification and an email."""
        if not wallet.low_balance_alert_enabled:
            return
        if wallet.low_balance_threshold is None:
            return
        if wallet.balance >= wallet.low_balance_threshold:
            return
        if wallet.low_balance_alert_sent_at and (
            timezone.now() - wallet.low_balance_alert_sent_at < LOW_BALANCE_ALERT_COOLDOWN
        ):
            return

        wallet.low_balance_alert_sent_at = timezone.now()
        wallet.save(update_fields=["low_balance_alert_sent_at"])

        company = wallet.company
        message = (
            f"Your Tiaago wallet balance is running low. Current balance: "
            f"{_format_money(wallet.balance, wallet.currency)}. Add funds to continue "
            f"screening candidates and sending assessments."
        )
        recipient = _notify_billing_alert(company, "Your wallet balance is running low", message)
        if not recipient:
            return
        try:
            emails.low_balance_alert_mail(
                recipient, wallet.balance, wallet.low_balance_threshold, wallet.currency, _wallet_url()
            )
        except Exception:
            logger.exception("Failed to send low-balance email for company %s", company.id)

    @staticmethod
    def process_resume_candidate_screening(job_application):
        """Charges (or covers via free credit) exactly once for a given
        (organisation, job, candidate). Returns
        {"success": bool, "reason": "free_credit"|"charged"|"insufficient_funds"|"already_charged",
         "amount_charged": Decimal|None}."""
        job = job_application.job
        organisation = job.company
        candidate = job_application.applicant

        # get_or_create is race-safe on the (organisation, job, candidate)
        # unique constraint -- Django retries internally on IntegrityError.
        CandidateBillingRecord.objects.get_or_create(organisation=organisation, job=job, candidate=candidate)

        just_exhausted = False
        with transaction.atomic():
            record = CandidateBillingRecord.objects.select_for_update().get(
                organisation=organisation, job=job, candidate=candidate
            )
            if record.resume_screening_charged:
                return {"success": True, "reason": "already_charged", "amount_charged": None}

            wallet = get_or_create_wallet(organisation)
            wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)

            if wallet.free_credits_remaining > 0:
                wallet.free_credits_remaining -= 1
                just_exhausted = wallet.free_credits_remaining == 0
                wallet.save(update_fields=["free_credits_remaining"])
                WalletTransaction.objects.create(
                    wallet=wallet,
                    transaction_type=WalletTransaction.TransactionType.CREDIT,
                    service_type=WalletTransaction.ServiceType.FREE_CREDIT,
                    amount=Decimal("0.00"),
                    currency=wallet.currency,
                    balance_after=wallet.balance,
                    description=_candidate_description(candidate, job, "Free tier credit used — resume screening"),
                    status=WalletTransaction.Status.COMPLETED,
                    job=job,
                    candidate=candidate,
                )
                record.was_free_credit = True
                record.resume_screening_charged = True
                record.resume_screening_amount = Decimal("0.00")
                record.resume_screening_charged_at = timezone.now()
                record.save()
                result = {"success": True, "reason": "free_credit", "amount_charged": Decimal("0.00")}
            else:
                price = get_action_price("resume_screening", wallet.currency)
                if wallet.balance < price:
                    result = {"success": False, "reason": "insufficient_funds", "amount_charged": None}
                else:
                    wallet.debit(
                        amount=price,
                        description=_candidate_description(candidate, job, "Resume screening"),
                        currency=wallet.currency,
                        service_type=WalletTransaction.ServiceType.RESUME_SCREENING,
                        job=job,
                        candidate=candidate,
                    )
                    record.resume_screening_charged = True
                    record.resume_screening_amount = price
                    record.resume_screening_charged_at = timezone.now()
                    record.total_charged = (record.total_charged or Decimal("0.00")) + price
                    record.save()
                    result = {"success": True, "reason": "charged", "amount_charged": price}

        # Notifications/email happen after the transaction commits -- I/O
        # shouldn't hold the row lock, and a failed send must never roll
        # back a real charge.
        wallet = get_or_create_wallet(organisation)
        if result["reason"] in ("charged", "insufficient_funds"):
            BillingService.check_and_send_low_balance_alert(wallet)
        elif result["reason"] == "free_credit" and just_exhausted:
            _notify_free_tier_exhausted(organisation)

        return result

    @staticmethod
    def process_assessment_charge(job_application):
        """Same idempotency/free-credit rules as process_resume_candidate_screening,
        except: if the candidate's resume screening was covered by a free
        credit, the assessment is free too -- one candidate processing
        (regardless of stage reached) consumes exactly one free credit."""
        job = job_application.job
        organisation = job.company
        candidate = job_application.applicant

        CandidateBillingRecord.objects.get_or_create(organisation=organisation, job=job, candidate=candidate)

        with transaction.atomic():
            record = CandidateBillingRecord.objects.select_for_update().get(
                organisation=organisation, job=job, candidate=candidate
            )
            if record.assessment_charged:
                return {"success": True, "reason": "already_charged", "amount_charged": None}

            if record.was_free_credit:
                record.assessment_charged = True
                record.assessment_amount = Decimal("0.00")
                record.assessment_charged_at = timezone.now()
                record.save()
                return {"success": True, "reason": "free_credit", "amount_charged": Decimal("0.00")}

            wallet = get_or_create_wallet(organisation)
            wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)

            price = get_action_price("assessment", wallet.currency)
            if wallet.balance < price:
                result = {"success": False, "reason": "insufficient_funds", "amount_charged": None}
            else:
                wallet.debit(
                    amount=price,
                    description=_candidate_description(candidate, job, "Assessment"),
                    currency=wallet.currency,
                    service_type=WalletTransaction.ServiceType.ASSESSMENT,
                    job=job,
                    candidate=candidate,
                )
                record.assessment_charged = True
                record.assessment_amount = price
                record.assessment_charged_at = timezone.now()
                record.total_charged = (record.total_charged or Decimal("0.00")) + price
                record.save()
                result = {"success": True, "reason": "charged", "amount_charged": price}

        wallet = get_or_create_wallet(organisation)
        BillingService.check_and_send_low_balance_alert(wallet)
        return result
