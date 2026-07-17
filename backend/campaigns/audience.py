"""Resolves a campaign audience (segment / tag / manual org list) into a
concrete recipient list -- one bulk query per audience type, never a
per-organisation loop. Takes plain params (not a saved EmailCampaign row) so
the exact same resolution logic backs both the audience-preview endpoint
(step 2 of the wizard, before the campaign may even be saved) and the actual
send task -- "what you previewed" and "who gets emailed" are guaranteed to
match.
"""

from create_user.models import Company
from tags.models import OrganisationTag


def companies_for_audience(audience_type, audience_segment=None, audience_tag_id=None, manual_organisation_ids=None):
    from segments.evaluation import evaluate_segment

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


def resolve_campaign_audience(campaign):
    companies = companies_for_audience(
        campaign.audience_type, campaign.audience_segment, campaign.audience_tag_id,
        campaign.manual_organisation_ids,
    )
    return resolve_recipients(companies)
