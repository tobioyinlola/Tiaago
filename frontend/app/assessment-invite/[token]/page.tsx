"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Info, ListChecks, Wifi } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import InviteShell from "./_components/InviteShell";
import { useInviteFlow } from "./_components/InviteFlowProvider";

const INSTRUCTIONS = [
  {
    Icon: Clock3,
    text: "This is a timed test. Please make sure you are not interrupted, as the timer cannot be paused once started.",
  },
  {
    Icon: Wifi,
    text: "Please ensure you have a stable internet connection before you begin.",
  },
  {
    Icon: ListChecks,
    text: "Answer every question to the best of your ability -- you can move between questions before submitting.",
  },
  {
    Icon: Info,
    text: "Once you submit, your answers are final and cannot be changed.",
  },
];

const AssessmentInvitePage = () => {
  const { token, sections, already_submitted, is_expired, deadline_formatted } = useInviteFlow();

  if (already_submitted) {
    return (
      <InviteShell showDuration={false}>
        <h2 className='text-xl font-bold text-primary-black mb-2'>
          You&apos;ve already completed this assessment
        </h2>
        <p className='text-secondary-black text-sm'>
          We&apos;ve already received your submission for this assessment. If you believe this is a
          mistake, please reply to the invitation email you received.
        </p>
      </InviteShell>
    );
  }

  if (is_expired) {
    return (
      <InviteShell showDuration={false}>
        <h2 className='text-xl font-bold text-primary-black mb-2'>This assessment invite has expired</h2>
        <p className='text-secondary-black text-sm'>
          {deadline_formatted
            ? `The deadline to complete this assessment was ${deadline_formatted}.`
            : "The deadline to complete this assessment has passed."}{" "}
          If you believe this is a mistake, please reply to the invitation email you received.
        </p>
      </InviteShell>
    );
  }

  return (
    <InviteShell step={1}>
      <h2 className='text-lg font-bold text-primary-black mb-4'>Instructions</h2>

      <ul className='space-y-4 mb-8'>
        {INSTRUCTIONS.map(({ Icon, text }, i) => (
          <li key={i} className='flex gap-3'>
            <span className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
              <Icon className='h-4 w-4 text-primary' />
            </span>
            <p className='text-secondary-black text-sm leading-6 pt-1'>{text}</p>
          </li>
        ))}
      </ul>

      {deadline_formatted && (
        <p className='text-sm text-secondary-black mb-6'>
          Please complete this assessment by <span className='font-semibold text-primary-black'>{deadline_formatted}</span>.
        </p>
      )}

      <h3 className='text-sm font-semibold text-primary-black mb-3'>Test Format</h3>
      <div className='border border-gray-200 rounded-xl overflow-hidden mb-8'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='bg-[#F9FAFB] text-secondary-black text-xs uppercase'>
              <th className='text-left font-medium px-4 py-3'>No.</th>
              <th className='text-left font-medium px-4 py-3'>Section</th>
              <th className='text-left font-medium px-4 py-3'>Questions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, i) => (
              <tr key={section.id} className='border-t border-gray-100'>
                <td className='px-4 py-3 text-secondary-black'>{i + 1}</td>
                <td className='px-4 py-3 text-primary-black font-medium'>{section.name}</td>
                <td className='px-4 py-3 text-secondary-black'>{section.question_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='flex justify-end'>
        <Link href={`/assessment-invite/${token}/details`}>
          <DaisyButton color='primary' className='text-white gap-2'>
            Continue <ArrowRight className='h-4 w-4' />
          </DaisyButton>
        </Link>
      </div>
    </InviteShell>
  );
};

export default AssessmentInvitePage;
