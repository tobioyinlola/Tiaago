import logging
import re
import time
from datetime import timedelta

from celery import shared_task
from django.db import models
from django.utils import timezone

from create_user.models import Company
from utils.email_handler import EmailHandler, MAILGUN_API_KEY, MAILGUN_DOMAIN, RESEND_API_KEY, RESEND_FROM_EMAIL

logger = logging.getLogger(__name__)

BATCH_SIZE = 50
BATCH_DELAY_SECONDS = 1

# How long an IF_PREVIOUS_OPENED/IF_PREVIOUS_NOT_OPENED/IF_PREVIOUS_CLICKED
# condition stays "still possible" after the previous step's send -- past
# this, a non-occurrence (no open, no click) is treated as permanently
# resolved (the recipient is excluded from that step) so the sequence -- and
# eventually the campaign -- can reach a terminal SENT state instead of
# waiting forever on an open/click that may never come.
CONDITION_RESOLUTION_WINDOW_DAYS = 30


def send_raw_email(recipient_email, subject, html, text_body, from_name=None, reply_to=None):
    """Resend-first, Mailgun-fallback send of pre-rendered HTML -- reuses
    EmailHandler's provider methods directly (they accept raw HTML, unlike
    EmailHandler.send_mail() which renders a Django template) rather than
    duplicating the Resend/Mailgun HTTP logic. One attempt per provider (no
    inner retry-sleep) since campaign sends are already batched with a
    1-second delay between batches of 50 -- send_mail's transactional-email
    2-attempt-with-sleep retry would otherwise stall a batch.

    from_name only changes the display name (Resend can't override the
    sending address on its primary path); reply_to changes the Reply-To
    header on both providers."""
    handler = EmailHandler(recipient_email)

    from_override = None
    if from_name:
        match = re.search(r"<(.+)>", RESEND_FROM_EMAIL)
        base_email = match.group(1) if match else RESEND_FROM_EMAIL
        from_override = f"{from_name} <{base_email}>"

    if RESEND_API_KEY:
        try:
            message_id = handler._send_via_resend(
                subject, html, text_body=text_body, from_override=from_override, reply_to_override=reply_to,
            )
            if message_id is not None:
                return True
        except Exception as exc:
            logger.error(f"[campaigns] Resend send to {recipient_email} failed: {exc}")
    if MAILGUN_API_KEY and MAILGUN_DOMAIN:
        try:
            return handler._send_via_mailgun(
                subject, html, RESEND_FROM_EMAIL, text_body=text_body, reply_to_override=reply_to,
            )
        except Exception as exc:
            logger.error(f"[campaigns] Mailgun send to {recipient_email} failed: {exc}")
    return False


def _send_via_talent_network_smtp(to_email, subject, html, from_name):
    """Talent Network sends prefer the platform's connected Gmail SMTP
    (talent_network.models.TalentNetworkSmtpConfig), falling back to
    Resend/Mailgun if none is verified -- mirrors talent_network.mailer's
    own fallback exactly, so campaign sends to this pool look like they came
    from the same sender as job-match notifications. Returns
    (success, error_message)."""
    from talent_network.models import TalentNetworkSmtpConfig
    from utils.gmail_smtp import send_gmail_email

    config = TalentNetworkSmtpConfig.objects.filter(is_verified=True).first()
    if config:
        ok, error = send_gmail_email(
            smtp_config=config, from_name=from_name or "Tiaago Talent Network",
            to_email=to_email, subject=subject, html_body=html,
        )
        if ok:
            config.last_used_at = timezone.now()
            config.save(update_fields=["last_used_at"])
        return ok, error

    ok = send_raw_email(to_email, subject, html, text_body=None, from_name=from_name)
    return ok, ("" if ok else "All email providers failed")


