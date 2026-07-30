import { format, formatDistanceToNowStrict } from "date-fns";

import {
  InterviewRecommendation,
  QuestionType,
  RecruiterInterviewTab,
} from "@/app/common/types";

export const INTERVIEW_TABS: {
  name: RecruiterInterviewTab;
  label: string;
}[] = [
  { name: "upcoming", label: "Upcoming" },
  { name: "live", label: "Live" },
  { name: "needs_review", label: "Needs Review" },
  { name: "completed", label: "Completed" },
];

/** How long before the scheduled start a recruiter can open the room from the
 * Upcoming tab. Kept here so the button and its subtext can't drift apart. */
export const JOIN_WINDOW_MINUTES = 30;

export const parseInterviewTab = (
  value: string | string[] | undefined
): RecruiterInterviewTab => {
  const tab = Array.isArray(value) ? value[0] : value;
  return INTERVIEW_TABS.some(({ name }) => name === tab)
    ? (tab as RecruiterInterviewTab)
    : "upcoming";
};

/** Combines the API's separate date ("YYYY-MM-DD") and time ("HH:MM:SS")
 * fields into a single local Date. Returns null for malformed values so
 * callers can fall back to the raw strings rather than render "Invalid Date". */
export const parseInterviewStart = (
  meetingDate: string,
  startTime: string
): Date | null => {
  const [year, month, day] = (meetingDate || "").split("-").map(Number);
  const [hours, minutes, seconds] = (startTime || "").split(":").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(
    year,
    month - 1,
    day,
    hours || 0,
    minutes || 0,
    seconds || 0
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

/** e.g. "Aug 1, 2026 · 2:00 PM" */
export const formatInterviewStart = (meetingDate: string, startTime: string) => {
  const date = parseInterviewStart(meetingDate, startTime);
  if (!date) return `${meetingDate} ${startTime}`.trim();
  return `${format(date, "MMM d, yyyy")} · ${format(date, "h:mm a")}`;
};

export const recommendationMeta: Record<
  InterviewRecommendation,
  { label: string; className: string }
> = {
  STRONG_YES: {
    label: "Strong yes",
    className: "bg-badge-green-bg text-badge-green-text",
  },
  YES: { label: "Yes", className: "bg-badge-green-bg text-badge-green-text" },
  MAYBE: { label: "Maybe", className: "bg-[#F5F6F7] text-secondary-black" },
  NO: { label: "No", className: "bg-destructive/10 text-destructive" },
  STRONG_NO: {
    label: "Strong no",
    className: "bg-destructive/10 text-destructive",
  },
};

export const interviewTypeLabel: Record<string, string> = {
  IN_HOUSE: "In-house",
  GOOGLE_MEET: "Google Meet",
};

export const emptyStateText: Record<RecruiterInterviewTab, string> = {
  upcoming: "No upcoming interviews",
  live: "No interviews are live right now",
  needs_review: "Nothing waiting on your review",
  completed: "No completed interviews yet",
};

export const emptyStateSubText: Record<RecruiterInterviewTab, string> = {
  upcoming: "Interviews you schedule with candidates will show up here.",
  live: "Once an interview starts you'll be able to join it from here.",
  needs_review:
    "Interviews you've wrapped up but not yet decided on will appear here.",
  completed: "Interviews you've submitted a decision for will appear here.",
};

/** "in 2 hours" / "3 days ago" -- used for the prep page's "Interview in
 * [time]" tag and the Needs Review tab's "Ended [time] ago". */
export const formatRelativeTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const isFuture = date.getTime() > Date.now();
  const distance = formatDistanceToNowStrict(date);
  return isFuture ? `in ${distance}` : `${distance} ago`;
};

/** "Applied Jul 20, 2026" */
export const formatApplicationDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : format(date, "MMM d, yyyy");
};

export const assessmentScoreBand = (
  score: number | null | undefined
): { label: string; className: string } | null => {
  if (score === null || score === undefined) return null;
  if (score >= 70) {
    return { label: "Strong assessment", className: "bg-success/10 text-success" };
  }
  if (score >= 40) {
    return { label: "Moderate assessment", className: "bg-amber-50 text-amber-700" };
  }
  return { label: "Weak assessment", className: "bg-destructive/10 text-destructive" };
};

export const questionTypeLabel: Record<QuestionType, string> = {
  OPENER: "Opener",
  BEHAVIOURAL: "Behavioural",
  SITUATIONAL: "Situational",
  TECHNICAL: "Technical",
  CLOSER: "Closer",
};

/** Number-badge + left-border colour per question type, per the prep-page
 * spec: OPENER grey, BEHAVIOURAL blue, SITUATIONAL purple, TECHNICAL green,
 * CLOSER navy. */
export const questionTypeStyles: Record<
  QuestionType,
  { badge: string; border: string }
> = {
  OPENER: { badge: "bg-[#F5F6F7] text-secondary-black", border: "border-l-[#9CA3AF]" },
  BEHAVIOURAL: { badge: "bg-badge-blue-bg text-badge-blue-text", border: "border-l-[#3E92CC]" },
  SITUATIONAL: { badge: "bg-badge-purple-bg text-badge-purple-text", border: "border-l-[#A78BFA]" },
  TECHNICAL: { badge: "bg-badge-green-bg text-badge-green-text", border: "border-l-success" },
  CLOSER: { badge: "bg-deep-blue/10 text-deep-blue", border: "border-l-deep-blue" },
};

export const sourceLabel: Record<"RESUME" | "ASSESSMENT" | "BOTH", string> = {
  RESUME: "Resume",
  ASSESSMENT: "Assessment",
  BOTH: "Both",
};
