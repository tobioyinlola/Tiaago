from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("support", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START 1;",
            reverse_sql="DROP SEQUENCE IF EXISTS support_ticket_number_seq;",
        ),
    ]
