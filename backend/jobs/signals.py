from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Job, JobApplication


@receiver(post_save, sender=JobApplication)
def increment_job_application_count(sender, instance, created, **kwargs):
    if created:
        job = instance.job
        job.no_of_applications += 1
        job.save(update_fields=['no_of_applications'])


@receiver(post_delete, sender=JobApplication)
def decrement_job_application_count(sender, instance, **kwargs):
    job = instance.job
    job.no_of_applications -= 1
    job.save(update_fields=['no_of_applications'])
