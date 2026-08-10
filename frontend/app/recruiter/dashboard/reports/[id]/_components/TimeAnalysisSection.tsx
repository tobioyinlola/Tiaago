import { ReportTimeAnalysis } from "@/app/common/types/reports.type";
import { cn } from "@/app/common/utils";
import { formatDays, formatHours } from "../../_lib/format";

const TimeAnalysisSection = ({ time }: { time: ReportTimeAnalysis }) => {
  const stages = Object.values(time.stage_durations).filter(s => s.avg_hours != null);
  const maxStageHours = Math.max(...stages.map(s => s.avg_hours || 0), 1);

  const maxDaysToFill = Math.max(...time.time_to_fill.map(r => r.days_to_fill), time.benchmark_days, 1);

  return (
    <section id='time' className='scroll-mt-24 flex flex-col gap-6'>
      <h2 className='text-lg font-bold text-[#1A3C5E] border-l-[3px] border-[#1A3C5E] pl-3'>Time Analysis</h2>

      <div className='bg-white rounded-2lg border border-[#EAECF0] p-6'>
        <h3 className='font-medium text-primaryBlack mb-4'>Average pipeline stage durations</h3>
        <div className='flex flex-col gap-3'>
          {stages.map(stage => (
            <div key={stage.label} className='flex items-center gap-3'>
              <span className='w-64 shrink-0 text-sm text-secondary-black text-right'>{stage.label}</span>
              <div className='flex-1 h-6 rounded-md bg-[#F4F4F4] overflow-hidden'>
                <div
                  className='h-full rounded-md bg-[#1A3C5E]'
                  style={{ width: `${Math.max(2, Math.round(((stage.avg_hours || 0) / maxStageHours) * 100))}%` }}
                />
              </div>
              <span className='w-24 shrink-0 text-sm font-medium text-primaryBlack'>{formatHours(stage.avg_hours)}</span>
            </div>
          ))}
        </div>
      </div>

      {time.time_to_fill.length > 0 && (
        <div className='bg-white rounded-2lg border border-[#EAECF0] p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='font-medium text-primaryBlack'>Time to fill by role</h3>
            <span className='text-xs text-secondary-black flex items-center gap-1.5'>
              <span className='w-2 h-2 rounded-full bg-[#1D9E75] inline-block' /> Beats benchmark
              <span className='w-2 h-2 rounded-full bg-[#B54708] inline-block ml-2' /> Above benchmark
            </span>
          </div>
          <div className='flex flex-col gap-3'>
            {time.time_to_fill
              .slice()
              .sort((a, b) => a.days_to_fill - b.days_to_fill)
              .map(role => (
                <div key={role.job_id} className='flex items-center gap-3'>
                  <span className='w-44 shrink-0 text-sm text-secondary-black text-right truncate'>{role.title}</span>
                  <div className='flex-1 h-6 rounded-md bg-[#F4F4F4] overflow-hidden'>
                    <div
                      className={cn("h-full rounded-md", role.beats_benchmark ? "bg-[#1D9E75]" : "bg-[#B54708]")}
                      style={{ width: `${Math.max(2, Math.round((role.days_to_fill / maxDaysToFill) * 100))}%` }}
                    />
                  </div>
                  <span className='w-20 shrink-0 text-sm font-medium text-primaryBlack'>{formatDays(role.days_to_fill)}</span>
                </div>
              ))}
          </div>
          <p className='text-xs text-secondary-black mt-3'>
            Dashed line: industry average ({formatDays(time.benchmark_days)})
          </p>
        </div>
      )}
    </section>
  );
};

export default TimeAnalysisSection;
