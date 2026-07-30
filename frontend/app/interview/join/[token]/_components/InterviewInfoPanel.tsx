import { Clock, Handshake } from "lucide-react";

import BrandLink from "@/app/common/components/BrandLink";
import type { InterviewDetails } from "@/app/common/services/interview";

/**
 * Navy context panel: 40% of the width on desktop, a shorter header block above
 * the setup checks on mobile.
 */
const InterviewInfoPanel = ({
  interview,
}: {
  interview: Pick<
    InterviewDetails,
    "company_name" | "job_title" | "recruiter_first_name" | "duration_minutes"
  >;
}) => {
  const { company_name, job_title, recruiter_first_name, duration_minutes } = interview;

  return (
    <aside className='w-full lg:w-2/5 bg-deep-blue text-white px-6 md:px-10 lg:px-12 py-8 lg:py-12 flex flex-col shrink-0'>
      <BrandLink isWhite containerClassName='shrink-0 self-start' />

      <div className='flex-1 flex flex-col justify-center py-8 lg:py-12'>
        <div className='hidden sm:flex h-20 w-20 lg:h-24 lg:w-24 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 items-center justify-center mb-8 lg:mb-10'>
          <Handshake className='h-10 w-10 lg:h-12 lg:w-12 text-white' strokeWidth={1.5} />
        </div>

        <p className='text-sm font-medium uppercase tracking-wider text-white/60 mb-2'>
          {company_name}
        </p>
        <h1 className='text-2xl lg:text-[32px] leading-tight font-bold font-space-grotesk mb-3'>
          Interview for {job_title}
        </h1>
        <p className='text-white/80 text-base lg:text-lg'>with {recruiter_first_name}</p>

        <div className='mt-8 lg:mt-10 inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-4 py-2 text-sm text-white/85'>
          <Clock className='h-4 w-4 shrink-0' />
          This interview is approximately {duration_minutes} minutes
        </div>
      </div>
    </aside>
  );
};

export default InterviewInfoPanel;
