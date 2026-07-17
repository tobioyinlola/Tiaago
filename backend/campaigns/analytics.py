from datetime import timedelta

from django.db.models import Count

from campaigns.models import CampaignLinkClick, CampaignSend


def get_campaign_analytics(campaign):
    sends = CampaignSend.objects.filter(campaign=campaign)
    total_recipients = sends.count()
    bounced = sends.filter(status=CampaignSend.Status.BOUNCED).count()
    sent_or_beyond = sends.exclude(
        status__in=[CampaignSend.Status.QUEUED, CampaignSend.Status.FAILED]
    ).count()
    delivered = max(sent_or_beyond - bounced, 0)
    opened = sends.filter(opened_at__isnull=False).count()
    clicked = sends.filter(clicked_at__isnull=False).count()
    unsubscribed = sends.filter(status=CampaignSend.Status.UNSUBSCRIBED).count()

    open_rate = round((opened / delivered) * 100, 1) if delivered else 0
    click_rate = round((clicked / delivered) * 100, 1) if delivered else 0

    first_sent = (
        sends.filter(sent_at__isnull=False).order_by("sent_at").values_list("sent_at", flat=True).first()
    )
    opens_over_time, clicks_over_time = [], []
    if first_sent:
        opens_list = sorted(sends.filter(opened_at__isnull=False).values_list("opened_at", flat=True))
        clicks_list = sorted(sends.filter(clicked_at__isnull=False).values_list("clicked_at", flat=True))
        for hour in range(49):
            cutoff = first_sent + timedelta(hours=hour)
            opens_over_time.append({"hour": hour, "cumulative_opens": sum(1 for d in opens_list if d <= cutoff)})
            clicks_over_time.append({"hour": hour, "cumulative_clicks": sum(1 for d in clicks_list if d <= cutoff)})

    link_rows = (
        CampaignLinkClick.objects.filter(campaign_send__campaign=campaign)
        .values("link_url")
        .annotate(total_clicks=Count("id"), unique_clicks=Count("campaign_send_id", distinct=True))
        .order_by("-total_clicks")
    )
    link_performance = [
        {
            "link_url": r["link_url"],
            "total_clicks": r["total_clicks"],
            "unique_clicks": r["unique_clicks"],
            "pct_of_recipients": round((r["unique_clicks"] / total_recipients) * 100, 1) if total_recipients else 0,
        }
        for r in link_rows
    ]

    recipients = list(
        sends.select_related("organisation")
        .order_by("-sent_at")
        .values("id", "recipient_name", "organisation__company_name", "recipient_email", "status", "opened_at", "clicked_at")
    )

    return {
        "summary": {
            "total_recipients": total_recipients,
            "delivered": delivered,
            "open_rate_pct": open_rate,
            "click_rate_pct": click_rate,
            "unsubscribes": unsubscribed,
            "bounces": bounced,
        },
        "opens_over_time_48h": opens_over_time,
        "clicks_over_time_48h": clicks_over_time,
        "link_performance": link_performance,
        "recipients": [
            {
                "id": str(r["id"]),
                "name": r["recipient_name"],
                "organisation": r["organisation__company_name"],
                "email": r["recipient_email"],
                "status": r["status"],
                "opened_at": r["opened_at"].isoformat() if r["opened_at"] else None,
                "clicked_at": r["clicked_at"].isoformat() if r["clicked_at"] else None,
            }
            for r in recipients
        ],
    }
