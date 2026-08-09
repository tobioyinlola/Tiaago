"use client";

import { useEffect, useState } from "react";

import { getRecruiterAIInterviewDetail, type AIInterviewDetail } from "@/app/common/services/ai-interviews";
import AIInterviewReportBody from "@/app/recruiter/dashboard/ai-interviews/[id]/_components/AIInterviewReportBody";

const AIInterviewTab = ({ interviewId }: { interviewId: string }) => {
  const [interview, setInterview] = useState<AIInterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // react-hooks/set-state-in-effect forbids setState as a direct
    // synchronous statement in an effect body -- defer to a microtask
    // (matches the pattern already used in JobApplicationGrid/index.tsx).
    queueMicrotask(() => setLoading(true));
    getRecruiterAIInterviewDetail(interviewId).then(res => {
      if (cancelled) return;
      if (res.success) setInterview(res.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-24'>
        <span className='loading loading-spinner loading-lg text-primary' />
      </div>
    );
  }

  if (!interview) {
    return <p className='text-sm text-secondary-black p-6'>Could not load the AI interview for this candidate.</p>;
  }

  return (
    <div className='p-6'>
      <AIInterviewReportBody interviewId={interviewId} interview={interview} onChange={setInterview} />
    </div>
  );
};

export default AIInterviewTab;
