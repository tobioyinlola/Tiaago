import { AiFeedbackItem, WorkflowStage } from "@/app/common/types";

const CLOSED_STATUSES = new Set(["OFFER_ACCEPTED", "OFFER_DECLINED", "WITHDRAWN"]);

// Buckets a candidate into one of the board's legacy-status columns. The
// application card also exposes its configured workflow stage separately.
export const getColumnKey = (item: AiFeedbackItem): string => {
  if (item.status === "APPLIED") {
    const stillScreening = item.resume_screening_status === "started" || item.resume_screening_status === "failed";
    return stillScreening ? "RESUME_SCREENING" : "APPLIED";
  }
  if (CLOSED_STATUSES.has(item.status)) return "CLOSED";
  return item.status;
};

// A recruiter can still reject a candidate from any active stage. Every other
// board action maps to the published stage stored on that candidate's job.
// REVIEWED is an initial screen when assessment is absent; otherwise it
// starts the existing assessment invitation flow.
export const workflowStageForStatus = (
  item: AiFeedbackItem,
  status: string,
): WorkflowStage | null => {
  if (status === "REVIEWED") {
    return item.workflow_stages.includes("assessment") ? "assessment" : "screen";
  }
  if (["PENDING_DECISION", "AI_INTERVIEW", "INTERVIEW_SCHEDULED", "HUMAN_INTERVIEW", "INTERVIEW_COMPLETED", "SECOND_INTERVIEW"].includes(status)) {
    return "interview";
  }
  if (["OFFER_EXTENDED", "OFFER_ACCEPTED", "OFFER_DECLINED"].includes(status)) {
    return "decision";
  }
  if (status === "APPLIED") return "application";
  return null;
};

export const isStatusAvailableInWorkflow = (item: AiFeedbackItem, status: string): boolean => {
  if (status === "REJECTED") return true;
  const stage = workflowStageForStatus(item, status);
  return stage !== null && item.workflow_stages.includes(stage);
};

// Canonical forward progression through the recruiter-driven pipeline.
// REJECTED is deliberately absent -- it's a terminal decision that's valid
// from any active stage, not a step in the funnel -- and CLOSED (the
// talent-only outcomes) is absent because a recruiter can never move a
// candidate into or out of it.
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

const LOCKED_STAGES = new Set(["REJECTED", "CLOSED"]);

export const isStageLocked = (item: AiFeedbackItem): boolean => LOCKED_STAGES.has(getColumnKey(item));

export const isBackwardMove = (item: AiFeedbackItem, toStatus: string): boolean => {
  const fromKey = getColumnKey(item);
  if (LOCKED_STAGES.has(fromKey)) return true;
  if (toStatus === "REJECTED") return false;
  const from = STAGE_ORDER[fromKey] ?? 0;
  const to = STAGE_ORDER[toStatus] ?? 0;
  return to < from;
};
