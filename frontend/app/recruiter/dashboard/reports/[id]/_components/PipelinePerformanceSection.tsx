import { ReportPipeline } from "@/app/common/types/reports.type";
import { cn } from "@/app/common/utils";
import { formatHours, formatPercent } from "../../_lib/format";
import FunnelChart from "../../_components/FunnelChart";

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  screened: "Screened",
  assessment_sent: "Assessment Sent",
  assessment_completed: "Assessment Completed",
  interviewed: "Interviewed",
  filled: "Filled",
};

const PipelinePerformanceSection = ({ pipeline }: { pipeline: ReportPipeline }) => {
  const funnelStages = Object.entries(pipeline.combined_funnel).map(([key, count]) => ({
    label: STAGE_LABELS[key] || key,
    count,
  }));

  return (
    <section id='pipeline' className='scroll-mt-24 flex flex-col gap-6'>
      <h2 className='text-lg font-bold text-[#1A3C5E] border-l-[3px] border-[#1A3C5E] pl-3'>Pipeline Performance</h2>

      <div className='bg-white rounded-2lg border border-[#EAECF0] p-6'>
        <h3 className='font-medium text-primaryBlack mb-4'>Combined funnel (all roles)</h3>
        <FunnelChart stages={funnelStages} />
        <div className='grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6'>
          {Object.entries(pipeline.drop_offs).map(([key, pct]) => {
            const isLargest = key === pipeline.largest_drop_off_stage;
            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg p-3 text-center",
                  isLargest ? "bg-[#FFFAEB] border border-[#B54708]/30" : "bg-[#FAFAFB]"
                )}
              >
                <p className='text-xs text-secondary-black'>{key.replace(/_/g, " ")}</p>
                <p className={cn("text-lg font-semibold", isLargest ? "text-[#B54708]" : "text-primaryBlack")}>
                  {formatPercent(pct)} drop-off
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className='bg-white rounded-2lg border border-[#EAECF0] p-6 overflow-x-auto'>
        <h3 className='font-medium text-primaryBlack mb-4'>Screening performance by role</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-secondary-black border-b border-[#EAECF0]'>
              <th className='py-2 pr-4'>Role</th>
              <th className='py-2 pr-4'>Pass rate</th>
              <th className='py-2'>Avg. score</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.screening_performance.map((row, i) => (
              <tr key={row.job_id} className={cn("border-b border-[#F5F5F5] last:border-0", i % 2 === 1 && "bg-[#F4F4F4]")}>
                <td className='py-2 pr-4 text-primaryBlack'>{row.title}</td>
                <td className='py-2 pr-4'>{formatPercent(row.pass_rate)}</td>
                <td className='py-2'>{row.avg_score ?? "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='bg-white rounded-2lg border border-[#EAECF0] p-6 overflow-x-auto'>
        <h3 className='font-medium text-primaryBlack mb-4'>Assessment performance by role</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-secondary-black border-b border-[#EAECF0]'>
              <th className='py-2 pr-4'>Role</th>
              <th className='py-2 pr-4'>Completion rate</th>
              <th className='py-2 pr-4'>Avg. score</th>
              <th className='py-2'>Avg. time to complete</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.assessment_performance.map((row, i) => (
              <tr key={row.job_id} className={cn("border-b border-[#F5F5F5] last:border-0", i % 2 === 1 && "bg-[#F4F4F4]")}>
                <td className='py-2 pr-4 text-primaryBlack'>{row.title}</td>
                <td className='py-2 pr-4'>{formatPercent(row.completion_rate)}</td>
                <td className='py-2 pr-4'>{row.avg_score ?? "N/A"}</td>
                <td className='py-2'>{formatHours(row.avg_hours_to_complete)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pipeline.interview_performance.length > 0 && (
        <div className='bg-white rounded-2lg border border-[#EAECF0] p-6 overflow-x-auto'>
          <h3 className='font-medium text-primaryBlack mb-4'>Interview performance by role</h3>
          <table className='w-full text-sm'>
            <thead>
              <tr className='text-left text-secondary-black border-b border-[#EAECF0]'>
                <th className='py-2 pr-4'>Role</th>
                <th className='py-2 pr-4'>Human interviews</th>
                <th className='py-2 pr-4'>AI interviews</th>
                <th className='py-2'>AI avg. score</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.interview_performance.map((row, i) => (
                <tr key={row.job_id} className={cn("border-b border-[#F5F5F5] last:border-0", i % 2 === 1 && "bg-[#F4F4F4]")}>
                  <td className='py-2 pr-4 text-primaryBlack'>{row.title}</td>
                  <td className='py-2 pr-4'>{row.human_interviews_conducted}</td>
                  <td className='py-2 pr-4'>{row.ai_interviews_conducted}</td>
                  <td className='py-2'>{row.ai_interview_avg_score ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PipelinePerformanceSection;
