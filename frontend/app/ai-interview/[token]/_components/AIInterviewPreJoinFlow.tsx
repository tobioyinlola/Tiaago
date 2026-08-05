"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { startAIInterviewSession, type AIInterviewJoinInfo } from "@/app/common/services/ai-interviews";
import { AI_INTERVIEW_SESSION_STORAGE_KEY } from "../session/session.constants";
import AIInterviewInfoPanel from "./AIInterviewInfoPanel";
import AIInterviewSetupCheck from "./AIInterviewSetupCheck";

// How often to re-check for a free slot while queued (the interview_agent
// fleet is already at AI_INTERVIEW_MAX_CONCURRENT_SESSIONS) -- interviews are
// short, so a coarse retry loop is enough, no persistent queue/websocket.
const QUEUE_RETRY_MS = 15000;

const AIInterviewPreJoinFlow = ({ token, interview }: { token: string; interview: AIInterviewJoinInfo }) => {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | undefined>(undefined);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const handleStart = async (cameraEnabled: boolean) => {
    setStarting(true);
    setStatusLabel(undefined);
    const result = await startAIInterviewSession(token);
    if (cancelledRef.current) return;

    if (!result.success) {
      toast.error(result.error);
      setStarting(false);
      setStatusLabel(undefined);
      return;
    }

    if (result.data.queued) {
      const { position } = result.data;
      toast.info(
        position <= 1
          ? "All interview slots are busy right now -- we'll connect you the moment one frees up."
          : `All interview slots are busy right now -- you're #${position} in line, we'll connect you shortly.`
      );
      setStatusLabel("Waiting for a free slot...");
      retryTimeoutRef.current = setTimeout(() => {
        if (!cancelledRef.current) handleStart(cameraEnabled);
      }, QUEUE_RETRY_MS);
      return;
    }

    window.sessionStorage.setItem(
      AI_INTERVIEW_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...result.data,
        cameraEnabled,
        candidateFirstName: interview.candidate_first_name,
        jobTitle: interview.job_title,
        companyName: interview.company_name,
        durationMinutes: interview.duration_minutes,
        questionsTotal: interview.questions_total,
      })
    );
    router.push(`/ai-interview/${token}/session`);
  };

  return (
    <div className='min-h-[100svh] w-full flex flex-col lg:flex-row'>
      <AIInterviewInfoPanel interview={interview} />
      <AIInterviewSetupCheck
        durationMinutes={interview.duration_minutes}
        onStart={handleStart}
        starting={starting}
        statusLabel={statusLabel}
      />
    </div>
  );
};

export default AIInterviewPreJoinFlow;
