import { ReportData } from "@/app/common/types/reports.type";
import { formatCount, formatDays, formatNaira, formatPercent } from "../../_lib/format";

const StatBlock = ({ value, label, unit }: { value: string; label: string; unit?: string }) => (
  <div className='bg-white rounded-2lg border border-[#EAECF0] p-5 flex flex-col gap-1'>
    <p className='text-2xl font-bold text-[#1A3C5E] font-space-grotesk'>{value}</p>
    <p className='text-sm text-secondary-black'>{label}</p>
    {unit && <p className='text-xs text-[#9E9E9E]'>{unit}</p>}
  </div>
);

const OverviewSection = ({ data }: { data: ReportData }) => {
  const { summary } = data;
  return (
    <section id='overview' className='scroll-mt-24 flex flex-col gap-4'>
      <h2 className='text-lg font-bold text-[#1A3C5E] border-l-[3px] border-[#1A3C5E] pl-3'>Overview</h2>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <StatBlock value={formatCount(summary.total_roles)} label='Total roles in report' />
        <StatBlock value={formatCount(summary.total_applied)} label='Total candidates applied' />
        <StatBlock value={formatCount(summary.total_screened_passed)} label='Candidates passed screening' />
        <StatBlock value={formatPercent(summary.screening_pass_rate)} label='Screening pass rate' />
        <StatBlock value={formatCount(summary.total_assessments)} label='Total assessments' />
        <StatBlock value={formatNaira(summary.avg_cost_per_candidate)} label='Avg. cost per candidate' />
        <StatBlock
          value={summary.avg_cost_per_role_filled != null ? formatNaira(summary.avg_cost_per_role_filled) : "N/A"}
          label='Avg. cost per role filled'
        />
        <StatBlock
          value={summary.avg_days_posted_to_filled != null ? formatDays(Math.round(summary.avg_days_posted_to_filled)) : "N/A"}
          label='Avg. days posted to filled'
          unit='Filled roles only'
        />
      </div>
    </section>
  );
};

export default OverviewSection;
