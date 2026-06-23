import logging
import datetime
import requests
import uuid
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)
from datetime import datetime, timedelta
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.generics import (
    ListCreateAPIView,
    UpdateAPIView,
    DestroyAPIView
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_201_CREATED, 
    HTTP_401_UNAUTHORIZED,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_500_INTERNAL_SERVER_ERROR,
    HTTP_204_NO_CONTENT
)
from subscriptions.permissions import (
    IsCompanyRepOrTalentUser, 
    IsUserVerified, 
    HasPremiumSubscription
)
from .tasks import (
    meeting_invite_mail,
    meeting_invite_others,
    send_meeting_reminder,
    startup_interview_acceptance_mail
)
from .models import Scheduler
from .permissions import  IsScheduledByCompanyOrTalent
from .serializers import (
    SchedulerSerializer,
    SchedulerUpdateSerializer
)
from base.mixins.pagination import TiaagoPagination
from create_user.permissions import get_user_company
from emails import emails
from celery import current_app



User = get_user_model()

class ScheduleMeetingView(ListCreateAPIView):
    serializer_class = SchedulerSerializer
    queryset = Scheduler.objects.all()
    permission_classes = [IsCompanyRepOrTalentUser, IsUserVerified]
    pagination_class = TiaagoPagination

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        user = request.user
        if user.user_type == User.USER_TYPE.TALENT:
            try:
                queryset = queryset.filter(talent=user.profile)
            except User.profile.RelatedObjectDoesNotExist:
                return Response(status=HTTP_401_UNAUTHORIZED)
        else:
            company = get_user_company(user)
            if company:
                queryset = queryset.filter(company=company)
            else:
                return Response(status=HTTP_401_UNAUTHORIZED)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        user = request.user # the company that wants to schedule a call is the user here
        if user.user_type != User.USER_TYPE.COMPANY_REP:
            return Response(
                {"detail": "You can't create a meeting"}, 
                status=HTTP_401_UNAUTHORIZED
            )
        company = get_user_company(user)
        if not company:
            return Response({"detail": "No company associated."}, status=HTTP_401_UNAUTHORIZED)
        if not user.is_subscribed() and company:
            meeting_count = Scheduler.objects.filter(
                company=company,
                meeting_date__month=timezone.now().date().month
            ).count()
            if meeting_count >= 2:
                return Response(
                    {"detail": "Maximum number of meeting created for the month"},
                    status=HTTP_400_BAD_REQUEST
                )
        queryset =self.get_queryset()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        talent = serializer.validated_data['talent']
        meeting = serializer.save(
            company=company,
        )
        # Get meeting details for the email
        meeting_details = {
            "title": meeting.title,
            "date": meeting.meeting_date.strftime("%A, %d %B %Y"),
            "start_time": meeting.start_time.strftime("I:%M %p"),
            "end_time": meeting.end_time.strftime("I:%M %p"),
            "duration": (
                (datetime.combine(meeting.meeting_date, meeting.end_time) -
                datetime.combine(meeting.meeting_date, meeting.start_time)
                ).seconds // 60
            ),
            "room_name": meeting.room_name,
            "room_url": meeting.room_url,
            "participants": meeting.no_of_participants,
            "description": meeting.description or "No description provided.",
            "company_name": meeting.company.company_name,
            "company_logo": meeting.company.get_logo_url(),
        }
        meeting_invite_mail.delay(talent.user.pk, company.company_name, str(meeting.id))
        return Response(serializer.data, status=HTTP_201_CREATED)

