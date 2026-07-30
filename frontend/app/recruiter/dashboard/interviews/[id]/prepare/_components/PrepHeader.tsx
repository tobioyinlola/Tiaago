"use client";

import Link from "next/link";
import { RefreshCw, Video } from "lucide-react";

import { ID, InterviewPrepHeader } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import {
  assessmentScoreBand,
  formatApplicationDate,
  formatRelativeTime,
} from "../../../interviews.constants";

const initials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");

const PrepHeader = ({
  interviewId,
  header,
  onRegenerate,
  regenerating,
}: {
  interviewId: ID;
  header?: InterviewPrepHeader;
  onRegenerate: () => void;
  regenerating: boolean;
}) => {
  const scoreBand = assessmentScoreBand(header?.assessment_score ?? null);
  const applicationDate = formatApplicationDate(header?.application_date);
  const startHref = `/recruiter/dashboard/interviews/${interviewId}/session`;

  return (
    <>
      <div className='bg-white border border-[#EAECF0] rounded-2lg p-6 flex flex-col sm:flex-row sm:items-start gap-5'>
        <div className='w-14 h-14 rounded-full bg-primary/10 text-primary text-lg font-semibold flex items-center justify-center shrink-0'>
          {initials(header?.candidate_name)}
        </div>

        <div className='min-w-0 flex-1'>
          <h1 className='text-xl font-space-grotesk font-semibold text-primaryBlack truncate'>
            {header?.candidate_name || "Unknown candidate"}
          </h1>
          <p className='text-sm text-secondary-black truncate'>
            {header?.job_title || "Untitled role"}
          </p>
          <div className='flex items-center gap-2 flex-wrap mt-3'>
            {applicationDate && (
              <span className='text-xs text-secondary-black'>Applied {applicationDate}</span>
            )}
            {scoreBand && (
              <span
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap",
                  scoreBand.className
                )}
              >
                {scoreBand.label}
              </span>
            )}
            {header?.scheduled_at && (
              <span className='text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F6F7] text-secondary-black whitespace-nowrap'>
                Interview {formatRelativeTime(header.scheduled_at)}
              </span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2 shrink-0'>
          <button
            type='button'
            onClick={onRegenerate}
            disabled={regenerating}
            className='btn btn-outline btn-sm rounded-lg gap-1.5'
          >
            <RefreshCw className={cn("w-3.5 h-3.5", regenerating && "animate-spin")} />
            Regenerate brief
          </button>
          <Link
            href={startHref}
            className='btn btn-sm rounded-lg gap-1.5 !bg-success !text-white border-none hover:!bg-success/90'
          >
            <Video className='w-3.5 h-3.5' />
            Start Interview
          </Link>
        </div>
      </div>

      {/* Pinned so "Start Interview" stays reachable on a long brief without scrolling back up. */}
      <Link
        href={startHref}
        className='fixed bottom-6 right-6 z-30 btn rounded-full shadow-lg gap-2 !bg-success !text-white border-none hover:!bg-success/90 max-sm:btn-circle'
        aria-label='Start Interview'
      >
        <Video className='w-4 h-4' />
        <span className='max-sm:hidden'>Start Interview</span>
      </Link>
    </>
  );
};

export default PrepHeader;
