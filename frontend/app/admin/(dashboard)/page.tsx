import { Metadata } from "next";

import { getCurrentUser } from "@/app/common/services/profile";
import { getAdminMetrics } from "@/app/common/services/metrics";
import { getOverviewMetrics } from "@/app/common/services/overview";
import { cn, getMetricPercentageChange } from "../../common/utils";
import MetricItem from "@/app/common/components/dashboard/MetricItem";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import MorningDigest from "@/app/common/components/dashboard/MorningDigest";
import StatCard from "@/app/common/components/dashboard/StatCard";
import DashboardLineChart from "@/app/common/components/dashboard/charts/DashboardLineChart";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

const AdminDashboard = async () => {
  const [{ currentUser }, dashboardMetrics, overview] = await Promise.all([
    getCurrentUser("staff"),
    getAdminMetrics(),
    getOverviewMetrics(),
  ]);

  const dayLabels = overview.daily_revenue_30d.map(d =>
    new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );

  return (
    <>
      <h1 className='text-2xl font-space-grotesk border-b border-gray-200 pb-1'>
        Welcome,{" "}
        <span className='font-bold'>
          {currentUser.first_name || currentUser.last_name || currentUser.email}
          !👋🏻
        </span>
      </h1>

      <div className='mt-8'>
        <MorningDigest
          activeOrganisationsToday={overview.morning_digest.active_organisations_today}
          resumesScreenedLast24h={overview.morning_digest.resumes_screened_last_24h}
          walletTopupsLast24hNgn={overview.morning_digest.wallet_topups_last_24h_ngn}
        />
      </div>

      <section className='mt-4'>
        <h3 className='text-gray-900 text-lg font-medium mb-4'>Platform Overview</h3>
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          <StatCard label='Total organisations' value={overview.organisations.total} />
          <StatCard label='Active organisations (30d)' value={overview.organisations.active_30d} />
          <StatCard
            label='New signups this week'
            value={overview.organisations.new_this_week}
            subText={`vs ${overview.organisations.new_last_week} last week`}
          />
          <StatCard label='Churned organisations' value={overview.organisations.churned} />

          <StatCard
            label='Resumes screened'
            value={overview.resumes_screened.month}
            subText={`Today ${overview.resumes_screened.today} · This week ${overview.resumes_screened.week}`}
          />
          <StatCard
            label='Assessments taken'
            value={overview.assessments_taken.month}
            subText={`Today ${overview.assessments_taken.today} · This week ${overview.assessments_taken.week}`}
          />
          <StatCard
            label='Revenue this month'
            value={`₦${overview.revenue.this_month_ngn.toLocaleString()}`}
            subText={
              overview.revenue.mom_growth_pct !== null
                ? `${overview.revenue.mom_growth_pct > 0 ? "+" : ""}${overview.revenue.mom_growth_pct}% MoM`
                : undefined
            }
          />
          <StatCard label='Active jobs' value={overview.active_jobs} />
          <StatCard label='Total candidates in system' value={overview.total_candidates} />
        </div>
      </section>

      <ChartContainer>
        <section className='mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>
              Daily revenue (last 30 days)
            </h4>
            <DashboardLineChart
              labels={dayLabels}
              data={overview.daily_revenue_30d.map(d => d.amount)}
            />
          </div>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>
              Daily active organisations (last 30 days)
            </h4>
            <DashboardBarChart
              labels={dayLabels}
              data={overview.daily_active_organisations_30d.map(d => d.count)}
            />
          </div>
        </section>

        {Object.entries(dashboardMetrics).map(([title, metrics]) => (
          <div className='mt-8' key={title}>
            <h3 className='text-gray-900 text-lg font-medium'>{title}</h3>
            <div
              className={cn(
                "my-8 gap-6 grid grid-cols-1",
                metrics.length > 1 && "sm:grid-cols-2",
                metrics.length > 2 && "lg:grid-cols-3"
              )}
            >
              {metrics.map(metric => (
                <MetricItem
                  key={metric.title}
                  title={metric.title}
                  currentVal={metric.current_value}
                  data={[metric.value_last_month, metric.value_this_month]}
                  percentChange={getMetricPercentageChange(
                    metric.value_this_month,
                    metric.value_last_month
                  )}
                  valueLastMonth={metric.value_last_month}
                />
              ))}
            </div>
          </div>
        ))}
      </ChartContainer>
    </>
  );
};

export default AdminDashboard;