class SchedulerMeetingUpdateView(UpdateAPIView):
    serializer_class = SchedulerUpdateSerializer
    queryset = Scheduler.objects.all()
    permission_classes = [IsAuthenticated, IsScheduledByCompanyOrTalent]

    def put(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        if user.user_type == User.USER_TYPE.COMPANY_REP and "accepted" in request.data:
            return Response("Invalid value: accepted", status=HTTP_400_BAD_REQUEST)
        if user.user_type == User.USER_TYPE.TALENT:
            start_date = datetime.combine(instance.meeting_date, instance.start_time)
            end_date = datetime.combine(instance.meeting_date, instance.end_time)
            epoch_start_time_in_seconds = int(timezone.make_aware(start_date).timestamp())
            epoch_end_time_in_seconds = int(timezone.make_aware(end_date).timestamp())
            accepted = request.data.get("accepted", False)
           
            
            if accepted:
                # Send an api requests to daily api to create a room and corresponding tokens
                DAILY_API_TOKEN = getattr(settings, 'DAILY_API_TOKEN', None)
                if not DAILY_API_TOKEN:
                    logger.error("DAILY_API_TOKEN not found in settings")
                    return Response(
                        {"detail": "Video conferencing configuration error"}, 
                        status=HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                try:
                    # Log request data
                    request_data = {
                        "privacy": "private",
                        "properties": {
                            "nbf": str(epoch_start_time_in_seconds),
                            "exp": str(epoch_end_time_in_seconds)
                        }
                    }
                    logger.info(f"Sending request to Daily.co with data: {request_data}")
                    
                    res = requests.post(
                        "https://api.daily.co/v1/rooms/",
                        json=request_data,
                        headers={
                            'Accept': 'application/json',
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {DAILY_API_TOKEN}"
                        }
                    )
                    
                    if res.status_code != 200:
                        logger.error(f"Daily.co API error: Status {res.status_code}, Response: {res.text}")
                        return Response(
                            {"detail": f"Room creation failed: {res.text}"}, 
                            status=HTTP_500_INTERNAL_SERVER_ERROR
                        )
                        
                    result = res.json()
                    logger.info(f"Successfully created Daily.co room: {result}")
                    
                except requests.HTTPError as e:
                    logger.error(f"HTTP Error creating Daily.co room: {str(e)}")
                    return Response(
                        {"detail": f"Cannot create room: {str(e)}"}, 
                        status=HTTP_400_BAD_REQUEST
                    )
                except requests.RequestException as e:
                    logger.error(f"Network error with Daily.co API: {str(e)}")
                    return Response(
                        {"detail": f"Network error. Try again: {str(e)}"}, 
                        status=HTTP_500_INTERNAL_SERVER_ERROR
                    )
                except requests.exceptions.ConnectionError as e:
                    logger.error(f"Connection error with Daily.co API: {str(e)}")
                    return Response(
                        {"detail": f"Connection error. Try again: {str(e)}"}, 
                        status=HTTP_400_BAD_REQUEST
                    )
                except Exception as e:
                    logger.error(f"Unexpected error creating Daily.co room: {str(e)}")
                    return Response(
                        {"detail": f"An unexpected error occurred: {str(e)}"}, 
                        status=HTTP_500_INTERNAL_SERVER_ERROR
                    )

                if result["api_created"]:
                    instance.room_id = uuid.UUID(result.get("id"))
                    instance.room_name = result.get('name')
                    instance.room_url = result.get('url')
                    # generate a corresponding token
                    try:
                        token_request_data = {
                            "properties": {
                                "room_name": result.get("name"),
                                "eject_at_token_exp": True,
                                "nbf": str(epoch_start_time_in_seconds),
                                "exp": str(epoch_end_time_in_seconds),
                                "is_owner": True,
                                "enable_screenshare": True
                            }
                        }
                        logger.info(f"Requesting Daily.co token with data: {token_request_data}")
                        
                        res = requests.post(
                            "https://api.daily.co/v1/meeting-tokens",
                            json=token_request_data,
                            headers={
                                'Content-Type': 'application/json',
                                'Authorization': f'Bearer {DAILY_API_TOKEN}'
                            }
                        )
                        
                        if res.status_code != 200:
                            logger.error(f"Daily.co token creation error: Status {res.status_code}, Response: {res.text}")
                            return Response(
                                {"detail": f"Token creation failed: {res.text}"}, 
                                status=HTTP_500_INTERNAL_SERVER_ERROR
                            )
                            
                        token_result = res.json()
                        logger.info("Successfully created Daily.co token")
                        
                        if 'token' not in token_result:
                            logger.error(f"No token in Daily.co response: {token_result}")
                            return Response(
                                {"detail": "Invalid token response from server"}, 
                                status=HTTP_500_INTERNAL_SERVER_ERROR
                            )
                            
                        instance.token = token_result.get('token')
                        
                    except requests.HTTPError as e:
                        logger.error(f"HTTP Error creating Daily.co token: {str(e)}")
                        return Response(
                            {"detail": f"Cannot create token: {str(e)}"}, 
                            status=HTTP_400_BAD_REQUEST
                        )
                    except requests.RequestException as e:
                        logger.error(f"Network error creating token: {str(e)}")
                        return Response(
                            {"detail": f"Network error. Try again: {str(e)}"}, 
                            status=HTTP_500_INTERNAL_SERVER_ERROR
                        )
                    except requests.exceptions.ConnectionError as e:
                        logger.error(f"Connection error creating token: {str(e)}")
                        return Response(
                            {"detail": f"Connection error. Try again: {str(e)}"}, 
                            status=HTTP_400_BAD_REQUEST
                        )
                    except Exception as e:
                        logger.error(f"Unexpected error creating token: {str(e)}")
                        return Response(
                            {"detail": f"An unexpected error occurred: {str(e)}"}, 
                            status=HTTP_500_INTERNAL_SERVER_ERROR
                        )

            instance.accepted = accepted
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}
        if instance.accepted:
            # Get meeting details for emails
            meeting_details = {
                "title": instance.title,
                "date": instance.meeting_date.strftime("%A, %d %B %Y"),
                "start_time": instance.start_time.strftime("I:%M %p"),
                "end_time": instance.end_time.strftime("I:%M %p"),
                "duration": (
                    (datetime.combine(instance.meeting_date, instance.end_time) -
                    datetime.combine(instance.meeting_date, instance.start_time)
                    ).seconds // 60
                ),
                "room_name": instance.room_name,
                "room_url": instance.room_url,
                "participants": instance.no_of_participants,
                "description": instance.description or "No description provided.",
                "company_name": instance.company.company_name,
                "company_logo": instance.company.get_logo_url(),
            }
            # Send acceptance notification to company
            startup_interview_acceptance_mail.delay(
                instance.company.company_rep.id,
                instance.company.company_name,
                str(instance.id)
            )
            # Schedule the reminder email 1 hour before the meeting time
            meeting_time = timezone.make_aware(datetime.combine(instance.meeting_date, instance.start_time))
            reminder_delta = meeting_time - timedelta(hours=1)  # 1 hour before the meeting
            
            # Schedule reminder task and store the task ID
            # Schedule reminder for talent
            reminder_task = send_meeting_reminder.apply_async(
                (instance.talent.user.id, instance.company.company_name, str(instance.id)),
                eta=reminder_delta
            )
            instance.reminder_task_id = reminder_task.id
            
            # Schedule reminder for other participants if any
            if instance.additional_emails:
                others_task = meeting_invite_others.apply_async(
                    (instance.company.company_rep.id, str(instance.id), instance.additional_emails),
                    eta=reminder_delta
                )
                instance.others_task_id = others_task.id
            
            # Save the task IDs
            instance.save(update_fields=['reminder_task_id', 'others_task_id'])
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)
    

