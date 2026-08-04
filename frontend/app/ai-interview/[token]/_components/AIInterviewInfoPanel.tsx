import BrandLink from "@/app/common/components/BrandLink";
import type { AIInterviewJoinInfo } from "@/app/common/services/ai-interviews";
import AlexAvatar from "./AlexAvatar";

/** White context panel: 40% of the width on desktop, separated from the
 * setup-check panel by a border rather than a solid brand-color fill --
 * primary blue carries the accents instead. */
const AIInterviewInfoPanel = ({ interview }: { interview: AIInterviewJoinInfo }) => {
  const { company_name, job_title, duration_minutes, questions_total } = interview;

  return (
    <aside className='w-full lg:w-2/5 bg-white border-b lg:border-b-0 lg:border-r border-[#EAECF0] px-6 md:px-10 lg:px-12 py-8 lg:py-12 flex flex-col shrink-0'>
      <BrandLink containerClassName='shrink-0 self-start' />

      <div className='flex-1 flex flex-col justify-center py-8 lg:py-12'>
        <AlexAvatar className='h-20 w-20 lg:h-24 lg:w-24 mb-5' />
        <p className='text-primary-black font-semibold text-lg'>Alex</p>
        <p className='text-secondary-black text-sm mb-6'>AI Interviewer &middot; Tiaago</p>

        <p className='text-sm font-medium uppercase tracking-wider text-primary mb-2'>
          {company_name}
        </p>
        <h1 className='text-2xl lg:text-[32px] leading-tight font-bold font-space-grotesk text-primary-black mb-6'>
          Interview for {job_title}
        </h1>

        <ul className='space-y-3'>
          <li className='flex items-center gap-2.5 text-secondary-black text-sm lg:text-base'>
            <span className='h-1.5 w-1.5 rounded-full bg-primary shrink-0' />
            {questions_total} questions about your background
          </li>
          <li className='flex items-center gap-2.5 text-secondary-black text-sm lg:text-base'>
            <span className='h-1.5 w-1.5 rounded-full bg-primary shrink-0' />
            About {duration_minutes} minutes
          </li>
          <li className='flex items-center gap-2.5 text-secondary-black text-sm lg:text-base'>
            <span className='h-1.5 w-1.5 rounded-full bg-primary shrink-0' />
            Speak naturally -- no right or wrong answers
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default AIInterviewInfoPanel;
