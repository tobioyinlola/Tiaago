import { format } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getSystemHealthSummary } from "@/app/common/services/system-health";
import { handleServerApiCallError } from "@/app/common/utils";
import StatCard from "@/app/common/components/dashboard/StatCard";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import { FailedJobEvent } from "@/app/common/types/analytics.type";

export const metadata = {
  title: "System Health",
};

const failedJobColumns: DataTableColumn<FailedJobEvent>[] = [
  { key: "company_name", header: "Organisation", render: r => r.company_name ?? "—", className: "text-left" },
  { key: "job_application_id", header: "Application", render: r => (r.job_application_id ? `#${r.job_application_id}` : "—") },
  { key: "error", header: "Error", render: r => <span className='text-destructive'>{r.error ?? "Unknown error"}</span>, className: "text-left" },
  { key: "date", header: "Date", render: r => format(new Date(r.date), "MMM dd, hh:mm a") },
];

const SystemHealthPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const data = await getSystemHealthSummary().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get system health error (admin system): ", error);
    errors.push({ title: "Error getting system health data", message: error });
    return null;
  });

  if (!data) {
    return <DisplayErrorMessages errors={errors} />;
  }

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>System Health</h1>
        <h4 className='text-foreground text-sm md:text-base'>
          Internal ops — not visible to agencies.
        </h4>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
        <StatCard
          label='OpenAI calls today'
          value={data.openai_call_volume.today}
          subText={`This week ${data.openai_call_volume.week} · This month ${data.openai_call_volume.month}`}
        />
        <StatCard
          label='API error rate'
          value={data.api_error_rate_pct !== null ? `${data.api_error_rate_pct}%` : null}
          alert={!!data.api_error_rate_pct && data.api_error_rate_pct > 5}
        />
        <StatCard
          label='Email delivery rate (24h)'
          value={data.email_delivery_rate_pct.available ? `${data.email_delivery_rate_pct.value}%` : null}
        />
        <StatCard label='Platform uptime (30d)' value={data.platform_uptime_30d_pct.available ? "—" : null} unavailableText='No monitoring integration' />

        <StatCard
          label='Avg response time — resume screening'
          value={data.avg_response_time_ms.available ? `${data.avg_response_time_ms.resume_screening}ms` : null}
          unavailableText='Needs latency instrumentation'
        />
        <StatCard
          label='Avg response time — assessment generation'
          value={data.avg_response_time_ms.available ? `${data.avg_response_time_ms.assessment_generation}ms` : null}
          unavailableText='Needs latency instrumentation'
        />
        <StatCard
          label='Infra cost this month'
          value={data.infra_cost.available ? `₦${data.infra_cost.ngn} / $${data.infra_cost.usd}` : null}
          unavailableText='No billing integration'
        />
        <StatCard
          label='Gross margin this month'
          value={data.gross_margin_this_month.available ? "—" : null}
          unavailableText='Depends on infra cost data'
        />
      </div>

      <section className='mb-8'>
        <h3 className='text-gray-900 text-lg font-medium mb-4'>Failed screening jobs (last 24h)</h3>
        <DataTable
          columns={failedJobColumns}
          data={data.failed_screening_jobs_24h}
          rowKey={(r, i) => `${r.job_application_id}-${r.date}-${i}`}
          emptyText='No failed screening jobs in the last 24 hours'
        />
      </section>

      <section>
        <h3 className='text-gray-900 text-lg font-medium mb-4'>Failed assessment jobs (last 24h)</h3>
        <DataTable
          columns={failedJobColumns}
          data={data.failed_assessment_jobs_24h}
          rowKey={(r, i) => `${r.job_application_id}-${r.date}-${i}`}
          emptyText='No failed assessment jobs in the last 24 hours'
        />
      </section>
    </>
  );
};

export default SystemHealthPage;
