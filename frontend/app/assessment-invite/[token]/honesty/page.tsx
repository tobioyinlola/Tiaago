"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Chrome, Maximize, MonitorX } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import InviteShell from "../_components/InviteShell";
import { useInviteFlow } from "../_components/InviteFlowProvider";

const RULES = [
  { Icon: Maximize, text: "Don't exit full-screen mode once the assessment has started." },
  { Icon: MonitorX, text: "Don't move away from this tab or interact with other tools." },
  { Icon: Chrome, text: "Don't use any AI tools (ChatGPT, AI agents, browser extensions)." },
];

const HonestyPage = () => {
  const router = useRouter();
  const { token, candidate_name, setHonestyAgreementAccepted } = useInviteFlow();
  const [accepted, setAccepted] = useState(false);

  const handleContinue = () => {
    if (!accepted) return;
    setHonestyAgreementAccepted(true);
    // Phase 1 proctoring has no webcam step -- the mandatory camera-permission
    // pre-check (environment/) is skipped entirely, straight to the briefing.
    router.push(`/assessment-invite/${token}/ready`);
  };

  return (
    <InviteShell step={3}>
      <h2 className='text-lg font-bold text-primary-black mb-1'>Honesty agreement</h2>
      <p className='text-secondary-black text-sm mb-6'>
        These apply unless the recruiter has stated otherwise.
      </p>

      <div className='bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6'>
        <p className='text-primary-black text-sm mb-4'>
          I,{" "}
          <span className='bg-primary/15 text-primary font-semibold px-1.5 py-0.5 rounded'>
            {candidate_name}
          </span>
          , confirm that I have read and agree to the assessment rules.
        </p>
        <div className='space-y-3'>
          {RULES.map(({ Icon, text }) => (
            <div key={text} className='flex items-start gap-3 text-sm text-secondary-black'>
              <Icon className='h-4 w-4 shrink-0 mt-0.5 text-primary' />
              {text}
            </div>
          ))}
        </div>
      </div>

      <label className='flex items-start gap-3 mb-8 cursor-pointer'>
        <input
          type='checkbox'
          checked={accepted}
          onChange={e => setAccepted(e.target.checked)}
          className='mt-1 h-4 w-4 rounded border-gray-300 accent-primary'
        />
        <span className='text-sm text-secondary-black'>
          I, <span className='font-semibold text-primary-black'>{candidate_name}</span>, understand
          the rules, accept the consequences of breaking them, and agree to follow them.
        </span>
      </label>

      <div className='flex justify-between pt-6 border-t border-gray-100'>
        <DaisyButton
          type='button'
          color='ghost'
          onClick={() => router.back()}
          className='border border-gray-200'
        >
          Back
        </DaisyButton>
        <DaisyButton
          type='button'
          color='primary'
          className='text-white gap-2'
          disabled={!accepted}
          onClick={handleContinue}
        >
          Accept and continue <ArrowRight className='h-4 w-4' />
        </DaisyButton>
      </div>
    </InviteShell>
  );
};

export default HonestyPage;