def _send_batch(campaign_email, sends):
    """Sends one CampaignEmail step to a batch of already-created QUEUED
    CampaignSend rows. Shared between send_campaign (step 1) and
    advance_sequence_steps (step 2+) -- the only difference between a
    "single blast" campaign and a drip sequence is how many times this gets
    called. Branches per-recipient on campaign.audience_pool: COMPANY sends
    via Resend/Mailgun with live org merge data, TALENT_NETWORK sends via
    the platform's connected Gmail SMTP with live member merge data.
    Returns (sent_count, failed_count)."""
    from campaigns.merge_tags import build_merge_context, build_talent_network_merge_context
    from campaigns.models import CampaignSend, EmailCampaign
    from campaigns.send_renderer import build_unsubscribe_url, personalize_for_send

    campaign = campaign_email.campaign
    template = campaign_email.email_template
    is_tn = campaign.audience_pool == EmailCampaign.AudiencePool.TALENT_NETWORK

    if is_tn:
        from talent_network.models import TalentNetworkMember

        recipient_cache = {
            m.email: m for m in TalentNetworkMember.objects.filter(
                email__in=[s.recipient_email for s in sends]
            )
        }
        missing_reason = "Talent Network member no longer exists"
    else:
        recipient_cache = {c.id: c for c in Company.objects.filter(id__in=[s.organisation_id for s in sends])}
        missing_reason = "Organisation no longer exists"

    sent_count = failed_count = 0
    for batch_start in range(0, len(sends), BATCH_SIZE):
        batch = sends[batch_start:batch_start + BATCH_SIZE]
        for send in batch:
            recipient = recipient_cache.get(send.recipient_email if is_tn else send.organisation_id)
            if not recipient:
                send.status = CampaignSend.Status.FAILED
                send.failure_reason = missing_reason
                send.save(update_fields=["status", "failure_reason"])
                failed_count += 1
                continue

            context = (
                build_talent_network_merge_context(recipient, send.recipient_name)
                if is_tn else build_merge_context(recipient, send.recipient_name)
            )
            context["unsubscribe_url"] = build_unsubscribe_url(send)
            html, text = personalize_for_send(template.html_body, template.plain_text_body, context, send)
            subject = campaign_email.subject or template.subject_line

            if is_tn:
                ok, error = _send_via_talent_network_smtp(send.recipient_email, subject, html, campaign_email.from_name)
            else:
                ok = send_raw_email(
                    send.recipient_email, subject, html, text,
                    from_name=campaign_email.from_name, reply_to=campaign_email.reply_to,
                )
                error = "All email providers failed"

            if ok:
                send.status = CampaignSend.Status.SENT
                send.sent_at = timezone.now()
                send.save(update_fields=["status", "sent_at"])
                sent_count += 1
            else:
                send.status = CampaignSend.Status.FAILED
                send.failure_reason = error
                send.save(update_fields=["status", "failure_reason"])
                failed_count += 1

        if batch_start + BATCH_SIZE < len(sends):
            time.sleep(BATCH_DELAY_SECONDS)

    return sent_count, failed_count


@shared_task(name="campaigns.tasks.send_campaign")
def send_campaign(campaign_id):
    from campaigns.audience import resolve_campaign_audience
    from campaigns.models import CampaignEmail, CampaignSend, EmailCampaign

    campaign = EmailCampaign.objects.filter(id=campaign_id).first()
    if not campaign:
        logger.error(f"[campaigns] send_campaign called for missing campaign {campaign_id}")
        return

    step_one = CampaignEmail.objects.filter(campaign=campaign, sequence_number=1).first()
    if not step_one or not step_one.email_template_id:
        logger.error(f"[campaigns] send_campaign called for campaign {campaign_id} with no first-step template")
        return

    campaign.status = EmailCampaign.Status.SENDING
    campaign.save(update_fields=["status"])

    recipients, excluded = resolve_campaign_audience(campaign)
    is_tn = campaign.audience_pool == EmailCampaign.AudiencePool.TALENT_NETWORK
    sends = CampaignSend.objects.bulk_create([
        CampaignSend(
            campaign=campaign, campaign_email=step_one,
            organisation_id=None if is_tn else r.get("company_id"),
            recipient_email=r["email"], recipient_name=r["name"], status=CampaignSend.Status.QUEUED,
        )
        for r in recipients
    ], ignore_conflicts=True)

    step_one.status = CampaignEmail.Status.SENDING
    step_one.save(update_fields=["status"])

    sent_count, failed_count = _send_batch(step_one, sends)

    step_one.status = CampaignEmail.Status.SENT
    step_one.sent_at = timezone.now()
    step_one.total_sent = sent_count
    step_one.save(update_fields=["status", "sent_at", "total_sent"])

    # A length-1 sequence (the common "single blast" case) is done the
    # moment step 1 finishes -- otherwise advance_sequence_steps (beat task)
    # takes over from here.
    if not CampaignEmail.objects.filter(campaign=campaign, sequence_number__gt=1).exists():
        campaign.status = EmailCampaign.Status.SENT
        campaign.sent_at = timezone.now()
        campaign.save(update_fields=["status", "sent_at"])

    logger.info(
        f"[campaigns] Campaign {campaign_id} step 1 sent: {sent_count} sent, {failed_count} failed, "
        f"{excluded} excluded (unsubscribed)."
    )
    return {"sent": sent_count, "failed": failed_count, "excluded_unsubscribed": excluded}


def _eligible_recipients_for_step(previous_step, step):
    """Previous-step recipients who are due for `step` right now: their
    previous send succeeded, this step's delay has elapsed since then, this
    step's condition (evaluated against the previous send's opened_at/
    clicked_at) is satisfied, and they don't already have a send for this
    step (idempotent across ticks)."""
    from campaigns.models import CampaignEmail, CampaignSend

    already_sent_emails = set(
        CampaignSend.objects.filter(campaign_email=step).values_list("recipient_email", flat=True)
    )
    prev_sends = CampaignSend.objects.filter(
        campaign_email=previous_step,
        status__in=[CampaignSend.Status.SENT, CampaignSend.Status.DELIVERED, CampaignSend.Status.OPENED, CampaignSend.Status.CLICKED],
    ).exclude(recipient_email__in=already_sent_emails)

    delay_cutoff = timezone.now() - timedelta(seconds=step.delay_seconds)
    due = prev_sends.filter(sent_at__lte=delay_cutoff)

    if step.condition_type == CampaignEmail.ConditionType.IF_PREVIOUS_OPENED:
        due = due.filter(opened_at__isnull=False)
    elif step.condition_type == CampaignEmail.ConditionType.IF_PREVIOUS_NOT_OPENED:
        due = due.filter(opened_at__isnull=True)
    elif step.condition_type == CampaignEmail.ConditionType.IF_PREVIOUS_CLICKED:
        due = due.filter(clicked_at__isnull=False)

    return list(due)


