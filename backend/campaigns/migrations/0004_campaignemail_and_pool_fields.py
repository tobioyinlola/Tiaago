import uuid

import django.contrib.postgres.fields
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('campaigns', '0003_seed_preset_templates'),
    ]

    operations = [
        migrations.AddField(
            model_name='emailcampaign',
            name='audience_pool',
            field=models.CharField(
                choices=[('COMPANY', 'Companies / recruiters'), ('TALENT_NETWORK', 'Talent Network')],
                default='COMPANY', max_length=15,
            ),
        ),
        migrations.AddField(
            model_name='emailcampaign',
            name='tn_role_categories',
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=30, choices=[
                    ('PRODUCT_MANAGEMENT', 'Product Management'), ('ENGINEERING', 'Engineering'),
                    ('BACKEND_ENGINEERING', 'Backend Engineering'), ('FRONTEND_ENGINEERING', 'Frontend Engineering'),
                    ('FULL_STACK', 'Full Stack'), ('DEVOPS', 'DevOps'), ('AI_ML', 'AI/ML'),
                    ('UI_UX_DESIGN', 'UI/UX Design'), ('DATA', 'Data'), ('MARKETING', 'Marketing'),
                    ('SALES', 'Sales'), ('CUSTOMER_SUCCESS', 'Customer Success'), ('FINANCE', 'Finance'),
                    ('OPERATIONS', 'Operations'), ('HR', 'HR'), ('LEGAL', 'Legal'),
                    ('BUSINESS_DEVELOPMENT', 'Business Development'), ('OTHER', 'Other'),
                ]),
                blank=True, default=list, size=None,
            ),
        ),
        migrations.AddField(
            model_name='emailcampaign',
            name='tn_industries',
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=20, choices=[
                    ('FINTECH', 'Fintech'), ('HRTECH', 'HRTech'), ('HEALTHTECH', 'HealthTech'),
                    ('EDTECH', 'EdTech'), ('SAAS', 'SaaS'), ('ECOMMERCE', 'E-commerce'), ('AI', 'AI'),
                    ('BLOCKCHAIN', 'Blockchain'), ('CONSULTING', 'Consulting'), ('OTHER', 'Other'),
                ]),
                blank=True, default=list, size=None,
            ),
        ),
        migrations.AddField(
            model_name='emailcampaign',
            name='tn_years_experience',
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=10, choices=[
                    ('0-2', '0-2 Years'), ('2-5', '2-5 Years'), ('5-8', '5-8 Years'),
                    ('8-12', '8-12 Years'), ('12+', '12+ Years'),
                ]),
                blank=True, default=list, size=None,
            ),
        ),
        migrations.AddField(
            model_name='emailcampaign',
            name='tn_work_type',
            field=models.CharField(
                blank=True, default='', max_length=10,
                choices=[('REMOTE', 'Remote'), ('HYBRID', 'Hybrid'), ('ONSITE', 'On-site')],
            ),
        ),
        migrations.AlterField(
            model_name='emailcampaign',
            name='audience_type',
            field=models.CharField(
                blank=True, null=True, max_length=10,
                choices=[('ALL', 'All'), ('SEGMENT', 'Segment'), ('TAG', 'Tag'), ('MANUAL', 'Manual selection')],
            ),
        ),
        migrations.CreateModel(
            name='CampaignEmail',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('sequence_number', models.PositiveSmallIntegerField()),
                ('subject', models.CharField(blank=True, default='', max_length=120)),
                ('preview_text', models.CharField(blank=True, default='', max_length=160)),
                ('from_name', models.CharField(blank=True, default='Tiaago', max_length=100)),
                ('reply_to', models.EmailField(blank=True, max_length=254, null=True)),
                ('send_delay_type', models.CharField(
                    choices=[('IMMEDIATELY', 'Immediately'), ('DELAY_AFTER_PREVIOUS', 'After a delay')],
                    default='IMMEDIATELY', max_length=25,
                )),
                ('send_delay_hours', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('send_delay_days', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('condition_type', models.CharField(
                    choices=[
                        ('ALWAYS', 'Always'), ('IF_PREVIOUS_OPENED', 'If previous email was opened'),
                        ('IF_PREVIOUS_NOT_OPENED', 'If previous email was not opened'),
                        ('IF_PREVIOUS_CLICKED', 'If previous email was clicked'),
                    ],
                    default='ALWAYS', max_length=25,
                )),
                ('status', models.CharField(
                    choices=[('PENDING', 'Pending'), ('SENDING', 'Sending'), ('SENT', 'Sent'), ('FAILED', 'Failed')],
                    db_index=True, default='PENDING', max_length=10,
                )),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('total_sent', models.PositiveIntegerField(default=0)),
                ('total_opened', models.PositiveIntegerField(default=0)),
                ('total_clicked', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('campaign', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='emails', to='campaigns.emailcampaign')),
                ('email_template', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='campaign_emails', to='campaigns.emailtemplate')),
            ],
            options={
                'ordering': ('sequence_number',),
            },
        ),
        migrations.AddConstraint(
            model_name='campaignemail',
            constraint=models.UniqueConstraint(fields=('campaign', 'sequence_number'), name='unique_campaign_sequence_number'),
        ),
        migrations.AddField(
            model_name='campaignsend',
            name='campaign_email',
            # Nullable for now -- backfilled by the next (data) migration,
            # then tightened to required in the migration after that. Doing
            # it in three steps (add nullable -> backfill -> require) is the
            # only safe way to add a required FK to a table that may already
            # have rows.
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sends', to='campaigns.campaignemail'),
        ),
    ]
