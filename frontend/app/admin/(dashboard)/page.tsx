import { Metadata } from "next";

import { getCurrentUser } from "@/app/common/services/profile";
import { getOverviewMetrics, getTrafficSummary } from "@/app/common/services/overview";
import MorningDigest from "@/app/common/components/dashboard/MorningDigest";
import StatCard from "@/app/common/components/dashboard/StatCard";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardLineChart from "@/app/common/components/dashboard/charts/DashboardLineChart";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

const AdminDashboard = async () => {
  const [{ currentUser }, overview, traffic] = await Promise.all([
    getCurrentUser("staff"),
    getOverviewMetrics(),
    getTrafficSummary(),
  ]);

  const dayLabels = overview.daily_revenue_30d.map(d =>
    new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );
  const visitDayLabels = traffic.website_visits.daily.map(d =>
    new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );
  const visitMonthLabels = traffic.website_visits.monthly.map(d =>
    new Date(`${d.month}-01`).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  );
  const signupDayLabels = traffic.daily_signups.daily.map(d =>
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

        <section className='mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>
              Website visits (last 30 days)
            </h4>
            <DashboardLineChart
              labels={visitDayLabels}
              data={traffic.website_visits.daily.map(d => d.count)}
            />
          </div>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>
              Website visits (last 12 months)
            </h4>
            <DashboardBarChart
              labels={visitMonthLabels}
              data={traffic.website_visits.monthly.map(d => d.count)}
            />
          </div>
        </section>

        <section className='mt-6 grid grid-cols-1 gap-6'>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>
              Daily sign-ups (last 30 days)
            </h4>
            <DashboardBarChart
              labels={signupDayLabels}
              data={traffic.daily_signups.daily.map(d => d.count)}
            />
          </div>
        </section>
      </ChartContainer>
    </>
  );
};

export default AdminDashboard;
