import { RoleReportData } from "@/app/common/types/reports.type";
import { cn } from "@/app/common/utils";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";
import { formatDate, formatDays, formatHours, formatNaira } from "../../_lib/format";
import FunnelChart from "../../_components/FunnelChart";

const STATUS_BADGE_STYLES: Record<RoleReportData["status_label"], string> = {
  Filled: "bg-[#ECFDF3] text-[#1D9E75]",
  Active: "bg-[#EEF4FF] text-[#3580B5]",
  Closed: "bg-[#F5F5F5] text-[#667085]",
};

type RoleCostLineKey = "resume_screening" | "assessment" | "ai_interview" | "human_interview" | "recording";

const COST_LINES: { key: RoleCostLineKey; label: string; unit: number }[] = [
  { key: "resume_screening", label: "Resume screenings", unit: 40 },
  { key: "assessment", label: "Assessments", unit: 100 },
  { key: "ai_interview", label: "AI interviews", unit: 800 },
  { key: "human_interview", label: "Human interviews", unit: 1500 },
  { key: "recording", label: "Recording add-ons", unit: 1000 },
];

const RoleCard = ({ role }: { role: RoleReportData }) => {
  const distribution = role.scores.assessment_score_distribution;

  return (
    <div className='bg-white rounded-2lg border border-[#EAECF0] p-6 flex flex-col gap-6'>
      <div className='flex items-start justify-between gap-3 flex-wrap'>
        <div>
          <h3 className='text-lg font-semibold text-primaryBlack'>{role.title}</h3>
          <p className='text-sm text-secondary-black mt-0.5'>
            Posted {formatDate(role.date_posted)} &middot; {role.date_filled ? `Filled ${formatDate(role.date_filled)}` : "Active"}
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS_BADGE_STYLES[role.status_label])}>
          {role.status_label}
        </span>
      </div>

      <div>
        <h4 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-3'>Pipeline funnel</h4>
        <FunnelChart
          stages={[
            { label: "Applied", count: role.funnel.applied },
            { label: "Screened", count: role.funnel.screened },
            { label: "Assessment sent", count: role.funnel.assessment_sent },
            { label: "Assessment completed", count: role.funnel.assessment_completed },
            { label: "Interviewed", count: role.funnel.interviewed },
            { label: "Filled", count: role.funnel.filled },
          ]}
        />
      </div>

      <div className='grid sm:grid-cols-2 gap-6'>
        <div>
          <h4 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-3'>Time metrics</h4>
          <dl className='text-sm flex flex-col gap-2'>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Days posted to first applicant</dt>
              <dd className='font-medium text-primaryBlack'>{formatDays(role.time.days_posted_to_first_applicant)}</dd>
            </div>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Application to screening result</dt>
              <dd className='font-medium text-primaryBlack'>{formatHours(role.time.avg_hours_application_to_screening)}</dd>
            </div>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Screening pass to assessment sent</dt>
              <dd className='font-medium text-primaryBlack'>{formatHours(role.time.avg_hours_screening_pass_to_assessment_sent)}</dd>
            </div>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Assessment sent to completed</dt>
              <dd className='font-medium text-primaryBlack'>{formatHours(role.time.avg_hours_assessment_sent_to_completed)}</dd>
            </div>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>{role.time.is_filled ? "Days to fill" : "Total days open"}</dt>
              <dd className='font-medium text-primaryBlack'>{formatDays(role.time.days_open)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-3'>Score metrics</h4>
          <dl className='text-sm flex flex-col gap-2 mb-4'>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Avg. screening score (all)</dt>
              <dd className='font-medium text-primaryBlack'>{role.scores.avg_screening_score_all ?? "N/A"}</dd>
            </div>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Avg. screening score (passed)</dt>
              <dd className='font-medium text-primaryBlack'>{role.scores.avg_screening_score_passed ?? "N/A"}</dd>
            </div>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Avg. assessment score (completers)</dt>
              <dd className='font-medium text-primaryBlack'>{role.scores.avg_assessment_score ?? "N/A"}</dd>
            </div>
          </dl>
          {Object.values(distribution).some(v => v > 0) && (
            <DashboardBarChart
              labels={Object.keys(distribution)}
              data={Object.values(distribution)}
              fill='#1A3C5E'
              label='Assessment score distribution'
            />
          )}
        </div>
      </div>

      <div>
        <h4 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-3'>Cost for this role</h4>
        <div className='flex flex-col gap-1.5 text-sm'>
          {COST_LINES.map(line => {
            const value = role.cost[line.key];
            if (typeof value !== "object") return null;
            return (
              <div key={line.label} className='flex justify-between'>
                <span className='text-secondary-black'>
                  {line.label}: {value.count} &times; {formatNaira(line.unit)}
                </span>
                <span className='font-medium text-primaryBlack'>{formatNaira(value.total)}</span>
              </div>
            );
          })}
          <div className='flex justify-between pt-2 border-t border-[#F5F5F5] font-semibold'>
            <span className='text-primaryBlack'>Role total</span>
            <span className='text-[#1D9E75]'>{formatNaira(role.cost.role_total)}</span>
          </div>
          <div className='flex justify-between text-secondary-black'>
            <span>Cost per candidate processed</span>
            <span>{formatNaira(role.cost.cost_per_candidate)}</span>
          </div>
          <div className='flex justify-between text-secondary-black'>
            <span>Cost per placement</span>
            <span>{role.cost.cost_per_placement != null ? formatNaira(role.cost.cost_per_placement) : "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoleBreakdownSection = ({ roles }: { roles: RoleReportData[] }) => (
  <section id='roles' className='scroll-mt-24 flex flex-col gap-4'>
    <h2 className='text-lg font-bold text-[#1A3C5E] border-l-[3px] border-[#1A3C5E] pl-3'>Role by Role Breakdown</h2>
    <div className='flex flex-col gap-6'>
      {roles.map(role => (
        <RoleCard key={role.job_id} role={role} />
      ))}
    </div>
  </section>
);

export default RoleBreakdownSection;
