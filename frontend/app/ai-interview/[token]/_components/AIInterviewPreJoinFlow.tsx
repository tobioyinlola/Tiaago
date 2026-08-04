"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { startAIInterviewSession, type AIInterviewJoinInfo } from "@/app/common/services/ai-interviews";
import { AI_INTERVIEW_SESSION_STORAGE_KEY } from "../session/session.constants";
import AIInterviewInfoPanel from "./AIInterviewInfoPanel";
import AIInterviewSetupCheck from "./AIInterviewSetupCheck";

const AIInterviewPreJoinFlow = ({ token, interview }: { token: string; interview: AIInterviewJoinInfo }) => {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const handleStart = async (cameraEnabled: boolean) => {
    setStarting(true);
    const result = await startAIInterviewSession(token);
    if (!result.success) {
      toast.error(result.error);
      setStarting(false);
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
      <AIInterviewSetupCheck durationMinutes={interview.duration_minutes} onStart={handleStart} starting={starting} />
    </div>
  );
};

export default AIInterviewPreJoinFlow;
