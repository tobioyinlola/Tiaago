import { AiFeedbackItem } from "@/app/common/types";

const CLOSED_STATUSES = new Set(["OFFER_ACCEPTED", "OFFER_DECLINED", "WITHDRAWN"]);

// Buckets a candidate into one of the 8 board columns -- see
// getBoardColumns in index.tsx for the full column list.
export const getColumnKey = (item: AiFeedbackItem): string => {
  if (item.status === "APPLIED") {
    const stillScreening = item.resume_screening_status === "started" || item.resume_screening_status === "failed";
    return stillScreening ? "RESUME_SCREENING" : "APPLIED";
  }
  if (CLOSED_STATUSES.has(item.status)) return "CLOSED";
  return item.status;
};

// Canonical forward progression through the recruiter-driven pipeline.
// REJECTED is deliberately absent -- it's a terminal decision that's valid
// from any active stage, not a step in the funnel -- and CLOSED (the
// talent-only outcomes) is absent because a recruiter can never move a
// candidate into or out of it.
// AI_INTERVIEW and PENDING_DECISION share rank 2: PENDING_DECISION is the
// legacy "invited to interview" stage that pre-dates the split into separate
// AI and human interview stages, and candidates applied to before that split
// are still sitting in it.
const STAGE_ORDER: Record<string, number> = {
  APPLIED: 0,
  RESUME_SCREENING: 0,
  REVIEWED: 1,
  PENDING_DECISION: 2,
  AI_INTERVIEW: 2,
  INTERVIEW_SCHEDULED: 3,
  HUMAN_INTERVIEW: 4,
  INTERVIEW_COMPLETED: 5,
  SECOND_INTERVIEW: 6,
  OFFER_EXTENDED: 7,
};

// Stages a candidate can never be moved out of by a recruiter -- REJECTED
// requires a separate, explicit "un-reject" flow that doesn't exist yet,
// and CLOSED outcomes are the candidate's own decision.
const LOCKED_STAGES = new Set(["REJECTED", "CLOSED"]);

export const isStageLocked = (item: AiFeedbackItem): boolean => LOCKED_STAGES.has(getColumnKey(item));

// True if moving `item` to `toStatus` would walk it backward through the
// pipeline (or move it at all out of a locked stage). Used to block both
// drag-and-drop drops and the "Move to..." select.
export const isBackwardMove = (item: AiFeedbackItem, toStatus: string): boolean => {
  const fromKey = getColumnKey(item);
  if (LOCKED_STAGES.has(fromKey)) return true;
  if (toStatus === "REJECTED") return false;
  const from = STAGE_ORDER[fromKey] ?? 0;
  const to = STAGE_ORDER[toStatus] ?? 0;
  return to < from;
};