def _pending_count_for_step(previous_step, step):
    """How many previous-step recipients are still *possibly* headed to
    `step` -- either still waiting out the delay, or still inside the
    condition-resolution window. Used to decide whether the sequence (and
    therefore the campaign) can be considered fully resolved yet."""
    from campaigns.models import CampaignEmail, CampaignSend

    already_sent_emails = set(
        CampaignSend.objects.filter(campaign_email=step).values_list("recipient_email", flat=True)
    )
    prev_sends = CampaignSend.objects.filter(
        campaign_email=previous_step,
        status__in=[CampaignSend.Status.SENT, CampaignSend.Status.DELIVERED, CampaignSend.Status.OPENED, CampaignSend.Status.CLICKED],
    ).exclude(recipient_email__in=already_sent_emails)

    delay_cutoff = timezone.now() - timedelta(seconds=step.delay_seconds)
    still_waiting_on_delay = prev_sends.filter(sent_at__gt=delay_cutoff).count()

    still_waiting_on_condition = 0
    if step.condition_type != CampaignEmail.ConditionType.ALWAYS:
        condition_window_cutoff = timezone.now() - timedelta(days=CONDITION_RESOLUTION_WINDOW_DAYS)
        still_waiting_on_condition = prev_sends.filter(
            sent_at__lte=delay_cutoff, sent_at__gt=condition_window_cutoff
        ).count()

    return still_waiting_on_delay + still_waiting_on_condition


@shared_task(name="campaigns.tasks.advance_sequence_steps")
def advance_sequence_steps():
    """Runs every 5 minutes (see celery.py beat_schedule) -- fires step 2+
    of every SENDING campaign's sequence once each recipient's delay/
    condition against the previous step resolves. PAUSED and CANCELLED
    campaigns are implicitly skipped (only SENDING is polled). Marks a
    campaign SENT once every step-pair in its sequence has zero recipients
    still possibly in flight."""
    from campaigns.models import CampaignEmail, CampaignSend, EmailCampaign

    dispatched = 0
    for campaign in EmailCampaign.objects.filter(status=EmailCampaign.Status.SENDING):
        steps = list(CampaignEmail.objects.filter(campaign=campaign).order_by("sequence_number"))
        if len(steps) < 2:
            continue

        campaign_pending = 0
        for i in range(1, len(steps)):
            previous, step = steps[i - 1], steps[i]

            eligible = _eligible_recipients_for_step(previous, step)
            if eligible:
                new_sends = CampaignSend.objects.bulk_create([
                    CampaignSend(
                        campaign=campaign, campaign_email=step, organisation=prev.organisation,
                        recipient_email=prev.recipient_email, recipient_name=prev.recipient_name,
                        status=CampaignSend.Status.QUEUED,
                    )
                    for prev in eligible
                ], ignore_conflicts=True)

                if step.status == CampaignEmail.Status.PENDING:
                    step.status = CampaignEmail.Status.SENDING
                    step.save(update_fields=["status"])

                sent_count, failed_count = _send_batch(step, new_sends)
                dispatched += sent_count
                CampaignEmail.objects.filter(id=step.id).update(total_sent=models.F("total_sent") + sent_count)

            pair_pending = _pending_count_for_step(previous, step)
            campaign_pending += pair_pending

            if pair_pending == 0 and step.status == CampaignEmail.Status.SENDING:
                CampaignEmail.objects.filter(id=step.id).update(status=CampaignEmail.Status.SENT, sent_at=timezone.now())

        if campaign_pending == 0:
            campaign.status = EmailCampaign.Status.SENT
            campaign.sent_at = timezone.now()
            campaign.save(update_fields=["status", "sent_at"])

    if dispatched:
        logger.info(f"[campaigns] advance_sequence_steps dispatched {dispatched} step-2+ send(s).")
    return {"dispatched": dispatched}


@shared_task(name="campaigns.tasks.dispatch_scheduled_campaigns")
def dispatch_scheduled_campaigns():
    """Runs every 5 minutes (see celery.py beat_schedule) -- picks up
    SCHEDULED campaigns whose scheduled_for has arrived and hands them to
    send_campaign. This is the mechanism that actually fires scheduled (as
    opposed to immediate) sends from the campaign builder's Timing panel."""
    from campaigns.models import EmailCampaign

    due = EmailCampaign.objects.filter(
        status=EmailCampaign.Status.SCHEDULED, scheduled_for__lte=timezone.now()
    )
    count = 0
    for campaign in due:
        send_campaign.delay(str(campaign.id))
        count += 1
    if count:
        logger.info(f"[campaigns] Dispatched {count} scheduled campaign(s).")
    return {"dispatched": count}
