from celery import shared_task
from decimal import Decimal
from django.db.models import Exists, OuterRef
from django.utils.timezone import now
from datetime import timedelta
from .models import Contract, Wallet, Card, WalletTransaction,UsageEvent, PaymentMethod,Invoice
from .utils import calculate_fees
from utils.paystack_handler import paystack_handler
from utils.email_handler import EmailHandler
from collections import defaultdict
import requests
from django.conf        import settings

PAYSTACK_SECRET_KEY = settings.PAYSTACK_PRIVATE_KEY

@shared_task(name="charge_recruiter_card_task", bind=True, max_retries=2)
def charge_recruiter_card_task(self):
    try:
        current_month = now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Retrieve all contract IDs
        contract_ids = Contract.objects.exclude(
            Exists(
                WalletTransaction.objects.filter(
                    contract=OuterRef("pk"),
                    date_created__gte=current_month,
                    transaction_type__in=[
                        WalletTransaction.TRANSACTION_TYPE.COMPANY_CARD_DIRECT_DEBIT,
                        WalletTransaction.TRANSACTION_TYPE.CREDIT_TALENT_WALLET,
                    ],
                )
            )
        ).values_list("id", flat=True)

        if not contract_ids:
            return "No contracts to process"

        for contract_id in contract_ids:
            try:
                # Fetch the full contract details
                contract = Contract.objects.prefetch_related("company", "talent").get(
                    id=contract_id
                )

                company_rep = contract.company.company_rep
                company_email = contract.company.company_email
                talent_salary = contract.talent_salary

                if contract.has_expired():
                    continue             

                # Check company wallet balance
                try:
                    company_wallet = Wallet.objects.get(user=company_rep)
                except Wallet.DoesNotExist:
                    raise Exception("Company wallet not found")

                if company_wallet.balance < talent_salary:
                    # Charge the card if wallet balance is insufficient
                    try:
                        card = Card.objects.get(user=company_rep)
                    except Card.DoesNotExist:
                        raise Exception("No card linked to this account.")

                    charge_response = paystack_handler.charge_account(
                        email=company_email,
                        amount=talent_salary,
                        authorization_code=card.authorization_code,
                    )
                    salary = Decimal(charge_response["data"]["amount"]) / Decimal(100)
                    tiaago_fees, net_amount = calculate_fees(salary)
                    reference = charge_response["data"]["reference"]

                    if charge_response["status"]:
                        # Create a pending transaction
                        WalletTransaction.objects.create(
                            user=company_rep,
                            ref=reference,
                            tiaago_fees=tiaago_fees,
                            transaction_type=WalletTransaction.TRANSACTION_TYPE.COMPANY_CARD_DIRECT_DEBIT,
                            status="pending",
                            wallet=Wallet.objects.get(user=contract.talent.user),
                            amount=net_amount,
                            contract=contract,
                            card=card,
                        )
                        # Verify the transaction
                        verification_response = paystack_handler.verify_transaction(
                            reference
                        )
                        if verification_response["data"]["status"] == "success":
                            EmailHandler(
                                [company_email, contract.talent.user.email]
                            ).send_basic_email(
                                "Payment Successful",
                                f"The payment of {salary:.2f} was successful. {tiaago_fees:.2f} deducted as platform fees. Pending approval.",
                            )
                        else:
                            EmailHandler(
                                [company_email, contract.talent.user.email]
                            ).send_basic_email(
                                "Payment Failed",
                                f"Payment attempt for {salary:.2f} failed. Retrying on the next scheduled date.",
                            )
                            next_retry_date = get_next_retry_date(self)
                            if next_retry_date:
                                raise self.retry(
                                    exc=Exception("Retrying charge"),
                                    eta=next_retry_date,
                                )
                            else:
                                raise Exception("Max retries reached")
                    else:
                        raise Exception("Card charge failed")
                else:
                    # Deduct from wallet if balance is sufficient
                    company_wallet.balance -= talent_salary
                    company_wallet.save()

                    talent_wallet = Wallet.objects.get(user=contract.talent.user)
                    talent_wallet.balance += talent_salary * Decimal(
                        0.9
                    )  # Net after fees
                    talent_wallet.save()

                    tiaago_fees, net_amount = calculate_fees(talent_salary)
                    WalletTransaction.objects.create(
                        user=company_rep,
                        ref="transaction_reference",
                        tiaago_fees=tiaago_fees,
                        transaction_type=WalletTransaction.TRANSACTION_TYPE.CREDIT_TALENT_WALLET,
                        status="available",
                        wallet=talent_wallet,
                        amount=net_amount,
                        contract=contract,
                    )
                    EmailHandler(
                        [contract.talent.user.email, company_email]
                    ).send_basic_email(
                        "Payment Successful",
                        f"The payment of {talent_salary:.2f} was successful. {tiaago_fees:.2f} deducted as platform fees.",
                    )
            except Exception as e:
                EmailHandler(
                    [contract.talent.user.email, company_email]
                ).send_basic_email(
                    "Payment Attempt Failed",
                    f"Payment for contract ID {contract_id} failed. Reason: {e}. Retrying if possible.",
                )
                if self.request.retries >= self.max_retries:
                    EmailHandler(
                        [contract.company.company_email, contract.talent.user.email]
                    ).send_basic_email(
                        "Final Payment Attempt Failed",
                        "All payment attempts failed. Please contact support.",
                    )
                raise self.retry(exc=e)
    except Exception as e:
        # TODO: Replcace with valid email
        # EmailHandler(["admin@example.com"]).send_basic_email(
        #     "Critical Error",
        #     f"An error occurred while processing contracts: {e}.",
        # )
        raise


