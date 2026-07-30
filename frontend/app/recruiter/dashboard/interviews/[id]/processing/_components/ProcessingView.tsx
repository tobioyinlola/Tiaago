"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Sparkles } from "lucide-react";

import { ID, InterviewProcessingStatus, PipelineStepStatus } from "@/app/common/types";
import { getInterviewProcessingStatus } from "@/app/common/services/interview-workspace";
import { cn } from "@/app/common/utils";

const POLL_INTERVAL_MS = 3000;

const STEPS: { key: keyof InterviewProcessingStatus; label: string }[] = [
  { key: "transcription_status", label: "Compiling transcript" },
  { key: "summary_status", label: "Generating AI summary" },
  { key: "feedback_status", label: "Preparing candidate feedback" },
];

const StepIcon = ({ status }: { status: PipelineStepStatus | undefined }) => {
  if (status === "READY") return <CheckCircle2 className='w-4 h-4 text-success shrink-0' />;
  if (status === "FAILED") return <AlertTriangle className='w-4 h-4 text-amber-500 shrink-0' />;
  return <Circle className='w-4 h-4 text-secondary-black/40 shrink-0 animate-pulse' />;
};

const ProcessingView = ({ interviewId }: { interviewId: ID }) => {
  const router = useRouter();
  const [status, setStatus] = useState<InterviewProcessingStatus | null>(null);
  const [failedToLoad, setFailedToLoad] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const result = await getInterviewProcessingStatus(interviewId);
      if (cancelled) return;
      if (!result.success) {
        setFailedToLoad(true);
        return;
      }
      setStatus(result.data);
      if (result.data.all_done && !redirected.current) {
        redirected.current = true;
        setTimeout(() => {
          if (!cancelled) router.push(`/recruiter/dashboard/interviews/${interviewId}/review`);
        }, 2500);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [interviewId, router]);

  const hasFailure = status && STEPS.some(s => status[s.key] === "FAILED");

  return (
    <div className='fixed inset-0 bg-[#F8FAFC] flex items-center justify-center p-6'>
      <div className='max-w-md w-full flex flex-col items-center text-center gap-6'>
        <div className='w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center'>
          <Sparkles className='w-7 h-7 text-primary animate-pulse' />
        </div>

        <div>
          <h1 className='text-2xl font-space-grotesk font-semibold text-primaryBlack'>
            Great interview.
          </h1>
          <p className='text-secondary-black mt-1'>We are preparing your summary.</p>
        </div>

        <div className='w-full flex flex-col gap-3 items-start bg-white border border-[#EAECF0] rounded-2lg p-5'>
          <div className='flex items-center gap-2.5'>
            <CheckCircle2 className='w-4 h-4 text-success shrink-0' />
            <span className='text-sm text-primaryBlack'>Interview ended</span>
          </div>
          {STEPS.map(step => (
            <div key={step.key} className='flex items-center gap-2.5'>
              <StepIcon status={status?.[step.key] as PipelineStepStatus | undefined} />
              <span
                className={cn(
                  "text-sm",
                  status?.[step.key] === "READY" ? "text-primaryBlack" : "text-secondary-black"
                )}
              >
                {step.label}
                {status?.[step.key] === "FAILED" && " -- couldn't complete, you can retry from the review page"}
              </span>
            </div>
          ))}
        </div>

        {failedToLoad && (
          <p className='text-xs text-secondary-black'>
            Having trouble checking progress. This page will keep retrying.
          </p>
        )}

        {status?.all_done && (
          <div className='flex flex-col items-center gap-4 animate-[fadeIn_0.4s_ease]'>
            <div>
              <p className='text-sm text-primaryBlack font-medium'>
                {hasFailure ? "Mostly ready -- a couple of steps need a retry." : "Everything's ready."}
              </p>
              <p className='text-sm text-secondary-black'>Taking you to the review page…</p>
            </div>
            <div className='flex items-center gap-3'>
              <Link
                href={`/recruiter/dashboard/interviews/${interviewId}`}
                className='btn btn-outline btn-sm rounded-lg'
              >
                View interview notes
              </Link>
              <Link
                href={`/recruiter/dashboard/interviews/${interviewId}/review`}
                className='btn btn-primary btn-sm text-white rounded-lg'
              >
                Continue to review
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingView;
