import { format } from "date-fns";

import type { AIInterviewListTab } from "@/app/common/services/ai-interviews";

export const AI_INTERVIEW_TABS: { name: AIInterviewListTab; label: string }[] = [
  { name: "pending_review", label: "Pending Review" },
  { name: "completed", label: "Completed" },
  { name: "scheduled", label: "Scheduled" },
  { name: "no_shows", label: "No Shows" },
];

export const parseAIInterviewTab = (value: string | string[] | undefined): AIInterviewListTab => {
  const tab = Array.isArray(value) ? value[0] : value;
  return AI_INTERVIEW_TABS.some(({ name }) => name === tab) ? (tab as AIInterviewListTab) : "pending_review";
};

export const emptyStateText: Record<AIInterviewListTab, string> = {
  pending_review: "Nothing waiting on your review",
  completed: "No decisions recorded yet",
  scheduled: "No AI interviews scheduled",
  no_shows: "No no-shows",
};

export const emptyStateSubText: Record<AIInterviewListTab, string> = {
  pending_review: "AI interviews Alex has finished scoring will show up here.",
  scheduled: "Candidates invited to an AI interview will show up here until they join.",
  completed: "AI interviews you've accepted, overridden, or declined will appear here.",
  no_shows: "Candidates who never joined within their interview window will appear here.",
};

export const recommendationMeta: Record<
  "PROCEED" | "DO_NOT_PROCEED" | "NEEDS_REVIEW",
  { label: string; className: string }
> = {
  PROCEED: { label: "Proceed", className: "bg-badge-green-bg text-badge-green-text" },
  DO_NOT_PROCEED: { label: "Do not proceed", className: "bg-destructive/10 text-destructive" },
  NEEDS_REVIEW: { label: "Needs review", className: "bg-amber-50 text-amber-700" },
};

export const scoreTone = (score: number | null) => {
  if (score === null || score === undefined) return "text-secondary-black";
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-badge-blue-text";
  if (score >= 40) return "text-amber-600";
  return "text-destructive";
};

export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "--";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "--" : format(date, "MMM d, yyyy · h:mm a");
};
