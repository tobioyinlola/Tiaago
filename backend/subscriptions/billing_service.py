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

from .helper import COUNTRY_CURRENCY_MAP, get_action_price, get_pricing_int, get_pricing_decimal
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
            "free_credits_remaining": get_pricing_int("free_tier_limit", 20),
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
    limit = get_pricing_int("free_tier_limit", 20)
    recipient = _notify_billing_alert(
        organisation, f"You've used all {limit} free candidate processings",
        f"You have used all {limit} of your free candidate processings. Your wallet will now be "
        "charged for each candidate you process.",
    )
    if not recipient:
        return
    wallet = get_or_create_wallet(organisation)
    resume_price = _format_money(get_action_price("resume_screening", wallet.currency), wallet.currency)
    assessment_price = _format_money(get_action_price("assessment", wallet.currency), wallet.currency)
    try:
        emails.free_tier_exhausted_mail(recipient, resume_price, assessment_price, _wallet_url(), limit)
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
        """Same idempotency/free-credit rules as process_resume_candidate_screening --
        an assessment is its own billable/creditable event, independent of
        whether the same candidate's resume screening was free. It checks
        and decrements the free-credit balance itself, and records a
        transaction either way, so both a resume screening and an
        assessment for the same candidate can consume a free credit (or a
        real charge) each."""
        job = job_application.job
        organisation = job.company
        candidate = job_application.applicant

        CandidateBillingRecord.objects.get_or_create(organisation=organisation, job=job, candidate=candidate)

        just_exhausted = False
        with transaction.atomic():
            record = CandidateBillingRecord.objects.select_for_update().get(
                organisation=organisation, job=job, candidate=candidate
            )
            if record.assessment_charged:
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
                    description=_candidate_description(candidate, job, "Free tier credit used — assessment"),
                    status=WalletTransaction.Status.COMPLETED,
                    job=job,
                    candidate=candidate,
                )
                record.was_free_credit = True
                record.assessment_charged = True
                record.assessment_amount = Decimal("0.00")
                record.assessment_charged_at = timezone.now()
                record.save()
                result = {"success": True, "reason": "free_credit", "amount_charged": Decimal("0.00")}
            else:
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
        if result["reason"] in ("charged", "insufficient_funds"):
            BillingService.check_and_send_low_balance_alert(wallet)
        elif result["reason"] == "free_credit" and just_exhausted:
            _notify_free_tier_exhausted(organisation)

        return result

    @staticmethod
    def charge_interview_package(organisation, interview, includes_recording):
        """Charges the flat interview-package fee when a recruiter starts an
        interview, plus the recording add-on if enabled. This is a
        separate allowance from free_credits_remaining (which
        process_resume_candidate_screening/process_assessment_charge use)
        -- an organisation's first 3 *charged* interviews (counted from
        Scheduler.interview_package_charged) are free instead, tracked via
        Scheduler.free_allowance_used.

        Pricing is flat NGN regardless of wallet currency, per spec --
        revisit if this feature needs multi-currency support later.

        Returns {"success": bool,
                 "reason": "already_charged"|"free_allowance"|"charged"|"insufficient_funds",
                 "amount_charged": Decimal}."""
        from scheduler.models import Scheduler

        with transaction.atomic():
            interview = Scheduler.objects.select_for_update().get(pk=interview.pk)
            if interview.interview_package_charged:
                return {"success": True, "reason": "already_charged", "amount_charged": Decimal("0.00")}

            free_allowance = Scheduler.objects.filter(
                company=organisation, interview_package_charged=True
            ).count() < 3

            package_price = get_pricing_decimal("interview_package_price_ngn", "1500.00")
            recording_price = (
                get_pricing_decimal("interview_recording_addon_price_ngn", "1000.00")
                if includes_recording else Decimal("0.00")
            )
            total_due = package_price + recording_price

            wallet = get_or_create_wallet(organisation)
            wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)

            if not free_allowance and wallet.balance < total_due:
                return {"success": False, "reason": "insufficient_funds", "amount_charged": Decimal("0.00")}

            job_application = interview.get_job_application()
            job = job_application.job if job_application else None
            candidate = interview.talent
            candidate_name = candidate.full_name if candidate else "the candidate"
            job_title = job.title if job else interview.title

            if not free_allowance:
                wallet.debit(
                    amount=package_price,
                    description=f"Interview package — {candidate_name} for {job_title}",
                    currency=wallet.currency,
                    service_type=WalletTransaction.ServiceType.INTERVIEW,
                    job=job,
                    candidate=candidate,
                    metadata={"scheduler_id": str(interview.id)},
                )
                if includes_recording:
                    wallet.debit(
                        amount=recording_price,
                        description=f"Interview recording — {candidate_name} for {job_title}",
                        currency=wallet.currency,
                        service_type=WalletTransaction.ServiceType.INTERVIEW,
                        job=job,
                        candidate=candidate,
                        metadata={"scheduler_id": str(interview.id), "addon": "recording"},
                    )
            else:
                logger.info(f"Interview {interview.id} covered by free allowance for company {organisation.id}")

            interview.interview_package_charged = True
            interview.interview_package_amount = package_price
            interview.free_allowance_used = free_allowance
            update_fields = ["interview_package_charged", "interview_package_amount", "free_allowance_used"]
            if includes_recording:
                interview.recording_addon_charged = True
                interview.recording_addon_amount = recording_price
                update_fields += ["recording_addon_charged", "recording_addon_amount"]
            interview.save(update_fields=update_fields)

            amount_charged = Decimal("0.00") if free_allowance else total_due

        if not free_allowance:
            wallet = get_or_create_wallet(organisation)
            BillingService.check_and_send_low_balance_alert(wallet)

        return {
            "success": True,
            "reason": "free_allowance" if free_allowance else "charged",
            "amount_charged": amount_charged,
        }
