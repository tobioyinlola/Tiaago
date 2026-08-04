import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";

import { cn } from "@/app/common/utils";
import type { AIInterviewListRow } from "@/app/common/services/ai-interviews";
import { formatDateTime, recommendationMeta, scoreTone } from "../ai-interviews.constants";

const initials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");

const badgeBase = "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap";

const STATUS_LABEL: Record<string, string> = {
  INVITED: "Invited",
  SCHEDULED: "Scheduled",
  WAITING: "Waiting",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  NO_SHOW: "No show",
  ABANDONED: "Abandoned",
  FAILED: "Failed",
};

const AIInterviewCard = ({ interview }: { interview: AIInterviewListRow }) => {
  const recommendation = interview.recommendation ? recommendationMeta[interview.recommendation] : null;

  return (
    <Link
      href={`/recruiter/dashboard/ai-interviews/${interview.id}`}
      className='bg-white border border-[#EAECF0] rounded-2lg p-5 hover:shadow-card-hover hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center gap-4'
    >
      <div className='flex items-start gap-3 flex-1 min-w-0'>
        <div className='w-10 h-10 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0'>
          {initials(interview.candidate_name)}
        </div>

        <div className='min-w-0 flex-1'>
          <h3 className='text-primaryBlack text-base font-semibold truncate'>
            {interview.candidate_name || "Unknown candidate"}
          </h3>
          <p className='text-secondary-black text-sm truncate'>{interview.job_title || "Untitled role"}</p>

          <div className='flex items-center gap-x-4 gap-y-1 flex-wrap mt-2 text-xs text-secondary-black'>
            <span className='flex items-center gap-1.5'>
              <Clock className='w-3.5 h-3.5' />
              {interview.completed_at ? `Completed ${formatDateTime(interview.completed_at)}` : formatDateTime(interview.created_at)}
            </span>
            <span className={cn(badgeBase, "bg-[#F5F6F7] text-secondary-black")}>
              {STATUS_LABEL[interview.status] ?? interview.status}
            </span>
          </div>

          <div className='flex items-center gap-2 flex-wrap mt-3'>
            {interview.summary_status === "GENERATING" && (
              <span className={cn(badgeBase, "inline-flex items-center gap-1 bg-badge-purple-bg text-badge-purple-text")}>
                <Sparkles className='w-3 h-3' />
                Scoring in progress
              </span>
            )}
            {recommendation && <span className={cn(badgeBase, recommendation.className)}>{recommendation.label}</span>}
            {interview.overall_score !== null && (
              <span className={cn("text-sm font-semibold", scoreTone(interview.overall_score))}>
                {Math.round(interview.overall_score)}/100
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AIInterviewCard;
