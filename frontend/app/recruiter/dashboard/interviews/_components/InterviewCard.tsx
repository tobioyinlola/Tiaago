import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Clock, Video, Circle, Sparkles, UserRound } from "lucide-react";

import { cn } from "@/app/common/utils";
import { RecruiterInterview, RecruiterInterviewTab } from "@/app/common/types";
import InterviewJoinButton from "./InterviewJoinButton";
import {
  formatInterviewStart,
  interviewTypeLabel,
  parseInterviewStart,
  recommendationMeta,
} from "../interviews.constants";

const initials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");

const badgeBase = "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap";

const PrepBadge = ({ ready }: { ready: boolean }) => (
  <span
    className={cn(
      badgeBase,
      "inline-flex items-center gap-1",
      ready
        ? "bg-badge-green-bg text-badge-green-text"
        : "bg-[#F5F6F7] text-secondary-black"
    )}
  >
    <Sparkles className='w-3 h-3' />
    {ready ? "Brief ready" : "Not prepared"}
  </span>
);

const LiveBadge = () => (
  <span
    className={cn(
      badgeBase,
      "inline-flex items-center gap-1.5 bg-success/10 text-success"
    )}
  >
    <span className='relative flex w-2 h-2'>
      <span className='absolute inline-flex w-full h-full rounded-full bg-success opacity-75 animate-ping' />
      <span className='relative inline-flex w-2 h-2 rounded-full bg-success' />
    </span>
    Live
  </span>
);

const relativeEndedAt = (endedAt?: string | null) => {
  if (!endedAt) return null;
  const date = new Date(endedAt);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
};

const formatScore = (score?: number | string | null) => {
  if (score === null || score === undefined || score === "") return null;
  const value = Number(score);
  return Number.isNaN(value) ? null : `${Math.round(value)}%`;
};

const InterviewCard = ({
  interview,
  tab,
}: {
  interview: RecruiterInterview;
  tab: RecruiterInterviewTab;
}) => {
  const workspaceHref = `/recruiter/dashboard/interviews/${interview.id}`;
  const prepareHref = `${workspaceHref}/prepare`;
  const startsAt = parseInterviewStart(
    interview.meeting_date,
    interview.start_time
  );
  const endedAgo = relativeEndedAt(interview.ended_at);
  const score = formatScore(interview.overall_score);
  const recommendation = interview.recommendation
    ? recommendationMeta[interview.recommendation]
    : null;

  return (
    <div className='bg-white border border-[#EAECF0] rounded-2lg p-5 hover:shadow-card-hover hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center gap-4'>
      <div className='flex items-start gap-3 flex-1 min-w-0'>
        <div className='w-10 h-10 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0'>
          {initials(interview.candidate_name)}
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h3 className='text-primaryBlack text-base font-semibold truncate'>
              {interview.candidate_name || "Unknown candidate"}
            </h3>
            {tab === "live" && <LiveBadge />}
          </div>

          <p className='text-secondary-black text-sm truncate'>
            {interview.job_title || "Untitled role"}
          </p>

          <div className='flex items-center gap-x-4 gap-y-1 flex-wrap mt-2 text-xs text-secondary-black'>
            <span className='flex items-center gap-1.5'>
              <Clock className='w-3.5 h-3.5' />
              {tab === "needs_review" && endedAgo
                ? `Ended ${endedAgo}`
                : formatInterviewStart(
                    interview.meeting_date,
                    interview.start_time
                  )}
            </span>
            <span className='flex items-center gap-1.5'>
              <Video className='w-3.5 h-3.5' />
              {interviewTypeLabel[interview.interview_type] ??
                interview.interview_type}
              {" · "}
              {interview.duration_minutes}m
            </span>
            {interview.recording_enabled && (
              <span className='flex items-center gap-1.5'>
                <Circle className='w-3 h-3 fill-current' />
                Recording on
              </span>
            )}
          </div>

          <div className='flex items-center gap-2 flex-wrap mt-3'>
            <PrepBadge ready={interview.prep_ready} />
            {recommendation && (
              <span className={cn(badgeBase, recommendation.className)}>
                {recommendation.label}
              </span>
            )}
            {tab === "completed" && !recommendation && (
              <span className={cn(badgeBase, "bg-[#F5F6F7] text-secondary-black")}>
                No decision recorded
              </span>
            )}
            {score && (
              <span
                className={cn(badgeBase, "bg-badge-blue-bg text-badge-blue-text")}
              >
                {score}
              </span>
            )}
            {tab === "live" && interview.candidate_waiting && (
              <span
                className={cn(
                  badgeBase,
                  "inline-flex items-center gap-1 bg-badge-purple-bg text-badge-purple-text"
                )}
              >
                <UserRound className='w-3 h-3' />
                Candidate is waiting
              </span>
            )}
          </div>
        </div>
      </div>

      <div className='flex items-center gap-2 shrink-0 sm:pl-4'>
        <Link
          href={prepareHref}
          className='btn btn-sm btn-outline btn-primary rounded-lg'
        >
          Prepare
        </Link>

        {tab === "upcoming" ? (
          <InterviewJoinButton
            id={interview.id}
            startsAt={startsAt ? startsAt.getTime() : null}
          />
        ) : (
          <Link
            href={workspaceHref}
            className='btn btn-sm btn-primary text-white rounded-lg gap-1.5 border-none'
          >
            <Video className='w-3.5 h-3.5' />
            {/* The interview is already over on the review/completed tabs, so
                "join" would be a lie -- same destination, honest label. */}
            {tab === "live" ? "Join Interview" : "Open Interview"}
          </Link>
        )}
      </div>
    </div>
  );
};

export default InterviewCard;
