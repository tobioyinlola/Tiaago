import { ReportExperience } from "@/app/common/types/reports.type";
import { cn } from "@/app/common/utils";
import { formatCount, formatHours, formatPercent } from "../../_lib/format";

const feedbackTone = (rate: number) => {
  if (rate >= 80) return { bar: "bg-[#1D9E75]", text: "text-[#1D9E75]" };
  if (rate >= 50) return { bar: "bg-[#B54708]", text: "text-[#B54708]" };
  return { bar: "bg-[#B53535]", text: "text-[#B53535]" };
};

const CandidateExperienceSection = ({ experience }: { experience: ReportExperience }) => {
  const tone = feedbackTone(experience.feedback.rate);

  return (
    <section id='experience' className='scroll-mt-24 flex flex-col gap-6'>
      <h2 className='text-lg font-bold text-[#1A3C5E] border-l-[3px] border-[#1A3C5E] pl-3'>Candidate Experience Data</h2>

      <div className='bg-white rounded-2lg border border-[#EAECF0] p-6 overflow-x-auto'>
        <h3 className='font-medium text-primaryBlack mb-4'>Drop-off analysis</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-secondary-black border-b border-[#EAECF0]'>
              <th className='py-2 pr-4'>Stage</th>
              <th className='py-2 pr-4'>Entered</th>
              <th className='py-2 pr-4'>Left</th>
              <th className='py-2'>Drop-off rate</th>
            </tr>
          </thead>
          <tbody>
            {experience.drop_off_analysis.map((row, i) => {
              const isHigh = row.drop_off_rate > 50;
              return (
                <tr
                  key={row.stage}
                  className={cn(
                    "border-b border-[#F5F5F5] last:border-0",
                    isHigh ? "bg-[#FFFAEB]" : i % 2 === 1 && "bg-[#F4F4F4]"
                  )}
                >
                  <td className='py-2 pr-4 text-primaryBlack'>{row.stage}</td>
                  <td className='py-2 pr-4'>{formatCount(row.entered)}</td>
                  <td className='py-2 pr-4'>{formatCount(row.left)}</td>
                  <td className={cn("py-2 font-medium", isHigh ? "text-[#B54708]" : "text-primaryBlack")}>
                    {formatPercent(row.drop_off_rate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className='grid sm:grid-cols-2 gap-6'>
        <div className='bg-white rounded-2lg border border-[#EAECF0] p-6'>
          <h3 className='font-medium text-primaryBlack mb-4'>Assessment response data</h3>
          <dl className='text-sm flex flex-col gap-2'>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Avg. hours invite to completion</dt>
              <dd className='font-medium text-primaryBlack'>{formatHours(experience.assessment_response.avg_hours_invite_to_completion)}</dd>
            </div>
            <div className='flex justify-between'>
              <dt className='text-secondary-black'>Completion rate</dt>
              <dd className='font-medium text-primaryBlack'>{formatPercent(experience.assessment_response.completion_rate)}</dd>
            </div>
          </dl>
        </div>

        <div className='bg-white rounded-2lg border border-[#EAECF0] p-6'>
          <h3 className='font-medium text-primaryBlack mb-4'>Feedback sent rate</h3>
          <div className='flex items-center gap-3 mb-3'>
            <span className={cn("text-3xl font-bold font-space-grotesk", tone.text)}>
              {formatPercent(experience.feedback.rate)}
            </span>
            <span className='text-xs text-secondary-black'>
              {experience.feedback.sent_count} of {experience.feedback.total_interviewed} interviewed
            </span>
          </div>
          <div className='h-2 rounded-full bg-[#F4F4F4] overflow-hidden mb-3'>
            <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${Math.min(100, experience.feedback.rate)}%` }} />
          </div>
          <p className='text-sm text-secondary-black'>
            Avg. hours from interview to feedback: {formatHours(experience.feedback.avg_hours_to_send)}
          </p>
        </div>
      </div>
    </section>
  );
};

export default CandidateExperienceSection;
