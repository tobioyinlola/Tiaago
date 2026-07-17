import { format } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getPipelineSummary } from "@/app/common/services/pipeline";
import { handleServerApiCallError } from "@/app/common/utils";
import StatCard from "@/app/common/components/dashboard/StatCard";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardLineChart from "@/app/common/components/dashboard/charts/DashboardLineChart";
import DashboardDonutChart from "@/app/common/components/dashboard/charts/DashboardDonutChart";

export const metadata = {
  title: "Pipeline and Talent Pool",
};

const PipelinePage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const pipeline = await getPipelineSummary().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get pipeline summary error (admin pipeline): ", error);
    errors.push({ title: "Error getting pipeline data", message: error });
    return null;
  });

  if (!pipeline) {
    return <DisplayErrorMessages errors={errors} />;
  }

  const growthLabels = pipeline.pipeline_growth_90d.map(d =>
    new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );

  type ZeroPipelineOrg = (typeof pipeline.orgs_with_zero_pipeline_entries)[number];
  const zeroPipelineColumns: DataTableColumn<ZeroPipelineOrg>[] = [
    { key: "company_name", header: "Organisation", render: r => r.company_name, className: "text-left" },
    { key: "date_joined", header: "Joined", render: r => format(new Date(r.date_joined), "MMM dd, yyyy") },
    { key: "active_jobs", header: "Active jobs", render: r => r.active_jobs },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Pipeline and Talent Pool</h1>
        <h4 className='text-foreground text-sm md:text-base'>
          Health of the free talent pipeline feature — the platform's primary retention mechanism.
        </h4>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
        <StatCard label='Total pipeline candidates' value={pipeline.total_pipeline_candidates} />
        <StatCard label='Outreach messages this month' value={pipeline.outreach_messages_this_month} />
        <StatCard label='Avg pipeline size per active org' value={pipeline.avg_pipeline_size_per_active_org} />
        <StatCard
          label='Orgs with zero pipeline entries'
          value={pipeline.orgs_with_zero_pipeline_entries.length}
          alert={pipeline.orgs_with_zero_pipeline_entries.length > 0}
        />
      </div>

      <ChartContainer>
        <section className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8'>
          <div className='lg:col-span-2 rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>Pipeline growth (last 90 days)</h4>
            <DashboardLineChart labels={growthLabels} data={pipeline.pipeline_growth_90d.map(d => d.count)} />
          </div>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>How candidates were added</h4>
            <DashboardDonutChart
              labels={["Via invite link", "Added directly by team"]}
              data={[pipeline.source_split.added_via_invite_link, pipeline.source_split.added_directly_by_team]}
            />
          </div>
        </section>
      </ChartContainer>

      <h3 className='text-gray-900 text-lg font-medium mb-4'>
        Organisations with zero pipeline entries
      </h3>
      <p className='text-sm text-muted-foreground mb-4'>
        These organisations aren't using the retention feature and are at higher churn risk.
      </p>
      <DataTable
        columns={zeroPipelineColumns}
        data={pipeline.orgs_with_zero_pipeline_entries}
        rowKey={r => r.id}
        emptyText='Every organisation has at least one pipeline entry'
      />
    </>
  );
};

export default PipelinePage;
