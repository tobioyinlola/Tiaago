import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('campaigns', '0005_backfill_campaign_email_sequence'),
    ]

    operations = [
        migrations.AlterField(
            model_name='campaignsend',
            name='campaign_email',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sends', to='campaigns.campaignemail'),
        ),
        migrations.AddConstraint(
            model_name='campaignsend',
            constraint=models.UniqueConstraint(fields=('campaign_email', 'recipient_email'), name='unique_campaign_email_recipient'),
        ),
    ]
