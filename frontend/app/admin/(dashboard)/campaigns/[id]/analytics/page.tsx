import { notFound } from "next/navigation";

import { getCampaign, getCampaignAnalytics } from "@/app/common/services/campaigns";
import StatCard from "@/app/common/components/dashboard/StatCard";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardLineChart from "@/app/common/components/dashboard/charts/DashboardLineChart";
import CampaignStatusBadge from "../../_components/CampaignStatusBadge";
import RecipientsTable from "./RecipientsTable";

export const metadata = {
  title: "Campaign Report",
};

const CampaignAnalyticsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const [campaign, analytics] = await Promise.all([
    getCampaign(id).catch(() => null),
    getCampaignAnalytics(id).catch(() => null),
  ]);
  if (!campaign || !analytics) return notFound();

  const hourLabels = analytics.opens_over_time_48h.map(p => `${p.hour}h`);
  const firstStep = [...campaign.emails].sort((a, b) => a.sequence_number - b.sequence_number)[0];

  return (
    <>
      <div className="border-b w-full border-[#E0E0E0] pb-1 mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1 font-space-grotesk" style={{ color: "#1A3C5E" }}>
            {campaign.name}
          </h1>
          <h4 className="text-sm md:text-base" style={{ color: "#9E9E9E" }}>
            {firstStep?.subject || "—"} &middot; {campaign.audience_pool === "TALENT_NETWORK" ? "Talent Network" : "Companies"}
          </h4>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total recipients" value={analytics.summary.total_recipients} />
        <StatCard label="Delivered" value={analytics.summary.delivered} />
        <StatCard label="Open rate" value={`${analytics.summary.open_rate_pct}%`} />
        <StatCard label="Click rate" value={`${analytics.summary.click_rate_pct}%`} />
        <StatCard label="Unsubscribes" value={analytics.summary.unsubscribes} />
        <StatCard label="Bounces" value={analytics.summary.bounces} />
      </div>

      {analytics.by_email.length > 1 && (
        <>
          <h3 className="text-lg font-medium mb-4" style={{ color: "#1A3C5E" }}>
            Sequence breakdown
          </h3>
          <div className="rounded-lg border border-[#E0E0E0] divide-y divide-[#E0E0E0] mb-8">
            {analytics.by_email.map(step => (
              <div key={step.campaign_email_id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm flex-wrap">
                <div className="min-w-0">
                  <span className="rounded-full bg-[#EAF0F6] px-2 py-0.5 text-[10px] font-semibold mr-2" style={{ color: "#1A3C5E" }}>
                    Email {step.sequence_number}
                  </span>
                  <span className="font-medium text-[#444444]">{step.subject || "—"}</span>
                </div>
                <div className="text-xs text-[#9E9E9E] whitespace-nowrap">
                  {step.total_sent} sent &middot; {step.delivered} delivered &middot; {step.open_rate_pct}% opened &middot; {step.click_rate_pct}% clicked
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ChartContainer>
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h4 className="text-gray-900 text-base font-medium mb-4">Cumulative opens (first 48h)</h4>
            <DashboardLineChart labels={hourLabels} data={analytics.opens_over_time_48h.map(p => p.cumulative_opens)} fill="#1D9E75" areaFill="#E6F7F0" />
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h4 className="text-gray-900 text-base font-medium mb-4">Cumulative clicks (first 48h)</h4>
            <DashboardLineChart labels={hourLabels} data={analytics.clicks_over_time_48h.map(p => p.cumulative_clicks)} fill="#1A3C5E" areaFill="#E5EAF0" />
          </div>
        </section>
      </ChartContainer>

      <h3 className="text-lg font-medium mb-4" style={{ color: "#1A3C5E" }}>
        Link performance
      </h3>
      <div className="rounded-lg border border-[#E0E0E0] divide-y divide-[#E0E0E0] mb-8">
        {analytics.link_performance.length ? (
          analytics.link_performance.map((link, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-sm gap-4">
              <span className="truncate" style={{ color: "#1A3C5E" }}>{link.link_url}</span>
              <span className="text-[#9E9E9E] whitespace-nowrap">
                {link.total_clicks} clicks &middot; {link.unique_clicks} unique &middot; {link.pct_of_recipients}% of recipients
              </span>
            </div>
          ))
        ) : (
          <p className="px-4 py-8 text-center text-sm text-[#9E9E9E]">No link clicks recorded yet.</p>
        )}
      </div>

      <h3 className="text-lg font-medium mb-4" style={{ color: "#1A3C5E" }}>
        Recipients
      </h3>
      <RecipientsTable recipients={analytics.recipients} />
    </>
  );
};

export default CampaignAnalyticsPage;
