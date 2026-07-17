import { notFound } from "next/navigation";

import { getCampaign, getCampaignAnalytics } from "@/app/common/services/campaigns";
import StatCard from "@/app/common/components/dashboard/StatCard";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardLineChart from "@/app/common/components/dashboard/charts/DashboardLineChart";
import CampaignStatusBadge from "../../_components/CampaignStatusBadge";
import RecipientsTable from "./RecipientsTable";

export const metadata = {
  title: "Campaign Analytics",
};

const CampaignAnalyticsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const [campaign, analytics] = await Promise.all([
    getCampaign(id).catch(() => null),
    getCampaignAnalytics(id).catch(() => null),
  ]);
  if (!campaign || !analytics) return notFound();

  const hourLabels = analytics.opens_over_time_48h.map(p => `${p.hour}h`);

  return (
    <>
      <div className="border-b w-full border-border pb-1 mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1 font-space-grotesk">{campaign.name}</h1>
          <h4 className="text-foreground text-sm md:text-base">{campaign.subject_line}</h4>
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

      <h3 className="text-gray-900 text-lg font-medium mb-4">Link performance</h3>
      <div className="rounded-lg border divide-y mb-8">
        {analytics.link_performance.length ? (
          analytics.link_performance.map((link, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-sm gap-4">
              <span className="truncate text-primary">{link.link_url}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {link.total_clicks} clicks &middot; {link.unique_clicks} unique &middot; {link.pct_of_recipients}% of recipients
              </span>
            </div>
          ))
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No link clicks recorded yet.</p>
        )}
      </div>

      <h3 className="text-gray-900 text-lg font-medium mb-4">Recipients</h3>
      <RecipientsTable recipients={analytics.recipients} />
    </>
  );
};

export default CampaignAnalyticsPage;
