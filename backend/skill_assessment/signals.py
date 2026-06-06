# assessments/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

from .models import CandidateAssessmentSubmission, AssessmentCooldown
from emails.emails import send_assessment_failure_via_handler  # failure
from emails.emails import send_assessment_pass_via_handler  # success (certificate)


@receiver(post_save, sender=CandidateAssessmentSubmission)
def handle_assessment_result(
    sender, instance: CandidateAssessmentSubmission, created, **kwargs
):
    """
    When an assessment submission is marked complete, decide pass/fail and send mail.
    """
    if (
        not instance.is_completed
        or instance.mark_status
        != CandidateAssessmentSubmission.MarkStatusChoices.MARKED
    ):
        return

    def _trigger():
        if instance.total_score is None:
            return

        skill_assessment = instance.skill_assessment
        is_tiaago = skill_assessment.is_tiaago_skill_assessment
        
        job_application = getattr(instance.skill_assessment, 'job_application', None)
        job = getattr(job_application, 'job', None) if job_application else None
        company = getattr(job, 'company', None) if job else None
        job_title = getattr(job, 'title', None) if job else None
        if not job_title:
            job_title = instance.skill_assessment.title
        company_name = getattr(company, 'company_name', None) if company else None

        if instance.total_score >= 70:
            if not instance.is_passed:
                instance.is_passed = True
                instance.save(update_fields=["is_passed"])
            send_assessment_pass_via_handler(
                to_email=instance.candidate.user.email,
                talent_name=instance.candidate.full_name or instance.candidate.user.get_full_name(),
                total_score=instance.total_score,
                assessment=instance.skill_assessment,
                job_title=job_title,
                company_name=company_name,
                submission=instance,
                is_tiaago=is_tiaago,
            )
        else:
            if instance.is_passed: 
                instance.is_passed = False
                instance.save(update_fields=["is_passed"])
            
            # Create or update cooldown record for failed assessment
            cooldown_ends_at = timezone.now() + timedelta(days=14)
            AssessmentCooldown.objects.update_or_create(
                talent=instance.candidate,
                skill_assessment=instance.skill_assessment,
                defaults={
                    'cooldown_ends_at': cooldown_ends_at,
                    'failed_at': timezone.now()
                }
            )
            
            # Create the retake link URL using the public endpoint
            retake_link = f"{settings.FRONTEND_URL}/assessments/retake/{instance.skill_assessment.id}"
            
            send_assessment_failure_via_handler(
                to_email=instance.candidate.user.email,
                talent_name=instance.candidate.full_name or instance.candidate.user.get_full_name(),
                total_score=instance.total_score,
                retake_days=14,
                retake_link=retake_link,
                job_title=job_title,
                company_name=company_name,
                is_tiaago=is_tiaago,
            )

    transaction.on_commit(_trigger)
