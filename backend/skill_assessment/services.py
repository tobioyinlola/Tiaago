from django.db.models.query import QuerySet
from .models import InterviewSessionQueue, PreScreeningInterviewSession
from django.db.models import Max
from django.conf import settings
from django.db import transaction


MAX_CONCURRENT_INTERVIEWS = settings.MAX_CONCONCURRENT_INTERVIEWS

def get_active_interview_sessions() -> QuerySet[InterviewSessionQueue]:
    """
    Returns a queryset of active interview sessions that are in progress.
    An active interview session is one that has a status of 'IN_PROGRESS'.
    This is used to determine if a new interview can be scheduled based on the maximum allowed concurrent
    """
    return InterviewSessionQueue.objects.filter(
        status__in=[
            InterviewSessionQueue.Status.IN_PROGRESS,
        ]
    )
def can_start_new_interview() -> bool:
    """
    returns True if the number of active interview sessions is less than the maximum allowed concurrent interviews.
    """
    active_sessions = get_active_interview_sessions()
    return active_sessions.count() < MAX_CONCURRENT_INTERVIEWS


def queue_or_start_session(session: PreScreeningInterviewSession) -> InterviewSessionQueue:
    """
    Queues starts a new interview session based on the current active sessions.
    If the number of active sessions is less than the maximum allowed, it starts the session immediately.
    Otherwise, it queues the session for later processing.
    """
    if can_start_new_interview():
        queue_entry=InterviewSessionQueue.objects.create(
            session=session,
            status=InterviewSessionQueue.Status.IN_PROGRESS,
            position=0
        )
    else:
        max_position = InterviewSessionQueue.objects.aggregate(Max('position'))['position__max'] or 0
        queue_entry= InterviewSessionQueue.objects.create(
            session=session,
            status=InterviewSessionQueue.Status.QUEUED,
            position=max_position + 1
        )
    return queue_entry

def complete_session(queue_entry: InterviewSessionQueue) -> None:
    """
    Marks the interview session as completed and removes it from the queue.
    """
    queue_entry.status= InterviewSessionQueue.Status.COMPLETED
    queue_entry.save()
    
@transaction.atomic    
def activate_next_queued_session() -> None:
    """
    Activates the next queued interview session if there are any.
    This is  called after a session is completed to ensure that the next session in the queue is started.
    """
    if not can_start_new_interview():
        return None
    
    next_queued_session = InterviewSessionQueue.objects.filter(
        status=InterviewSessionQueue.Status.QUEUED
    ).order_by('position').first()
    
    if next_queued_session:
        next_queued_session.status = InterviewSessionQueue.Status.IN_PROGRESS
        next_queued_session.save()
        
        reindex_queue_positions()
        return next_queued_session
    
    return None

def reindex_queue_positions() -> None:
    queued = InterviewSessionQueue.objects.filter(
        status=InterviewSessionQueue.Status.QUEUED
    ).order_by('position')
    for index, entry in enumerate(queued, start=1):
        if entry.position != index:
            entry.position = index
            entry.save(update_fields=["position"])

    