"use client";

import { Clock } from "lucide-react";

import BrandLink from "@/app/common/components/BrandLink";
import { useInviteFlow } from "./InviteFlowProvider";

// "Environment Check" (camera pre-check) is skipped in Phase 1 proctoring --
// there's no webcam step yet, so honesty/ routes straight to ready/.
export const INVITE_STEPS = ["Instructions", "Your Details", "Honesty Agreement", "Ready"];

const InviteShell = ({
  children,
  step,
  showDuration = true,
}: {
  children: React.ReactNode;
  /** 1-indexed step within INVITE_STEPS, omit on screens with no step context (e.g. quiz, submitted) */
  step?: number;
  showDuration?: boolean;
}) => {
  const { assessment_title, duration_minutes, job_title, company_name } = useInviteFlow();
  const progress = step ? Math.round((step / INVITE_STEPS.length) * 100) : undefined;

  return (
    <div className='min-h-screen w-full bg-white flex flex-col'>
      <header className='w-full px-6 md:px-10 py-5 flex items-center justify-between'>
        <BrandLink containerClassName='shrink-0' />
        {showDuration && (
          <div className='hidden sm:flex items-center gap-2 text-sm text-secondary-black bg-[#F0F2F5] rounded-full px-4 py-1.5'>
            <Clock className='h-4 w-4' />
            {duration_minutes} min
          </div>
        )}
      </header>

      <div className='flex-1 flex items-start justify-center px-6 md:px-10 py-6'>
        <div className='w-full max-w-2xl'>
          <div className='mb-6'>
            <h1 className='text-2xl md:text-[28px] font-bold text-primary-black font-space-grotesk'>
              {assessment_title}
            </h1>
            {(job_title || company_name) && (
              <p className='text-secondary-black text-sm mt-1'>
                {job_title}
                {job_title && company_name ? " at " : ""}
                {company_name}
              </p>
            )}
          </div>

          {step && (
            <div className='mb-8'>
              <div className='flex items-center justify-between text-xs text-secondary-black mb-2'>
                <span className='font-medium'>
                  Step {step} of {INVITE_STEPS.length}: {INVITE_STEPS[step - 1]}
                </span>
                <span>{progress}%</span>
              </div>
              <div
                role='progressbar'
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className='h-1.5 w-full rounded-full bg-[#EAECF0]'
              >
                <div
                  className='h-full rounded-full bg-primary transition-all duration-300'
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
};

export default InviteShell;
