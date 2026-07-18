from django.conf import settings
from django.db.models import Q

from create_user.models import CustomUser, CompanyTeamMember, Company
from create_user.permissions import get_user_company
from .models import Notification


def notify_user(
    user, title, message, notification_type=Notification.Type.GENERAL,
    link_path=None, link_label=None, sent_by=None,
):
    """Creates a single-recipient in-app notification. `link_path` is
    appended to FRONTEND_URL (link_url is a URLField -- needs an absolute
    URL, matching the pattern used for email links elsewhere)."""
    link_url = f"{settings.FRONTEND_URL.rstrip('/')}/{link_path.lstrip('/')}" if link_path else None
    return Notification.objects.create(
        type=notification_type,
        title=title,
        message=message,
        link_url=link_url,
        link_label=link_label,
        target_scope=Notification.TargetScope.SPECIFIC_USER,
        target_user=user,
        sent_by=sent_by,
    )


def _company_ids_for_notification(notification):
    """Resolves a SEGMENT or TAG notification to the set of qualifying
    company ids -- one query (or one per-condition query for segments, via
    segments.evaluation), never a per-organisation loop."""
    if notification.target_scope == notification.TargetScope.SEGMENT:
        if not notification.segment_id:
            return set()
        from segments.evaluation import evaluate_segment

        return set(
            evaluate_segment(notification.segment.conditions, notification.segment.match_type)
            .values_list("id", flat=True)
        )
    if notification.target_scope == notification.TargetScope.TAG:
        if not notification.tag_id:
            return set()
        from tags.models import OrganisationTag

        return set(
            OrganisationTag.objects.filter(
                tag_id=notification.tag_id, removed_at__isnull=True
            ).values_list("organisation_id", flat=True)
        )
    return set()


def _user_ids_for_companies(company_ids):
    if not company_ids:
        return set()
    ids = set(
        CompanyTeamMember.objects.filter(company_id__in=company_ids).values_list("user_id", flat=True)
    )
    ids |= set(
        Company.objects.filter(id__in=company_ids).values_list("company_rep_id", flat=True)
    )
    return ids


def get_recipient_user_ids(notification):
    """Recipients are computed on the fly rather than stored in a fan-out
    table -- cheap via aggregate queries, and avoids a huge recipient-row
    table for ALL_USERS notifications. Staff are excluded from every scope:
    they send notifications from the admin page and aren't shown the bell
    (see Nav/index.tsx's existing !isStaff gate, kept as-is for this build)."""
    if notification.target_scope == notification.TargetScope.ALL_USERS:
        return set(
            CustomUser.objects.exclude(user_type=CustomUser.USER_TYPE.STAFF).values_list("id", flat=True)
        )

    if notification.target_scope in (notification.TargetScope.SEGMENT, notification.TargetScope.TAG):
        return _user_ids_for_companies(_company_ids_for_notification(notification))

    if notification.target_scope == notification.TargetScope.SPECIFIC_USER:
        return {notification.target_user_id} if notification.target_user_id else set()

    company = notification.target_organisation
    if not company:
        return set()

    ids = set(
        CompanyTeamMember.objects.filter(company=company).values_list("user_id", flat=True)
    )
    ids.add(company.company_rep_id)
    return ids


def notification_visible_to_user(notification, user):
    return user.id in get_recipient_user_ids(notification)


def _qualifying_tag_ids_for_company(company):
    from tags.models import OrganisationTag

    return set(
        OrganisationTag.objects.filter(organisation=company, removed_at__isnull=True).values_list("tag_id", flat=True)
    )


def _qualifying_segment_ids_for_company(company):
    """Bounded by the number of DISTINCT segments any SEGMENT-scoped
    notification references (typically small), not by total segment or
    company count -- evaluates each once against just this one company."""
    from segments.evaluation import evaluate_segment
    from segments.models import AudienceSegment

    referenced_segment_ids = set(
        Notification.objects.filter(target_scope=Notification.TargetScope.SEGMENT, segment__isnull=False)
        .values_list("segment_id", flat=True).distinct()
    )
    if not referenced_segment_ids:
        return set()
    qualifying = set()
    for segment in AudienceSegment.objects.filter(id__in=referenced_segment_ids):
        if evaluate_segment(segment.conditions, segment.match_type).filter(id=company.id).exists():
            qualifying.add(segment.id)
    return qualifying


def get_visible_notifications_queryset(user):
    """The inverse of get_recipient_user_ids -- given a user, which
    notifications can they see. Staff never receive notifications in this
    build (see get_recipient_user_ids)."""
    if user.user_type == CustomUser.USER_TYPE.STAFF:
        return Notification.objects.none()
    q = Q(target_scope=Notification.TargetScope.ALL_USERS) | Q(
        target_scope=Notification.TargetScope.SPECIFIC_USER, target_user=user
    )
    company = get_user_company(user)
    if company:
        q |= Q(target_scope=Notification.TargetScope.ORGANISATION, target_organisation=company)

        tag_ids = _qualifying_tag_ids_for_company(company)
        if tag_ids:
            q |= Q(target_scope=Notification.TargetScope.TAG, tag_id__in=tag_ids)

        segment_ids = _qualifying_segment_ids_for_company(company)
        if segment_ids:
            q |= Q(target_scope=Notification.TargetScope.SEGMENT, segment_id__in=segment_ids)
    return Notification.objects.filter(q)
