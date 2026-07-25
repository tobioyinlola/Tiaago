"""Closes the last leg of the notification funnel: if a candidate who
applies to a job is a Talent Network member who was notified about that
exact job, mark the notification APPLIED. Matched by email address (not a
session/cookie), so it works even if the candidate opens the notification
email on one device and applies from another."""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from jobs.models import JobApplication

from .models import JobMatchNotification, TalentNetworkMember


@receiver(post_save, sender=JobApplication)
def mark_notification_applied(sender, instance: JobApplication, created, **kwargs):
    if not created:
        return

    applicant_email = getattr(instance.applicant.user, "email", None)
    if not applicant_email:
        return

    member = TalentNetworkMember.objects.filter(email__iexact=applicant_email).first()
    if not member:
        return

    JobMatchNotification.objects.filter(
        job_id=instance.job_id, member=member
    ).exclude(status=JobMatchNotification.Status.APPLIED).update(
        status=JobMatchNotification.Status.APPLIED, applied_at=timezone.now()
    )
