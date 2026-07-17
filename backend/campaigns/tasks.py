import logging
import time

from celery import shared_task
from django.utils import timezone

from create_user.models import Company
from utils.email_handler import EmailHandler, MAILGUN_API_KEY, MAILGUN_DOMAIN, RESEND_API_KEY, RESEND_FROM_EMAIL

logger = logging.getLogger(__name__)

BATCH_SIZE = 50
BATCH_DELAY_SECONDS = 1


def send_raw_email(recipient_email, subject, html, text_body):
    """Resend-first, Mailgun-fallback send of pre-rendered HTML -- reuses
    EmailHandler's provider methods directly (they accept raw HTML, unlike
    EmailHandler.send_mail() which renders a Django template) rather than
    duplicating the Resend/Mailgun HTTP logic. One attempt per provider (no
    inner retry-sleep) since campaign sends are already batched with a
    1-second delay between batches of 50 -- send_mail's transactional-email
    2-attempt-with-sleep retry would otherwise stall a batch."""
    handler = EmailHandler(recipient_email)
    if RESEND_API_KEY:
        try:
            message_id = handler._send_via_resend(subject, html, text_body=text_body)
            if message_id is not None:
                return True
        except Exception as exc:
            logger.error(f"[campaigns] Resend send to {recipient_email} failed: {exc}")
    if MAILGUN_API_KEY and MAILGUN_DOMAIN:
        try:
            return handler._send_via_mailgun(subject, html, RESEND_FROM_EMAIL, text_body=text_body)
        except Exception as exc:
            logger.error(f"[campaigns] Mailgun send to {recipient_email} failed: {exc}")
    return False


@shared_task(name="campaigns.tasks.send_campaign")
def send_campaign(campaign_id):
    from campaigns.audience import resolve_campaign_audience
    from campaigns.merge_tags import build_merge_context
    from campaigns.models import CampaignSend, EmailCampaign
    from campaigns.send_renderer import build_unsubscribe_url, personalize_for_send

    campaign = EmailCampaign.objects.filter(id=campaign_id).first()
    if not campaign or not campaign.email_template_id:
        logger.error(f"[campaigns] send_campaign called for missing/templateless campaign {campaign_id}")
        return

    campaign.status = EmailCampaign.Status.SENDING
    campaign.save(update_fields=["status"])

    recipients, excluded = resolve_campaign_audience(campaign)
    sends = CampaignSend.objects.bulk_create([
        CampaignSend(
            campaign=campaign, organisation_id=r["company_id"],
            recipient_email=r["email"], recipient_name=r["name"], status=CampaignSend.Status.QUEUED,
        )
        for r in recipients
    ])

    template = campaign.email_template
    company_cache = {c.id: c for c in Company.objects.filter(id__in=[s.organisation_id for s in sends])}

    sent_count = failed_count = 0
    for batch_start in range(0, len(sends), BATCH_SIZE):
        batch = sends[batch_start:batch_start + BATCH_SIZE]
        for send in batch:
            company = company_cache.get(send.organisation_id)
            if not company:
                send.status = CampaignSend.Status.FAILED
                send.failure_reason = "Organisation no longer exists"
                send.save(update_fields=["status", "failure_reason"])
                failed_count += 1
                continue

            context = build_merge_context(company, send.recipient_name)
            context["unsubscribe_url"] = build_unsubscribe_url(send)
            html, text = personalize_for_send(template.html_body, template.plain_text_body, context, send)
            subject = campaign.subject_line or template.subject_line

            ok = send_raw_email(send.recipient_email, subject, html, text)
            if ok:
                send.status = CampaignSend.Status.SENT
                send.sent_at = timezone.now()
                send.save(update_fields=["status", "sent_at"])
                sent_count += 1
            else:
                send.status = CampaignSend.Status.FAILED
                send.failure_reason = "All email providers failed"
                send.save(update_fields=["status", "failure_reason"])
                failed_count += 1

        if batch_start + BATCH_SIZE < len(sends):
            time.sleep(BATCH_DELAY_SECONDS)

    campaign.status = EmailCampaign.Status.SENT
    campaign.sent_at = timezone.now()
    campaign.save(update_fields=["status", "sent_at"])

    logger.info(
        f"[campaigns] Campaign {campaign_id} sent: {sent_count} sent, {failed_count} failed, "
        f"{excluded} excluded (unsubscribed)."
    )
    return {"sent": sent_count, "failed": failed_count, "excluded_unsubscribed": excluded}


@shared_task(name="campaigns.tasks.dispatch_scheduled_campaigns")
def dispatch_scheduled_campaigns():
    """Runs every 5 minutes (see celery.py beat_schedule) -- picks up
    SCHEDULED campaigns whose scheduled_for has arrived and hands them to
    send_campaign. This is the mechanism that actually fires scheduled (as
    opposed to immediate) sends from the wizard's Schedule step."""
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
