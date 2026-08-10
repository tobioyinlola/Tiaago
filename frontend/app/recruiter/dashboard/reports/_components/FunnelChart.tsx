import { cn } from "@/app/common/utils";
import { formatCount, formatPercent } from "../_lib/format";

export type FunnelStage = { label: string; count: number };

/** Horizontal bars scaled proportionally to the first stage's count, each
 * annotated with its count and (in brackets) the percentage of the
 * previous stage it represents. No chart.js equivalent for this shape, so
 * it's a small purpose-built component rather than a chart library call. */
const FunnelChart = ({ stages, barClassName = "bg-primary" }: { stages: FunnelStage[]; barClassName?: string }) => {
  const max = stages[0]?.count || 1;

  return (
    <div className='flex flex-col gap-3'>
      {stages.map((stage, index) => {
        const previous = index > 0 ? stages[index - 1].count : null;
        const pctOfPrevious = previous ? formatPercent(Math.round((stage.count / previous) * 1000) / 10) : null;
        const widthPct = Math.max(2, Math.round((stage.count / max) * 100));
        return (
          <div key={stage.label} className='flex items-center gap-3'>
            <span className='w-40 shrink-0 text-sm text-secondary-black text-right'>{stage.label}</span>
            <div className='flex-1 h-6 rounded-md bg-[#F4F4F4] overflow-hidden'>
              <div
                className={cn("h-full rounded-md transition-all", barClassName)}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className='w-32 shrink-0 text-sm font-medium text-primaryBlack whitespace-nowrap'>
              {formatCount(stage.count)}
              {pctOfPrevious && <span className='text-secondary-black font-normal'> ({pctOfPrevious})</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default FunnelChart;
