import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import StatCard from "@/app/common/components/dashboard/StatCard";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";
import { getTalentNetworkAnalytics, getTalentNetworkOverview } from "@/app/common/services/talent-network-admin";

export const metadata = {
  title: "Talent Network Analytics",
};

const TalentNetworkAnalyticsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const analyticsRes = await getTalentNetworkAnalytics();
  if (!analyticsRes.success) errors.push({ title: "Error loading analytics", message: analyticsRes.error });
  const analytics = analyticsRes.success ? analyticsRes.data : null;

  const overviewRes = await getTalentNetworkOverview();
  const overview = overviewRes.success ? overviewRes.data : null;

  const growthLabels = analytics?.members_growth.map(g => new Date(g.month).toLocaleDateString(undefined, { month: "short", year: "2-digit" })) || [];
  const growthData = analytics?.members_growth.map(g => g.count) || [];

  return (
    <div>
      <div className="border-b w-full border-gray-200 pb-1 mb-8">
        <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Talent Network Analytics</h1>
        <h4 className="text-gray-900 text-sm md:text-base">
          Funnel performance and engagement across the whole Talent Network.
        </h4>
      </div>

      <DisplayErrorMessages errors={errors} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Open Rate"
          value={analytics?.open_rate !== null && analytics?.open_rate !== undefined ? `${analytics.open_rate}%` : null}
          unavailableText="No sends yet"
        />
        <StatCard
          label="Click Rate"
          value={analytics?.click_rate !== null && analytics?.click_rate !== undefined ? `${analytics.click_rate}%` : null}
          unavailableText="No sends yet"
        />
        <StatCard
          label="Application Rate"
          value={
            analytics?.application_rate !== null && analytics?.application_rate !== undefined
              ? `${analytics.application_rate}%`
              : null
          }
          unavailableText="No sends yet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="border border-[#EAECF0] rounded-lg p-5 bg-white">
          <h3 className="text-sm font-semibold text-primaryBlack mb-4">Members Growth</h3>
          {growthLabels.length ? (
            <ChartContainer>
              <DashboardBarChart labels={growthLabels} data={growthData} label="New members" />
            </ChartContainer>
          ) : (
            <p className="text-sm text-secondary-black py-10 text-center">Not enough data yet.</p>
          )}
        </div>

        <div className="border border-[#EAECF0] rounded-lg p-5 bg-white">
          <h3 className="text-sm font-semibold text-primaryBlack mb-4">Top Roles</h3>
          {overview?.top_roles?.length ? (
            <ChartContainer>
              <DashboardBarChart
                labels={overview.top_roles.map(r => r.role.replaceAll("_", " "))}
                data={overview.top_roles.map(r => r.count)}
                horizontal
              />
            </ChartContainer>
          ) : (
            <p className="text-sm text-secondary-black py-10 text-center">Not enough data yet.</p>
          )}
        </div>

        <div className="border border-[#EAECF0] rounded-lg p-5 bg-white">
          <h3 className="text-sm font-semibold text-primaryBlack mb-4">Top Communities</h3>
          {overview?.top_communities?.length ? (
            <ChartContainer>
              <DashboardBarChart
                labels={overview.top_communities.map(c => c.community.replaceAll("_", " "))}
                data={overview.top_communities.map(c => c.count)}
                horizontal
                fill="#12B76A"
              />
            </ChartContainer>
          ) : (
            <p className="text-sm text-secondary-black py-10 text-center">Not enough data yet.</p>
          )}
        </div>

        <div className="border border-[#EAECF0] rounded-lg p-5 bg-white">
          <h3 className="text-sm font-semibold text-primaryBlack mb-4">Top Performing Jobs</h3>
          {analytics?.top_performing_jobs?.length ? (
            <div className="space-y-2">
              {analytics.top_performing_jobs.map(j => (
                <div key={j.job_id} className="flex items-center justify-between text-sm border-b border-[#F1F2F4] pb-2">
                  <span className="text-primaryBlack truncate">{j.job__role}</span>
                  <span className="text-secondary-black text-xs shrink-0 ml-2">
                    {j.match_count} matched &middot; {j.applied} applied
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary-black py-10 text-center">Not enough data yet.</p>
          )}
        </div>
      </div>

      <div className="border border-[#EAECF0] rounded-lg p-5 bg-white">
        <h3 className="text-sm font-semibold text-primaryBlack mb-4">Top Recruiters</h3>
        {analytics?.top_recruiters?.length ? (
          <div className="space-y-2">
            {analytics.top_recruiters.map(r => (
              <div
                key={r.job__company_id}
                className="flex items-center justify-between text-sm border-b border-[#F1F2F4] pb-2"
              >
                <span className="text-primaryBlack truncate">{r.job__company__company_name || "—"}</span>
                <span className="text-secondary-black text-xs shrink-0 ml-2">
                  {r.match_count} matched &middot; {r.applied} applied
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-secondary-black py-10 text-center">Not enough data yet.</p>
        )}
      </div>
    </div>
  );
};

export default TalentNetworkAnalyticsPage;
