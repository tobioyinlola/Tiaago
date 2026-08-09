"use client";

import { useState } from "react";

import { ID } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import type { AIInterviewDetail } from "@/app/common/services/ai-interviews";
import ScoreTile from "./ScoreTile";
import RecommendationCard from "./RecommendationCard";
import RecruiterNotes from "./RecruiterNotes";
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

const AIInterviewReportBody = ({
  interviewId,
  interview,
  onChange,
}: {
  interviewId: ID;
  interview: AIInterviewDetail;
  onChange: (interview: AIInterviewDetail) => void;
}) => {
  const [tab, setTab] = useState<Tab>("summary");

  const isGenerating = interview.summary_status === "PENDING" || interview.summary_status === "GENERATING";

  if (isGenerating) {
    return (
      <div className='flex flex-col items-center justify-center py-24 gap-4'>
        <span className='loading loading-spinner loading-lg text-primary' />
        <p className='text-secondary-black text-sm'>
          {interview.summary_status === "PENDING" ? "Waiting for the interview to finish..." : "Alex is scoring the interview..."}
        </p>
      </div>
    );
  }

  if (interview.summary_status === "FAILED") {
    return (
      <div className='rounded-2lg border border-destructive/30 bg-destructive/5 p-6'>
        <p className='text-sm text-destructive font-medium'>{interview.summary_error || "Scoring failed for this interview."}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 sm:gap-8'>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <ScoreTile label='Overall' score={interview.overall_score} max={100} />
        <ScoreTile label='Communication' score={interview.communication_score} max={10} />
        <ScoreTile label='Confidence' score={interview.confidence_score} max={10} />
        <ScoreTile label='Clarity' score={interview.clarity_score} max={10} />
      </div>

      <RecommendationCard interview={interview} durationMinutes={interview.duration_seconds ? Math.round(interview.duration_seconds / 60) : null} />

      <RecruiterNotes interviewId={interviewId} interview={interview} onSaved={onChange} />

      <DecisionButtons interviewId={interviewId} interview={interview} onDecided={onChange} />

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
    </div>
  );
};

export default AIInterviewReportBody;
