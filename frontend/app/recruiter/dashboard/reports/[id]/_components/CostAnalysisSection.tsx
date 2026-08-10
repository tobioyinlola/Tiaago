import { ReportCosts } from "@/app/common/types/reports.type";
import { cn } from "@/app/common/utils";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";
import DashboardDonutChart from "@/app/common/components/dashboard/charts/DashboardDonutChart";
import DashboardLineChart from "@/app/common/components/dashboard/charts/DashboardLineChart";
import { formatNaira } from "../../_lib/format";

const CATEGORY_LABELS: Record<keyof ReportCosts["breakdown"], string> = {
  resume_screening: "Resume screening",
  assessment: "Assessments",
  ai_interview: "AI interviews",
  human_interview: "Human interviews",
  recording: "Recording add-ons",
};

const DONUT_COLORS = ["#1A3C5E", "#2D5F8A", "#1D9E75", "#5A7A99", "#9CB4C7"];

const CostAnalysisSection = ({ costs }: { costs: ReportCosts }) => {
  const categories = Object.keys(costs.breakdown) as (keyof ReportCosts["breakdown"])[];

  return (
    <section id='costs' className='scroll-mt-24 flex flex-col gap-6'>
      <h2 className='text-lg font-bold text-[#1A3C5E] border-l-[3px] border-[#1A3C5E] pl-3'>Cost Analysis</h2>

      <div className='bg-white rounded-2lg border border-[#EAECF0] p-6 grid md:grid-cols-2 gap-6 items-center'>
        <DashboardDonutChart
          labels={categories.map(c => CATEGORY_LABELS[c])}
          data={categories.map(c => costs.breakdown[c])}
          colors={DONUT_COLORS}
        />
        <div className='flex flex-col gap-2 text-sm'>
          {categories.map(c => (
            <div key={c} className='flex justify-between'>
              <span className='text-secondary-black'>{CATEGORY_LABELS[c]}</span>
              <span className='font-medium text-primaryBlack'>{formatNaira(costs.breakdown[c])}</span>
            </div>
          ))}
          <div className='flex justify-between pt-2 border-t border-[#F5F5F5] font-semibold'>
            <span className='text-primaryBlack'>Grand total</span>
            <span className='text-[#1D9E75]'>{formatNaira(costs.grand_total)}</span>
          </div>
        </div>
      </div>

      <div className='bg-white rounded-2lg border border-[#EAECF0] p-6'>
        <h3 className='font-medium text-primaryBlack mb-4'>Cost per role</h3>
        <DashboardBarChart
          labels={costs.cost_per_role.map(r => r.title)}
          data={costs.cost_per_role.map(r => r.total)}
          fill='#1A3C5E'
          horizontal
        />
      </div>

      {costs.monthly_trend.length > 0 && (
        <div className='bg-white rounded-2lg border border-[#EAECF0] p-6'>
          <h3 className='font-medium text-primaryBlack mb-4'>Monthly spend trend</h3>
          <DashboardLineChart
            labels={costs.monthly_trend.map(m => m.month)}
            data={costs.monthly_trend.map(m => m.amount)}
            fill='#1A3C5E'
            areaFill='#1D9E7522'
          />
        </div>
      )}

      <div className='bg-white rounded-2lg border border-[#EAECF0] p-6 overflow-x-auto'>
        <h3 className='font-medium text-primaryBlack mb-4'>Cost efficiency</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-secondary-black border-b border-[#EAECF0]'>
              <th className='py-2 pr-4'>Role</th>
              <th className='py-2 pr-4'>Candidates</th>
              <th className='py-2 pr-4'>Cost</th>
              <th className='py-2 pr-4'>Placements</th>
              <th className='py-2'>Cost per placement</th>
            </tr>
          </thead>
          <tbody>
            {costs.cost_efficiency.map((row, i) => (
              <tr key={row.job_id} className={cn("border-b border-[#F5F5F5] last:border-0", i % 2 === 1 && "bg-[#F4F4F4]")}>
                <td className='py-2 pr-4 text-primaryBlack'>{row.title}</td>
                <td className='py-2 pr-4'>{row.candidates}</td>
                <td className='py-2 pr-4'>{formatNaira(row.cost)}</td>
                <td className='py-2 pr-4'>{row.placements}</td>
                <td className='py-2'>{row.cost_per_placement != null ? formatNaira(row.cost_per_placement) : "N/A"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className='font-semibold border-t border-[#EAECF0]'>
              <td className='py-2 pr-4 text-primaryBlack'>Total</td>
              <td className='py-2 pr-4'>{costs.cost_efficiency.reduce((a, r) => a + r.candidates, 0)}</td>
              <td className='py-2 pr-4 text-[#1D9E75]'>{formatNaira(costs.grand_total)}</td>
              <td className='py-2 pr-4'>{costs.cost_efficiency.reduce((a, r) => a + r.placements, 0)}</td>
              <td className='py-2' />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
};

export default CostAnalysisSection;
