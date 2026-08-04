"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ID } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { getRecruiterAIInterviewDetail, type AIInterviewDetail } from "@/app/common/services/ai-interviews";
import ScoreTile from "./ScoreTile";
import RecommendationCard from "./RecommendationCard";
import DecisionButtons from "./DecisionButtons";
import SummaryTab from "./SummaryTab";
import QuestionsTab from "./QuestionsTab";
import TranscriptTab from "./TranscriptTab";
import RecordingTab from "./RecordingTab";

type Tab = "summary" | "questions" | "transcript" | "recording";

const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "questions", label: "Questions" },
  { key: "transcript", label: "Transcript" },
  { key: "recording", label: "Recording" },
];

const AIInterviewReviewView = ({ interviewId, initialDetail }: { interviewId: ID; initialDetail: AIInterviewDetail }) => {
  const [tab, setTab] = useState<Tab>("summary");
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

      {isGenerating ? (
        <div className='flex flex-col items-center justify-center py-24 gap-4'>
          <span className='loading loading-spinner loading-lg text-primary' />
          <p className='text-secondary-black text-sm'>
            {interview.summary_status === "PENDING" ? "Waiting for the interview to finish..." : "Alex is scoring the interview..."}
          </p>
        </div>
      ) : interview.summary_status === "FAILED" ? (
        <div className='rounded-2lg border border-destructive/30 bg-destructive/5 p-6'>
          <p className='text-sm text-destructive font-medium'>{interview.summary_error || "Scoring failed for this interview."}</p>
        </div>
      ) : (
        <>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            <ScoreTile label='Overall' score={interview.overall_score} max={100} />
            <ScoreTile label='Communication' score={interview.communication_score} max={10} />
            <ScoreTile label='Confidence' score={interview.confidence_score} max={10} />
            <ScoreTile label='Clarity' score={interview.clarity_score} max={10} />
          </div>

          <RecommendationCard interview={interview} durationMinutes={interview.duration_seconds ? Math.round(interview.duration_seconds / 60) : null} />

          <DecisionButtons interviewId={interviewId} interview={interview} onDecided={setInterview} />

          <div className='flex flex-col gap-4'>
            <div className='flex border-b border-[#EAECF0] overflow-x-auto'>
              {TABS.map(t => (
                <button
                  key={t.key}
                  type='button'
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap",
                    tab === t.key ? "border-primary text-primary" : "border-transparent text-secondary-black"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div>
              {tab === "summary" && <SummaryTab interview={interview} />}
              {tab === "questions" && <QuestionsTab questions={interview.questions} />}
              {tab === "transcript" && <TranscriptTab interviewId={interviewId} candidateName={interview.candidate_name} />}
              {tab === "recording" && <RecordingTab interview={interview} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIInterviewReviewView;
