import { cn } from "@/app/common/utils";
import type { AIInterviewDetail } from "@/app/common/services/ai-interviews";

const SEVERITY_BADGE: Record<string, string> = {
  LOW: "bg-[#F5F6F7] text-secondary-black",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-destructive/10 text-destructive",
};

const SummaryTab = ({ interview }: { interview: AIInterviewDetail }) => (
  <div className='flex flex-col gap-8 max-w-3xl'>
    <section>
      <h3 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-2'>Executive summary</h3>
      <p className='text-primaryBlack leading-7'>{interview.executive_summary || "No summary available."}</p>
    </section>

    {interview.strengths.length > 0 && (
      <section>
        <h3 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-2'>Strengths</h3>
        <ul className='list-disc list-inside space-y-1.5'>
          {interview.strengths.map((strength, index) => (
            <li key={index} className='text-primaryBlack text-sm'>
              {strength}
            </li>
          ))}
        </ul>
      </section>
    )}

    {interview.concerns.length > 0 && (
      <section>
        <h3 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-2'>Concerns</h3>
        <div className='flex flex-col gap-3'>
          {interview.concerns.map((concern, index) => (
            <div key={index} className='rounded-lg border border-[#EAECF0] p-4'>
              <div className='flex items-center gap-2 mb-1'>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", SEVERITY_BADGE[concern.severity] ?? SEVERITY_BADGE.MEDIUM)}>
                  {concern.severity}
                </span>
              </div>
              <p className='text-sm text-primaryBlack'>{concern.text}</p>
              {concern.evidence && <p className='text-xs text-secondary-black mt-1 italic'>&ldquo;{concern.evidence}&rdquo;</p>}
            </div>
          ))}
        </div>
      </section>
    )}

    {interview.flags.length > 0 && (
      <section>
        <h3 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-2'>Things to be aware of</h3>
        <div className='flex flex-col gap-3'>
          {interview.flags.map((flag, index) => (
            <div key={index} className='rounded-lg bg-amber-50 border border-amber-200 p-4'>
              <p className='text-xs font-semibold text-amber-700 uppercase mb-1'>{flag.type}</p>
              <p className='text-sm text-primaryBlack'>{flag.description}</p>
              {flag.impact && <p className='text-xs text-secondary-black mt-1'>{flag.impact}</p>}
            </div>
          ))}
        </div>
      </section>
    )}

    {interview.recruiter_notes && (
      <section>
        <h3 className='text-sm font-semibold text-secondary-black uppercase tracking-wide mb-2'>Recruiter notes</h3>
        <p className='text-primaryBlack text-sm leading-7'>{interview.recruiter_notes}</p>
      </section>
    )}
  </div>
);

export default SummaryTab;
