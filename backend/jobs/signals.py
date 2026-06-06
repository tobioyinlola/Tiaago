from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.conf import settings
from .models import Job, JobApplication
from marketing.tasks import tag_user_in_convertkit


@receiver(post_save, sender=JobApplication)
def increment_job_application_count(sender, instance, created, **kwargs):
    if created:
        job = instance.job
        job.no_of_applications += 1
        job.save(update_fields=['no_of_applications'])


# @receiver(post_save, sender=JobApplication)
# def handle_job_application_status_change(sender, instance, **kwargs):
#     """
#     When a job application status changes to passed resume screening,
#     tag the user in ConvertKit.
#     """
#     if instance.status == JobApplication.JobApplicationStatus.RESUME_SCREENING_PASSED:
#         tag_user_in_convertkit.delay(
#             email=instance.applicant.user.email,
#             tag_id=settings.CONVERTKIT_RESUME_SCREENING_PASSED_TAG
#         )


@receiver(post_delete, sender=JobApplication)
def decrement_job_application_count(sender, instance, **kwargs):
    job = instance.job
    job.no_of_applications -= 1
    job.save(update_fields=['no_of_applications'])