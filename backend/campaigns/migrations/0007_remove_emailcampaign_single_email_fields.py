from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('campaigns', '0006_campaignsend_campaign_email_required'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='emailcampaign',
            name='email_template',
        ),
        migrations.RemoveField(
            model_name='emailcampaign',
            name='subject_line',
        ),
        migrations.RemoveField(
            model_name='emailcampaign',
            name='preview_text',
        ),
        migrations.RemoveField(
            model_name='emailcampaign',
            name='template_variables',
        ),
    ]
