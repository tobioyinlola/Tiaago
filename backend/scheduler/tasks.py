import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from datetime import timedelta, datetime
from django.utils import timezone
from emails import emails
from .models import Scheduler

User = get_user_model()
logger = logging.getLogger("tasks")

def get_meeting_details(meeting_instance):
    """Prepare meeting details for email templates."""
    try:
        details = {
            "title": meeting_instance.title,
            "date": meeting_instance.meeting_date.strftime("%A, %d %B %Y"),
            "start_time": meeting_instance.start_time.strftime("%I:%M %p"),  # Fixed format
            "end_time": meeting_instance.end_time.strftime("%I:%M %p"),  # Fixed format
            "duration": (
                (datetime.combine(meeting_instance.meeting_date, meeting_instance.end_time) -
                datetime.combine(meeting_instance.meeting_date, meeting_instance.start_time)
                ).seconds // 60
            ) if meeting_instance.end_time else None,
            "room_name": meeting_instance.room_name,
            "room_url": meeting_instance.room_url,
            "participants": meeting_instance.no_of_participants,
            "description": meeting_instance.description or "No description provided.",
            "company_name": meeting_instance.company.company_name,
            "company_logo": meeting_instance.company.get_logo_url(),
        }
        return details
    except Exception as e:
        logger.error(f"Error preparing meeting details: {str(e)}")
        raise



@shared_task
def send_meeting_reminder(user_id, company_name, meeting_id):
    """
    Send a meeting reminder to a talent user.
    """
    logger.info(f"Sending meeting reminder for meeting {meeting_id} to user {user_id}")
    try:
        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)

        # Ensure we are using a valid timezone
        now = timezone.now()
        meeting_time = timezone.make_aware(
            datetime.combine(meeting_instance.meeting_date, meeting_instance.start_time)
        )

        # Check if the meeting is in the future before sending the reminder
        if meeting_time > now and meeting_instance.accepted:
            meeting_details = get_meeting_details(meeting_instance)
            result = emails.meeting_invite_reminder(user, company_name, meeting_details)
            logger.info(f"Successfully sent reminder email for meeting {meeting_id}")
            return result
        else:
            logger.warning(f"Skipped reminder: Meeting {meeting_id} is in past or not accepted")
            return None
    except Scheduler.DoesNotExist:
        logger.error(f"Meeting {meeting_id} not found")
        return None
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error sending meeting reminder: {str(e)}")
        raise
    
@shared_task
def meeting_invite_mail(user_id, company_name, meeting_id):
    """send initial meeting invite email for meeting"""
    logger.info(f"Sending meeting invitation for meeting {meeting_id} to user {user_id}")
    try:
        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        meeting_details = get_meeting_details(meeting_instance)
        result = emails.meeting_invite_mail(user, company_name, meeting_details)
        logger.info(f"Successfully sent invitation email for meeting {meeting_id}")
        return result
    except Scheduler.DoesNotExist:
        logger.error(f"Meeting {meeting_id} not found")
        return None
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error sending meeting invitation: {str(e)}")
        raise
    


@shared_task
def meeting_invite_reminder(user_id, company_name, meeting_id):
    """send a follow-up reminder email for meeting"""
    try:
        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        meeting_details = get_meeting_details(meeting_instance)
        return emails.meeting_invite_reminder(user, company_name, meeting_details)
    except (Scheduler.DoesNotExist, User.DoesNotExist):
        return None

@shared_task
def meeting_invite_others(user_id, meeting_id, user_emails=None):
    """send meeting invite email to additional participants"""
    logger.info(f"Sending meeting invitation to additional participants for meeting {meeting_id}")
    try:
        if not user_emails:
            logger.warning("No additional emails provided, skipping")
            return None

        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        meeting_details = get_meeting_details(meeting_instance)
        
        # Validate email list
        email_list = [email.strip() for email in user_emails.split(',') if email.strip()]
        if not email_list:
            logger.warning("No valid emails found in the provided list")
            return None
            
        result = emails.meeting_invite_others(user, user_emails, meeting_details)
        logger.info(f"Successfully sent invitations to additional participants for meeting {meeting_id}")
        return result
    except Scheduler.DoesNotExist:
        logger.error(f"Meeting {meeting_id} not found")
        return None
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error sending invitations to additional participants: {str(e)}")
        raise
    
@shared_task
def startup_interview_acceptance_mail(user_id, company_name, meeting_id):
    """Send email notification to company when talent accepts interview"""
    logger.info(f"Sending interview acceptance notification for meeting {meeting_id}")
    try:
        user = User.objects.get(id=user_id)
        meeting_instance = Scheduler.objects.get(id=meeting_id)
        meeting_details = get_meeting_details(meeting_instance)
        result = emails.startup_interview_acceptance_mail(user, company_name, meeting_details)
        logger.info(f"Successfully sent interview acceptance notification for meeting {meeting_id}")
        return result
    except Scheduler.DoesNotExist:
        logger.error(f"Meeting {meeting_id} not found")
        return None
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error sending interview acceptance notification: {str(e)}")
        raise