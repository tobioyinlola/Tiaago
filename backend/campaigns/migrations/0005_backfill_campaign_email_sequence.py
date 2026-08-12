from django.db import migrations


def backfill_campaign_email_step_one(apps, schema_editor):
    """Every existing EmailCampaign becomes a sequence of length 1: its own
    subject_line/preview_text/email_template/template_variables move onto a
    new CampaignEmail(sequence_number=1) row, and every existing CampaignSend
    for that campaign is linked to it. Safe to run on an empty table too."""
    EmailCampaign = apps.get_model("campaigns", "EmailCampaign")
    CampaignEmail = apps.get_model("campaigns", "CampaignEmail")
    CampaignSend = apps.get_model("campaigns", "CampaignSend")

    for campaign in EmailCampaign.objects.all():
        step_one = CampaignEmail.objects.create(
            campaign=campaign,
            sequence_number=1,
            email_template_id=campaign.email_template_id,
            subject=campaign.subject_line or "",
            preview_text=campaign.preview_text or "",
            send_delay_type="IMMEDIATELY",
            condition_type="ALWAYS",
            status="SENT" if campaign.status == "SENT" else "PENDING",
            sent_at=campaign.sent_at,
        )
        CampaignSend.objects.filter(campaign=campaign).update(campaign_email=step_one)


def noop_reverse(apps, schema_editor):
    # Data-only migration -- reversing would mean deleting CampaignEmail
    # rows, which the schema-reversal of migration 0007 (re-adding the old
    # EmailCampaign fields) doesn't need populated. Nothing to do.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('campaigns', '0004_campaignemail_and_pool_fields'),
    ]

    operations = [
        migrations.RunPython(backfill_campaign_email_step_one, noop_reverse),
    ]
