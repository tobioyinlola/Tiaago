import Link from "next/link";
import { ArrowRight } from "lucide-react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getAssessmentIntelligenceSummary } from "@/app/common/services/assessment-analytics";
import { handleServerApiCallError } from "@/app/common/utils";
import StatCard from "@/app/common/components/dashboard/StatCard";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";
import { JobAssessmentStat } from "@/app/common/types/analytics.type";

export const metadata = {
  title: "Assessment Intelligence",
};

const COMPLETION_TIME_LABELS: Record<string, string> = {
  under_15min: "Under 15 min",
  "15_to_30min": "15–30 min",
  "30_to_60min": "30–60 min",
  over_60min: "Over 60 min",
};

const AssessmentIntelligencePage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const data = await getAssessmentIntelligenceSummary().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get assessment intelligence error (admin assessments): ", error);
    errors.push({ title: "Error getting assessment intelligence data", message: error });
    return null;
  });

  if (!data) {
    return <DisplayErrorMessages errors={errors} />;
  }

  const jobColumns: DataTableColumn<JobAssessmentStat>[] = [
    { key: "job_title", header: "Job", render: r => r.job_title, className: "text-left" },
    { key: "failure_rate_pct", header: "Failure rate", render: r => `${r.failure_rate_pct}%` },
    { key: "avg_score", header: "Avg score", render: r => (r.avg_score !== null ? `${r.avg_score}%` : "—") },
    { key: "total_submissions", header: "Submissions", render: r => r.total_submissions },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Assessment Intelligence</h1>
          <h4 className='text-foreground text-sm md:text-base'>
            Quality and integrity signals for the AI assessment layer.
          </h4>
        </div>
        <Link
          href='/admin/assessments/feedback'
          className='flex items-center gap-1 text-sm text-primary font-medium hover:underline mb-1'
        >
          Candidate feedback
          <ArrowRight className='w-3.5 h-3.5' />
        </Link>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
        <StatCard label='Assessments created this month' value={data.assessments_created_this_month} />
        <StatCard label='Assessments completed this month' value={data.assessments_completed_this_month} />
        <StatCard
          label='Platform avg score'
          value={data.platform_avg_score !== null ? `${data.platform_avg_score}%` : null}
        />
        <StatCard
          label='Flag rate'
          value={data.flag_rate_pct.available ? "—" : null}
          unavailableText='No proctoring system yet'
        />
      </div>

      <section className='mb-8 rounded-lg border bg-card p-6 shadow-sm'>
        <h4 className='text-gray-900 text-base font-medium mb-2'>Proctoring / flag events</h4>
        <p className='text-sm text-muted-foreground'>
          {data.flag_events.available ? "" : data.flag_events.reason}
        </p>
      </section>

      <ChartContainer>
        <section className='rounded-lg border bg-card p-6 shadow-sm mb-8'>
          <h4 className='text-gray-900 text-base font-medium mb-4'>Assessment completion time distribution</h4>
          {data.completion_time_distribution.available ? (
            <DashboardBarChart
              labels={Object.keys(data.completion_time_distribution.buckets).map(k => COMPLETION_TIME_LABELS[k] ?? k)}
              data={Object.values(data.completion_time_distribution.buckets)}
            />
          ) : (
            <p className='text-sm text-muted-foreground py-8 text-center'>
              Not enough data yet — completion timing is only captured for assessments started after this feature shipped.
            </p>
          )}
        </section>
      </ChartContainer>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <section>
          <h3 className='text-gray-900 text-lg font-medium mb-4'>Top 10 jobs by failure rate</h3>
          <DataTable
            columns={jobColumns}
            data={data.top_10_jobs_by_failure_rate}
            rowKey={r => r.job_id}
            emptyText='No completed assessments yet'
          />
        </section>
        <section>
          <h3 className='text-gray-900 text-lg font-medium mb-4'>Top 10 jobs by avg score</h3>
          <DataTable
            columns={jobColumns}
            data={data.top_10_jobs_by_avg_score}
            rowKey={r => r.job_id}
            emptyText='No completed assessments yet'
          />
        </section>
      </div>
    </>
  );
};

export default AssessmentIntelligencePage;
