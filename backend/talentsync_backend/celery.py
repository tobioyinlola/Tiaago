import os

from celery import Celery
from celery.schedules import crontab
from loguru import logger
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'talentsync_backend.settings')

app = Celery('talentsync_backend')

app.config_from_object(f'django.conf:settings', namespace='CELERY')

app.conf.broker_connection_retry_on_startup = True
app.conf.worker_hijack_root_logger = False

app.autodiscover_tasks()

app.conf.beat_schedule = {
    # Scheduler Name
    "carry_out_pending_resume_analyses": {
        "task": "carry_out_pending_resume_analyses",
        "schedule": crontab(minute='*/15'),
    },
    "charge_recruiter_card_task": {
        "task": "charge_recruiter_card_task",
        "schedule": crontab(day_of_month=20, hour=0, minute=0),  # Run at midnight on 20th, 25th, 30th
    },
    "charge_monthly_payg_card_task": {
        "task": "charge_monthly_payg_card_task",
        "schedule": crontab(day_of_month=20, hour=0, minute=0),
        # "schedule": crontab(minute="*/1"),
    },
    # Marketing automation tasks
    "batch_check_incomplete_assessments": {
        "task": "marketing.tasks.batch_check_incomplete_assessments",
        "schedule": crontab(hour=9, minute=0),  # Run daily at 9 AM
    },
    "batch_check_incomplete_profiles": {
        "task": "marketing.tasks.batch_check_incomplete_profiles",
        "schedule": crontab(hour=9, minute=30),  # Run daily at 9:30 AM
    },
    # Tagging / segmentation
    "run_tag_rule_engine": {
        "task": "tags.tasks.run_tag_rule_engine",
        "schedule": crontab(minute=0),  # Run hourly, on the hour
    },
    "refresh_all_segment_sizes": {
        "task": "segments.tasks.refresh_all_segment_sizes",
        "schedule": crontab(minute=5),  # Run hourly, 5 min after the tag rule engine
    },
    "dispatch_scheduled_campaigns": {
        "task": "campaigns.tasks.dispatch_scheduled_campaigns",
        "schedule": crontab(minute="*/5"),  # Check for due scheduled campaigns every 5 min
    },
    "advance_sequence_steps": {
        "task": "campaigns.tasks.advance_sequence_steps",
        "schedule": crontab(minute="*/5"),  # Fire step 2+ of drip sequences every 5 min
    },
}

  # Confirm IDs are being fetched

logger.info(f"[Celery] Broker: {app.conf.broker_url}")
logger.info(f"[Celery] Result backend: {app.conf.result_backend}")

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")