"""Audience segment evaluation -- turns a segment's `conditions` JSON array
into a Company queryset. Never does a full fetch for size estimation; callers
should call `.count()` on the returned queryset (see SegmentPreviewView),
never `len(list(...))`.
"""

from django.db.models import Q

from create_user.models import Company
from tags.models import OrganisationTag

# Company fields exposed to the segment builder's "property" condition type.
# wallet_balance crosses the OneToOne join to subscriptions.Wallet.
PROPERTY_FIELD_MAP = {
    "country": "country",
    "size": "size",
    "industry": "industry",
    "account_type": "account_type",
    "heard_from": "heard_from",
    "utm_source": "utm_source",
    "wallet_balance": "wallet__balance",
}

_POSITIVE_LOOKUPS = {"eq": "exact", "gt": "gt", "gte": "gte", "lt": "lt", "lte": "lte", "contains": "icontains"}
_NEGATIVE_LOOKUPS = {"neq": "exact", "not_contains": "icontains"}


def _condition_to_q(condition):
    ctype = condition.get("type")

    if ctype == "has_tag":
        slug = condition.get("tag_slug")
        return Q(
            id__in=OrganisationTag.objects.filter(tag__slug=slug, removed_at__isnull=True).values("organisation_id")
        )
    if ctype == "does_not_have_tag":
        slug = condition.get("tag_slug")
        return ~Q(
            id__in=OrganisationTag.objects.filter(tag__slug=slug, removed_at__isnull=True).values("organisation_id")
        )
    if ctype == "property":
        field = PROPERTY_FIELD_MAP.get(condition.get("field"))
        operator = condition.get("operator")
        value = condition.get("value")
        if not field:
            return Q(pk__in=[])  # unknown field -- fail safe to "matches nothing"
        if operator in _NEGATIVE_LOOKUPS:
            return ~Q(**{f"{field}__{_NEGATIVE_LOOKUPS[operator]}": value})
        lookup_suffix = _POSITIVE_LOOKUPS.get(operator, "exact")
        return Q(**{f"{field}__{lookup_suffix}": value})

    return Q(pk__in=[])


def evaluate_segment(conditions, match_type="ALL"):
    if not conditions:
        return Company.objects.none()

    if match_type == "ANY":
        combined = Q()
        for condition in conditions:
            combined |= _condition_to_q(condition)
        return Company.objects.filter(combined).distinct()

    qs = Company.objects.all()
    for condition in conditions:
        qs = qs.filter(_condition_to_q(condition))
    return qs.distinct()
