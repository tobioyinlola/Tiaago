"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { ID, InterviewReview } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import SummaryTab from "./SummaryTab";
import TranscriptReviewTab from "./TranscriptReviewTab";
import RecordingTab from "./RecordingTab";
import ScorecardReviewTab from "./ScorecardReviewTab";
import DecisionPanel from "./DecisionPanel";

type Tab = "summary" | "transcript" | "recording" | "scorecard";

const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "transcript", label: "Transcript" },
  { key: "recording", label: "Recording" },
  { key: "scorecard", label: "Scorecard" },
];

const ReviewView = ({ interviewId, initialReview }: { interviewId: ID; initialReview: InterviewReview }) => {
  const [tab, setTab] = useState<Tab>("summary");
  const [review, setReview] = useState<InterviewReview>(initialReview);

  return (
    <div className='fixed inset-0 flex flex-col bg-[#F5F6F7]'>
      <header className='h-16 shrink-0 bg-white border-b border-[#EAECF0] flex items-center gap-4 px-6'>
        <Link
          href='/recruiter/dashboard/interviews'
          className='w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F6F7] shrink-0'
        >
          <ArrowLeft className='w-4 h-4 text-primaryBlack' />
        </Link>
        <div className='min-w-0'>
          <p className='text-sm font-semibold text-primaryBlack truncate'>{review.candidate_name}</p>
          <p className='text-xs text-secondary-black truncate'>{review.job_title}</p>
        </div>
      </header>

      <div className='flex-1 min-h-0 flex'>
        <div className='flex-1 min-w-0 flex flex-col'>
          <div className='flex border-b border-[#EAECF0] bg-white px-6 shrink-0'>
            {TABS.map(t => (
              <button
                key={t.key}
                type='button'
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 -mb-px",
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-secondary-black"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className='flex-1 min-h-0 overflow-y-auto p-6'>
            {tab === "summary" && (
              <SummaryTab
                interviewId={interviewId}
                review={review}
                onReviewChange={setReview}
              />
            )}
            {tab === "transcript" && <TranscriptReviewTab interviewId={interviewId} />}
            {tab === "recording" && <RecordingTab review={review} />}
            {tab === "scorecard" && <ScorecardReviewTab interviewId={interviewId} />}
          </div>
        </div>

        <DecisionPanel interviewId={interviewId} review={review} onReviewChange={setReview} />
      </div>
    </div>
  );
};

export default ReviewView;
