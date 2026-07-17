"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  ListOrdered,
  Maximize,
  Clipboard,
  MousePointerClick,
  Code2,
  Eye,
  ShieldCheck,
} from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import BrandLink from "@/app/common/components/BrandLink";
import { createProctoringSession } from "@/app/common/services/assessment-invite-client";
import { useInviteFlow } from "../_components/InviteFlowProvider";

const ReadyPage = () => {
  const router = useRouter();
  const { token, assessment_title, sections, proctoring, setProctoringSessionId } = useInviteFlow();
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  const measures: { Icon: typeof Maximize; text: string }[] = [
    { Icon: ShieldCheck, text: "Work independently. External help is not permitted." },
    {
      Icon: ListOrdered,
      text:
        sections.length > 1
          ? `You'll go through ${sections.length} sections, one at a time -- finish a section before moving to the next.`
          : "Answer every question to the best of your ability.",
    },
    { Icon: CheckCircle2, text: "Once you submit a section, you can't go back and change it." },
  ];
  if (proctoring?.require_fullscreen) {
    measures.push({
      Icon: Maximize,
      text: "This assessment must be taken in fullscreen mode. Exiting fullscreen will be recorded.",
    });
  }
  if (proctoring?.copy_paste_blocked) {
    measures.push({ Icon: Clipboard, text: "Copy and paste are disabled during this assessment." });
  }
  if (proctoring?.right_click_blocked) {
    measures.push({ Icon: MousePointerClick, text: "Right-clicking is disabled while the assessment is being taken." });
  }
  if (proctoring?.devtools_detection_enabled) {
    measures.push({ Icon: Code2, text: "Opening browser developer tools will be flagged." });
  }
  if (proctoring) {
    measures.push({ Icon: Eye, text: "Tab switching and leaving this window will be detected and recorded." });
  }

  const handleBegin = async () => {
    setStarting(true);

    if (proctoring?.require_fullscreen && document.documentElement.requestFullscreen) {
      try {
        // Race against a timeout -- requestFullscreen() can hang indefinitely
        // in some browser contexts (no user-activation, embedded frames,
        // certain automation/headless setups) instead of cleanly rejecting.
        // Proctoring must never block the candidate, so give up after 2s.
        await Promise.race([
          document.documentElement.requestFullscreen(),
          new Promise((_, reject) => setTimeout(reject, 2000)),
        ]);
      } catch {
        // Not supported, denied, or timed out -- never blocks the candidate, just proceeds without it.
      }
    }

    if (proctoring?.proctoring_enabled) {
      const session = await createProctoringSession(token);
      if (session) {
        setProctoringSessionId(session.sessionId);
      } else {
        toast.error("Couldn't start proctoring -- continuing without it.");
      }
    }

    router.push(`/assessment-invite/${token}/take`);
  };

  return (
    <div className='min-h-screen w-full bg-white flex flex-col'>
      <header className='w-full px-6 md:px-10 py-5'>
        <BrandLink containerClassName='block w-fit' />
      </header>

      <div className='flex-1 flex items-center justify-center px-6 py-16'>
        <div className='max-w-lg w-full text-center'>
          <p className='text-sm font-semibold text-primary uppercase tracking-wide mb-3'>{assessment_title}</p>

          <h2 className='text-2xl md:text-3xl font-bold text-primary-black mb-2'>
            Take a breath, we&apos;re setting things up
          </h2>
          <p className='text-secondary-black mb-10'>
            {proctoring
              ? "Here's what's being monitored to keep things fair for everyone."
              : "Here are a few quick reminders to help keep things fair for everyone."}
          </p>

          <div className='space-y-5 mb-8 text-left'>
            {measures.map(({ Icon, text }, i) => (
              <div key={i} className='flex items-center gap-4'>
                <div className='h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
                  <Icon className='h-4 w-4 text-primary' />
                </div>
                <p className='text-primary-black text-sm md:text-base'>{text}</p>
              </div>
            ))}
          </div>

          {proctoring && (
            <div className='rounded-lg bg-[#F8FAFC] border border-[#EAEEF5] p-4 mb-8 text-left space-y-2'>
              <p className='text-xs text-secondary-black flex items-start gap-2'>
                <ShieldCheck className='h-3.5 w-3.5 text-primary shrink-0 mt-0.5' />
                Your activity is monitored. All flags are reviewed by the recruiter before any decisions are made.
              </p>
              <p className='text-xs text-secondary-black flex items-start gap-2'>
                <ShieldCheck className='h-3.5 w-3.5 text-primary shrink-0 mt-0.5' />
                AI monitoring assists the recruiter -- it does not automatically disqualify you.
              </p>
            </div>
          )}

          <label className='flex items-start gap-2.5 text-left mb-6 cursor-pointer'>
            <input
              type='checkbox'
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className='checkbox checkbox-sm checkbox-primary mt-0.5'
            />
            <span className='text-sm text-primary-black'>I understand and agree to the assessment conditions</span>
          </label>

          <p className='text-success text-sm mb-4 flex items-center justify-center gap-1.5 font-medium'>
            <CheckCircle2 className='h-4 w-4' /> You&apos;re all set!
          </p>
          <DaisyButton
            color='primary'
            className='text-white px-10'
            disabled={!agreed}
            loading={starting}
            onClick={handleBegin}
          >
            {starting ? "" : "Begin assessment"}
          </DaisyButton>
        </div>
      </div>
    </div>
  );
};

export default ReadyPage;
