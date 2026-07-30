import { format } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCurrentUser } from "@/app/common/services/profile";
import { getInterviewAnalyticsSummary } from "@/app/common/services/interview-analytics";
import { handleServerApiCallError } from "@/app/common/utils";
import StatCard from "@/app/common/components/dashboard/StatCard";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardDonutChart from "@/app/common/components/dashboard/charts/DashboardDonutChart";

export const metadata = {
  title: "Interview Intelligence",
};

const InterviewAnalyticsPage = async () => {
  await getCurrentUser("staff");

  const errors: DisplayErrorMessagesProps["errors"] = [];
  const summary = await getInterviewAnalyticsSummary().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get interview analytics error (admin interviews): ", error);
    errors.push({ title: "Error getting interview analytics", message: error });
    return null;
  });

  if (!summary) {
    return <DisplayErrorMessages errors={errors} />;
  }

  const statusLabels = summary.status_breakdown.map(s => s.status);
  const statusData = summary.status_breakdown.map(s => s.count);
  const recommendationLabels = summary.recommendation_breakdown.map(r => r.recommendation);
  const recommendationData = summary.recommendation_breakdown.map(r => r.count);

  const orgColumns: DataTableColumn<(typeof summary.top_organisations)[number]>[] = [
    { key: "company_name", header: "Organisation", render: r => r.company_name, className: "text-left" },
    { key: "count", header: "Interviews", render: r => r.interview_count },
  ];

  const recentColumns: DataTableColumn<(typeof summary.recent_interviews)[number]>[] = [
    { key: "candidate_name", header: "Candidate", render: r => r.candidate_name, className: "text-left" },
    { key: "company_name", header: "Organisation", render: r => r.company_name, className: "text-left" },
    { key: "status", header: "Status", render: r => r.status },
    {
      key: "date",
      header: "Date",
      render: r => (r.meeting_date ? format(new Date(r.meeting_date), "MMM dd, yyyy") : "--"),
    },
    {
      key: "link",
      header: "",
      render: r => (
        <a href={`/recruiter/dashboard/interviews/${r.id}/review`} className='text-primary text-xs font-medium'>
          View
        </a>
      ),
    },
  ];

  return (
    <ChartContainer>
      <div className='flex flex-col gap-6 p-6'>
        <div>
          <h1 className='text-2xl font-space-grotesk font-semibold'>Interview Intelligence</h1>
          <p className='text-sm text-muted-foreground'>AI Interview Copilot usage across the platform.</p>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <StatCard label='Total interviews' value={summary.total_interviews} />
          <StatCard label='Completed' value={summary.completed_interviews} />
          <StatCard
            label='AI copilot use rate'
            value={summary.ai_copilot.use_rate_pct !== null ? `${summary.ai_copilot.use_rate_pct}%` : null}
            subText={`${summary.ai_copilot.calls_this_month} calls this month`}
          />
          <StatCard
            label='Revenue this month'
            value={`₦${summary.revenue_this_month_ngn.total.toLocaleString()}`}
            subText={`Packages ₦${summary.revenue_this_month_ngn.interview_packages.toLocaleString()} · Recording ₦${summary.revenue_this_month_ngn.recording_addons.toLocaleString()}`}
          />
        </div>

        <div className='grid gap-6 lg:grid-cols-2'>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <p className='text-sm font-medium mb-3'>Status breakdown</p>
            {statusLabels.length ? (
              <DashboardDonutChart labels={statusLabels} data={statusData} />
            ) : (
              <p className='text-sm text-muted-foreground py-10 text-center'>No interviews yet.</p>
            )}
          </div>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <p className='text-sm font-medium mb-3'>Recommendation breakdown</p>
            {recommendationLabels.length ? (
              <DashboardDonutChart labels={recommendationLabels} data={recommendationData} />
            ) : (
              <p className='text-sm text-muted-foreground py-10 text-center'>No decisions submitted yet.</p>
            )}
          </div>
        </div>

        <div className='rounded-lg border bg-card p-6 shadow-sm'>
          <p className='text-sm font-medium mb-3'>Top organisations by interview volume</p>
          <DataTable columns={orgColumns} data={summary.top_organisations} rowKey={(r, i) => `${r.company_name}-${i}`} />
        </div>

        <div className='rounded-lg border bg-card p-6 shadow-sm'>
          <p className='text-sm font-medium mb-3'>Recent interviews</p>
          <DataTable columns={recentColumns} data={summary.recent_interviews} rowKey={r => r.id} />
        </div>

        {!summary.openai_cost_this_month.available && (
          <p className='text-xs text-muted-foreground'>
            Per-call OpenAI cost isn&apos;t tracked yet -- the AI service doesn&apos;t report token usage back to
            Django for any feature, not just interviews (see System Health&apos;s &quot;infra cost&quot; for the
            same limitation).
          </p>
        )}
      </div>
    </ChartContainer>
  );
};

export default InterviewAnalyticsPage;