def get_next_retry_date(task_instance):
    retry_intervals = [5, 5]  # Retry intervals in days
    retry_count = task_instance.request.retries

    if retry_count < len(retry_intervals):
        return now() + timedelta(days=retry_intervals[retry_count])
    return None


@shared_task(name="charge_monthly_payg_card_task")
def charge_monthly_payg_card_task():
    usage_map = defaultdict(list)

    for ev in UsageEvent.objects.select_related(
            "job_application__job__company__company_rep"
        ).filter(provider="paystack", billed=False):
        rep_user = ev.job_application.job.company.company_rep 
        if rep_user:
            usage_map[rep_user.id].append(ev)


    for rep_user_id, events in usage_map.items():
        rep_user = events[0].job_application.job.company.company_rep
        usd_total = sum(e.quantity for e in events) * 0.01
        naira_total = round(usd_total * int(settings.PAYG_NAIRA_EXCHANGE_RATE), 2)
        total_kobo = int(naira_total * 100)
        amount_paid = naira_total

        # customer code stored on CustomUser model
        customer_code = rep_user.paystack_customer_id
        if not customer_code:
            print(f"[PAYG] No Paystack customer code for user {rep_user.email}")
            continue

        # pull email from Paystack
        r_cust = requests.get(
            f"https://api.paystack.co/customer/{customer_code}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            timeout=30,
        )
        if r_cust.status_code != 200 or not r_cust.json().get("status"):
            print(f"[PAYG] Failed to fetch customer {customer_code}: {r_cust.text}")
            continue
        email = r_cust.json()["data"].get("email")

        pm = PaymentMethod.objects.filter(user=rep_user, is_default=True).first()
        if not pm or not pm.paystack_authorisation_code:
            print(f"[PAYG] No default card for {rep_user.email}")
            continue

        payload = {
            "email": email,
            "amount": total_kobo,
            "authorization_code": pm.paystack_authorisation_code,
            "metadata": {
                "usage_ids": [e.id for e in events],
                "billing_period": now().strftime("%B %Y"),
            },
        }

        r_charge = requests.post(
            "https://api.paystack.co/transaction/charge_authorization",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            json=payload,
            timeout=30,
        )

        if r_charge.status_code == 200 and r_charge.json().get("status"):
            ref = r_charge.json()["data"]["reference"]
            UsageEvent.objects.filter(id__in=payload["metadata"]["usage_ids"]).update(
                billed=True,
                billed_at=now(),
                external_id=ref,
            )
            print(f"[PAYG] Charged {rep_user.email} ₦{naira_total:,} (ref {ref})")
            Invoice.objects.create(
                user=rep_user,
                amount=naira_total,
                status='paid',  
                paystack_reference_id=ref,
                created_at=now(),
                paid_at=now(),
            )
            EmailHandler(rep_user.email).send_basic_email(
                subject="Payment received – thank you!",
                message=f"""
                Your payment of ₦{amount_paid:,.2f} was successful.View your invoice: {ref}
                Thanks for using Tiaago!
                """
                )
        else:
            print(f"[PAYG] Charge failed for {rep_user.email}: {r_charge.text}")
            Invoice.objects.create(
                user=rep_user,
                amount=naira_total,
                status='uncollectible',  
                paystack_reference_id=None,  
                created_at=now(),
                paid_at=None, 
            )
            EmailHandler(rep_user.email).send_basic_email(
                subject="Payment failed",
                message=f"""
                Your payment of ₦{amount_paid:,.2f} failed.View your invoice
                Thanks for using Tiaago!
                """
                )