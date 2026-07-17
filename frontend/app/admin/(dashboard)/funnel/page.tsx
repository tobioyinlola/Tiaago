import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getFunnelSummary } from "@/app/common/services/funnel";
import { handleServerApiCallError, cn } from "@/app/common/utils";
import StatCard from "@/app/common/components/dashboard/StatCard";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";

export const metadata = {
  title: "Product Funnel",
};

const SCORE_BUCKET_LABELS: Record<string, string> = {
  below_30: "Below 30%",
  "30_to_50": "30–50%",
  "50_to_70": "50–70%",
  "70_to_90": "70–90%",
  above_90: "Above 90%",
};

const FunnelPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const funnel = await getFunnelSummary().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get funnel summary error (admin funnel): ", error);
    errors.push({ title: "Error getting funnel data", message: error });
    return null;
  });

  if (!funnel) {
    return <DisplayErrorMessages errors={errors} />;
  }

  const maxCount = Math.max(...funnel.funnel.map(f => f.count), 1);

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Product Funnel</h1>
        <h4 className='text-foreground text-sm md:text-base'>
          How candidates move through the Tiaago workflow, across all organisations.
        </h4>
      </div>

      <div className='rounded-lg border bg-card p-6 shadow-sm mb-8'>
        <div className='space-y-3'>
          {funnel.funnel.map((stage, i) => (
            <div key={stage.stage}>
              <div className='flex items-center justify-between text-sm mb-1'>
                <span className='font-medium text-gray-900'>{stage.stage}</span>
                <span className='text-muted-foreground'>
                  {stage.count.toLocaleString()}
                  {i > 0 && (
                    <span className='ml-2 text-xs'>({stage.conversion_from_previous_pct}% from previous)</span>
                  )}
                </span>
              </div>
              <div className='h-8 w-full rounded bg-muted overflow-hidden'>
                <div
                  className='h-full bg-primary rounded'
                  style={{ width: `${Math.max((stage.count / maxCount) * 100, stage.count ? 2 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
        <StatCard label='Avg screening pass mark' value={funnel.avg_screening_pass_mark} />
        <StatCard label='Avg assessment pass mark' value={funnel.avg_assessment_pass_mark} />
        <StatCard label='Assessment dropout rate' value={`${funnel.assessment_dropout_rate_pct}%`} alert={funnel.assessment_dropout_rate_pct > 30} />
        <StatCard label='Candidate ghost rate' value={`${funnel.candidate_ghost_rate_pct}%`} alert={funnel.candidate_ghost_rate_pct > 30} />
        <StatCard
          label='Avg time to complete after invite'
          value={
            funnel.avg_time_to_complete_after_invite.available
              ? `${funnel.avg_time_to_complete_after_invite.minutes} min`
              : null
          }
          unavailableText='Not enough data yet'
        />
        <StatCard label='Avg candidate score' value={funnel.avg_score !== null ? `${funnel.avg_score}%` : null} />
      </div>

      <ChartContainer>
        <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>Assessment type breakdown</h4>
            {Object.keys(funnel.assessment_type_breakdown).length ? (
              <DashboardBarChart
                labels={Object.keys(funnel.assessment_type_breakdown)}
                data={Object.values(funnel.assessment_type_breakdown)}
              />
            ) : (
              <p className='text-sm text-muted-foreground py-8 text-center'>No assessments created yet.</p>
            )}
          </div>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>Score distribution</h4>
            <DashboardBarChart
              labels={Object.keys(funnel.score_distribution).map(k => SCORE_BUCKET_LABELS[k] ?? k)}
              data={Object.values(funnel.score_distribution)}
              fill='#12B76A'
            />
          </div>
        </section>
      </ChartContainer>
    </>
  );
};

export default FunnelPage;
