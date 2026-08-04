"use server";

import { HTTPError } from "ky";

import { ApiResponse, ID } from "../types";
import { _handleServerApiCallError, handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export type AIInterviewStatus =
  | "INVITED"
  | "SCHEDULED"
  | "WAITING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW"
  | "ABANDONED"
  | "FAILED";

export type AIInterviewJoinInfo = {
  job_title: string;
  company_name: string;
  duration_minutes: number;
  questions_total: number;
  window_end_at: string;
  expired: boolean;
  candidate_first_name: string;
};

export type AIInterviewLookup =
  | ({ found: true; status: AIInterviewStatus } & AIInterviewJoinInfo)
  | { found: false };

export type AIInterviewSessionInfo = {
  token: string;
  roomName: string;
  livekitUrl: string;
};

/** Public (no auth) -- looks up an AI interview by the candidate's join
 * token. The token in the invitation email is the candidate's only
 * credential. */
export const getAIInterviewByToken = async (
  token: string
): Promise<ApiResponse<AIInterviewLookup>> => {
  try {
    const data = await serverKyInstance
      .get(`ai-interviews/join/${token}/`)
      .json<AIInterviewLookup>();
    return { success: true, data };
  } catch (error) {
    if (error instanceof HTTPError && error.response?.status === 404) {
      return { success: true, data: { found: false } };
    }
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("getAIInterviewByToken Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

/** Public (no auth) -- charges the AI-interview fee, creates the LiveKit
 * room, and returns a candidate access token. Called once, right when the
 * candidate clicks "Start interview with Alex". */
export const startAIInterviewSession = async (
  token: string
): Promise<ApiResponse<AIInterviewSessionInfo>> => {
  try {
    const data = await serverKyInstance
      .post(`ai-interviews/join/${token}/start/`)
      .json<AIInterviewSessionInfo>();
    return { success: true, data };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    // The backend owns the copy for expired/unavailable/insufficient-funds
    // cases, so surface its `error` string verbatim instead of the
    // field-prefixed generic message.
    const message = typeof errorMap?.error === "string" ? errorMap.error : errMsg;
    console.log("startAIInterviewSession Error: ", message);
    return { success: false, error: message };
  }
};

export type AIInterviewListTab = "pending_review" | "completed" | "scheduled" | "no_shows";

export type AIInterviewListRow = {
  id: ID;
  candidate_name: string;
  job_title: string;
  status: AIInterviewStatus;
  summary_status: "PENDING" | "GENERATING" | "READY" | "FAILED";
  recruiter_decision: "ACCEPTED" | "OVERRIDDEN_PROCEED" | "OVERRIDDEN_DECLINE" | "PENDING" | null;
  overall_score: number | null;
  recommendation: "PROCEED" | "DO_NOT_PROCEED" | "NEEDS_REVIEW" | null;
  created_at: string;
  completed_at: string | null;
};

export type AIInterviewListResponse = {
  stats: Record<AIInterviewListTab, number>;
  results: AIInterviewListRow[];
};

/** Recruiter dashboard, session authenticated -- the four-tab AI Interviews
 * list + stat counts, in one call (the backend list view is unpaginated,
 * capped at 100 rows per tab). */
export const getRecruiterAIInterviews = async (
  tab: AIInterviewListTab = "pending_review"
): Promise<AIInterviewListResponse> => {
  try {
    const data = await serverKyInstance
      .get<AIInterviewListResponse>("ai-interviews/", { searchParams: { tab } })
      .json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getRecruiterAIInterviews Error: ", errMsg);
    throw Error(errMsg);
  }
};

export type AIInterviewQuestionDetail = {
  id: ID;
  number: number;
  type: string;
  text: string;
  candidate_response: string;
  score: number | null;
  signal_strength: "STRONG" | "MODERATE" | "WEAK" | "NO_RESPONSE" | null;
  ai_notes: string;
};

export type AIInterviewDetail = {
  id: ID;
  status: AIInterviewStatus;
  candidate_name: string;
  job_title: string;
  company_name: string;
  duration_seconds: number | null;
  completed_at: string | null;
  summary_status: "PENDING" | "GENERATING" | "READY" | "FAILED";
  summary_error: string;
  overall_score: number | null;
  communication_score: number | null;
  confidence_score: number | null;
  relevance_score: number | null;
  clarity_score: number | null;
  strengths: string[];
  concerns: { text: string; severity: string; evidence?: string }[];
  recommendation: "PROCEED" | "DO_NOT_PROCEED" | "NEEDS_REVIEW" | null;
  recommendation_confidence: "HIGH" | "MEDIUM" | "LOW" | null;
  recommendation_reasons: string[];
  flags: { type: string; description: string; impact?: string }[];
  executive_summary: string;
  candidate_feedback: string;
  recruiter_notes: string;
  recruiter_decision: "ACCEPTED" | "OVERRIDDEN_PROCEED" | "OVERRIDDEN_DECLINE" | "PENDING" | null;
  recruiter_decision_at: string | null;
  recruiter_override_reason: string;
  audio_recording_url: string | null;
  audio_recording_status: "NONE" | "UPLOADING" | "READY" | "FAILED";
  questions: AIInterviewQuestionDetail[];
};

/** Recruiter dashboard, session authenticated -- everything the review
 * page's Summary/Questions tabs need. */
export const getRecruiterAIInterviewDetail = async (id: ID): Promise<ApiResponse<AIInterviewDetail>> => {
  try {
    const data = await serverKyInstance.get(`ai-interviews/${id}/`).json<AIInterviewDetail>();
    return { success: true, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("getRecruiterAIInterviewDetail Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export type AIInterviewTranscriptSegment = { speaker: "ALEX" | "CANDIDATE"; text: string; timestamp_ms: number };

export const getRecruiterAIInterviewTranscript = async (
  id: ID
): Promise<ApiResponse<{ segments: AIInterviewTranscriptSegment[] }>> => {
  try {
    const data = await serverKyInstance
      .get(`ai-interviews/${id}/transcript/`)
      .json<{ segments: AIInterviewTranscriptSegment[] }>();
    return { success: true, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("getRecruiterAIInterviewTranscript Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const submitAIInterviewDecision = async (
  id: ID,
  payload: { decision: "ACCEPTED" | "OVERRIDDEN_PROCEED" | "OVERRIDDEN_DECLINE"; override_reason?: string }
): Promise<ApiResponse<AIInterviewDetail>> => {
  try {
    const data = await serverKyInstance
      .post(`ai-interviews/${id}/decision/`, { json: payload })
      .json<AIInterviewDetail>();
    return { success: true, data };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    const message = typeof errorMap?.error === "string" ? errorMap.error : errMsg;
    console.log("submitAIInterviewDecision Error: ", message);
    return { success: false, error: message };
  }
};

export type EligibleAIInterviewApplication = {
  job_application_id: ID;
  job_id: ID;
  job_title: string;
  candidate_name: string;
  already_has_interview: boolean;
};

/** Recruiter dashboard, session authenticated -- every application on one
 * of this recruiter's ai_interview_enabled jobs, for the "start a test
 * interview" flow. */
export const getEligibleAIInterviewApplications = async (): Promise<
  ApiResponse<{ results: EligibleAIInterviewApplication[] }>
> => {
  try {
    const data = await serverKyInstance
      .get("ai-interviews/eligible-applications/")
      .json<{ results: EligibleAIInterviewApplication[] }>();
    return { success: true, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("getEligibleAIInterviewApplications Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export type TriggerAIInterviewResult = { id: ID; status: AIInterviewStatus; join_url: string };

/** Recruiter dashboard, session authenticated -- manually provisions an
 * AIInterview for a given application and returns its join link, without
 * needing the candidate to have actually passed an assessment. */
export const triggerAIInterview = async (
  jobApplicationId: ID
): Promise<ApiResponse<TriggerAIInterviewResult>> => {
  try {
    const data = await serverKyInstance
      .post("ai-interviews/trigger/", { json: { job_application_id: jobApplicationId } })
      .json<TriggerAIInterviewResult>();
    return { success: true, data };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    const message = typeof errorMap?.error === "string" ? errorMap.error : errMsg;
    console.log("triggerAIInterview Error: ", message);
    return { success: false, error: message };
  }
};