class SchedulerMeetingDeleteView(DestroyAPIView):
    queryset = Scheduler.objects.all()
    permission_classes = [IsAuthenticated, IsScheduledByCompanyOrTalent]
    lookup_field = 'pk'
    lookup_url_kwarg = 'pk'

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        # Store meeting details before deletion for notifications
        meeting_details = {
            'title': instance.title,
            'meeting_date': instance.meeting_date,
            'start_time': instance.start_time,
            'end_time': instance.end_time,
            'talent': instance.talent,
            'company': instance.company,
            'accepted': instance.accepted,
            'room_name': instance.room_name
        }

        # Cancel any scheduled reminder tasks for this meeting
        if instance.accepted:
            try:
                # Cancel scheduled reminder emails using stored task IDs
                if instance.reminder_task_id:
                    try:
                        current_app.control.revoke(
                            instance.reminder_task_id,
                            terminate=True,
                            signal='SIGTERM'
                        )
                    except Exception as e:
                        logger.error(f"Error cancelling reminder task {instance.reminder_task_id}: {e}")
                
                if instance.others_task_id:
                    try:
                        current_app.control.revoke(
                            instance.others_task_id,
                            terminate=True,
                            signal='SIGTERM'
                        )
                    except Exception as e:
                        logger.error(f"Error cancelling others task {instance.others_task_id}: {e}")
                        
            except Exception as e:
                # Log error but continue with deletion
                logger.error(f"Error cancelling scheduled tasks: {e}")

        # Delete Daily.co room if it exists
        if instance.room_name and instance.accepted:
            try:
                DAILY_API_TOKEN = settings.DAILY_API_TOKEN
                res = requests.delete(
                    f"https://api.daily.co/v1/rooms/{instance.room_name}",
                    headers={
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {DAILY_API_TOKEN}'
                    }
                )
                # Don't fail if room deletion fails - it might already be deleted
                if res.status_code not in [200, 404]:
                    logger.warning(f"Warning: Failed to delete Daily.co room {instance.room_name}")
            except Exception as e:
                # Log error but continue with deletion
                logger.error(f"Error deleting Daily.co room: {e}")

        # Delete the meeting
        self.perform_destroy(instance)

        # Send cancellation notifications
        try:
            if user.user_type == User.USER_TYPE.COMPANY_REP:
                # Notify talent that meeting was cancelled by company
                if meeting_details['talent'].user:
                    # Format meeting details for cancellation email
                    cancel_meeting_details = {
                        "title": meeting_details['title'],
                        "date": meeting_details['meeting_date'].strftime("%A, %d %B %Y"),
                        "start_time": meeting_details['start_time'].strftime("I:%M %p"),
                        "end_time": meeting_details['end_time'].strftime("I:%M %p"),
                        "room_name": meeting_details['room_name'],
                        "description": meeting_details.get('description', 'No description provided.'),
                        "company_name": meeting_details['company'].company_name,
                        "company_logo": meeting_details['company'].get_logo_url()
                    }
                    emails.meeting_cancelled_by_company(
                        meeting_details['talent'].user,
                        meeting_details['company'].company_name,
                        cancel_meeting_details
                    )
            elif user.user_type == User.USER_TYPE.TALENT:
                # Notify company that meeting was cancelled by talent
                if meeting_details['company'].company_rep:
                    # Format meeting details for cancellation email
                    cancel_meeting_details = {
                        "title": meeting_details['title'],
                        "date": meeting_details['meeting_date'].strftime("%A, %d %B %Y"),
                        "start_time": meeting_details['start_time'].strftime("I:%M %p"),
                        "end_time": meeting_details['end_time'].strftime("I:%M %p"),
                        "room_name": meeting_details['room_name'],
                        "description": meeting_details.get('description', 'No description provided.'),
                        "company_name": meeting_details['company'].company_name,
                        "company_logo": meeting_details['company'].get_logo_url()
                    }
                    emails.meeting_cancelled_by_talent(
                        meeting_details['company'].company_rep,
                        meeting_details['talent'].full_name,
                        cancel_meeting_details
                    )
        except Exception as e:
            # Log error but don't fail deletion
            logger.error(f"Error sending cancellation notifications: {e}")

        return Response({"detail": "Meeting deleted successfully."}, status=HTTP_204_NO_CONTENT)
    

