"""Resolves a campaign audience into a concrete recipient list -- one bulk
query per audience type, never a per-organisation/per-member loop. The
COMPANY-pool helpers take plain params (not a saved EmailCampaign row) so
the exact same resolution logic backs both the audience-preview endpoint
(before the campaign may even be saved) and the actual send task -- "what
you previewed" and "who gets emailed" are guaranteed to match.
"""

from create_user.models import Company
from tags.models import OrganisationTag


def companies_for_audience(audience_type, audience_segment=None, audience_tag_id=None, manual_organisation_ids=None):
    from segments.evaluation import evaluate_segment

    if audience_type == "ALL":
        return Company.objects.all()
    if audience_type == "SEGMENT" and audience_segment is not None:
        return evaluate_segment(audience_segment.conditions, audience_segment.match_type)
    if audience_type == "TAG" and audience_tag_id:
        return Company.objects.filter(
            id__in=OrganisationTag.objects.filter(
                tag_id=audience_tag_id, removed_at__isnull=True
            ).values("organisation_id")
        )
    if audience_type == "MANUAL":
        return Company.objects.filter(id__in=manual_organisation_ids or [])
    return Company.objects.none()


def resolve_recipients(companies_qs):
    """Returns (recipients, excluded_unsubscribed_count). Each recipient is
    {"company_id", "company_name", "email", "name"}."""
    from campaigns.models import EmailUnsubscribe

    companies = companies_qs.select_related("company_rep")
    unsubscribed_emails = set(EmailUnsubscribe.objects.values_list("email", flat=True))

    recipients = []
    excluded = 0
    for company in companies:
        rep = company.company_rep
        email = company.company_email or (rep.email if rep else None)
        if not email:
            continue
        if email in unsubscribed_emails:
            excluded += 1
            continue
        name = (rep.first_name if rep and rep.first_name else None) or company.company_name
        recipients.append({
            "company_id": company.id, "company_name": company.company_name, "email": email, "name": name,
        })
    return recipients, excluded


def talent_network_members_for_audience(tn_role_categories=None, tn_industries=None, tn_years_experience=None, tn_work_type=None):
    from talent_network.choices import TalentNetworkMemberStatus
    from talent_network.models import TalentNetworkMember

    qs = TalentNetworkMember.objects.filter(status=TalentNetworkMemberStatus.ACTIVE, consent=True)
    if tn_role_categories:
        qs = qs.filter(interested_roles__overlap=tn_role_categories)
    if tn_industries:
        qs = qs.filter(industry__overlap=tn_industries)
    if tn_years_experience:
        qs = qs.filter(years_experience__in=tn_years_experience)
    if tn_work_type:
        qs = qs.filter(preferred_work_type=tn_work_type)
    return qs


def resolve_talent_network_recipients(tn_role_categories=None, tn_industries=None, tn_years_experience=None, tn_work_type=None):
    """Returns (recipients, excluded_unsubscribed_count). Each recipient is
    {"email", "name"} -- mirrors resolve_recipients' shape minus company_id,
    which doesn't apply to this pool. Excludes campaign-level unsubscribes
    (EmailUnsubscribe); TalentNetworkMember.status=UNSUBSCRIBED members are
    already filtered out by the base queryset above."""
    from campaigns.models import EmailUnsubscribe

    members = talent_network_members_for_audience(tn_role_categories, tn_industries, tn_years_experience, tn_work_type)
    unsubscribed_emails = set(EmailUnsubscribe.objects.values_list("email", flat=True))

    recipients = []
    excluded = 0
    for member in members:
        if member.email in unsubscribed_emails:
            excluded += 1
            continue
        recipients.append({"email": member.email, "name": member.first_name or member.full_name})
    return recipients, excluded


def resolve_campaign_audience(campaign):
    if campaign.audience_pool == "TALENT_NETWORK":
        return resolve_talent_network_recipients(
            campaign.tn_role_categories, campaign.tn_industries, campaign.tn_years_experience, campaign.tn_work_type,
        )
    companies = companies_for_audience(
        campaign.audience_type, campaign.audience_segment, campaign.audience_tag_id,
        campaign.manual_organisation_ids,
    )
    return resolve_recipients(companies)
