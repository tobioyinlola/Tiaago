"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ID } from "@/app/common/types";
import { getRecruiterAIInterviewDetail, type AIInterviewDetail } from "@/app/common/services/ai-interviews";
import AIInterviewReportBody from "./AIInterviewReportBody";

const AIInterviewReviewView = ({ interviewId, initialDetail }: { interviewId: ID; initialDetail: AIInterviewDetail }) => {
  const [interview, setInterview] = useState<AIInterviewDetail>(initialDetail);

  const isGenerating = interview.summary_status === "PENDING" || interview.summary_status === "GENERATING";

  // Scoring runs async server-side (see ai_interviews.tasks.process_completed_ai_interview_task)
  // -- poll until it lands, matching the spec's "auto-refresh every 5s while pending" loading state.
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(async () => {
      const res = await getRecruiterAIInterviewDetail(interviewId);
      if (res.success) setInterview(res.data);
    }, 5000);
    return () => clearInterval(interval);
  }, [isGenerating, interviewId]);

  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8 dashboard-content-constraint'>
      <div className='flex items-center gap-4 border-b border-gray-200 pb-4'>
        <Link
          href='/recruiter/dashboard/ai-interviews'
          className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F6F7] shrink-0'
        >
          <ArrowLeft className='w-4 h-4 text-primaryBlack' />
        </Link>
        <div>
          <h1 className='text-xl font-space-grotesk font-semibold'>{interview.candidate_name}</h1>
          <p className='text-secondary-black text-sm'>
            {interview.job_title} &middot; {interview.company_name}
          </p>
        </div>
      </div>

      <AIInterviewReportBody interviewId={interviewId} interview={interview} onChange={setInterview} />
    </div>
  );
};

export default AIInterviewReviewView;
