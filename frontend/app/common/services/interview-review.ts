"use server";

import {
  ApiResponse,
  ID,
  InterviewCandidateFeedbackData,
  InterviewReview,
  InterviewSummaryData,
} from "../types";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export const getInterviewReview = async (interviewId: ID): Promise<ApiResponse<InterviewReview>> => {
  try {
    const data = await serverKyInstance.get(`schedulers/${interviewId}/review/`).json<InterviewReview>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getInterviewReview Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const getInterviewTranscript = async (
  interviewId: ID
): Promise<ApiResponse<{ segments: { id: string; speaker: string; text: string; start_ms: number; end_ms: number; confidence: number }[] }>> => {
  try {
    const data = await serverKyInstance.get(`schedulers/${interviewId}/transcript/`).json<{ segments: any[] }>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getInterviewTranscript Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const updateInterviewSummary = async (
  interviewId: ID,
  payload: Partial<Pick<InterviewSummaryData, "executive_summary" | "strengths" | "concerns" | "action_items">>
): Promise<ApiResponse<InterviewSummaryData>> => {
  try {
    const data = await serverKyInstance
      .patch(`schedulers/${interviewId}/summary/`, { json: payload })
      .json<InterviewSummaryData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateInterviewSummary Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const regenerateInterviewSummary = async (interviewId: ID): Promise<ApiResponse<InterviewSummaryData>> => {
  try {
    const data = await serverKyInstance
      .post(`schedulers/${interviewId}/summary/regenerate/`)
      .json<InterviewSummaryData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("regenerateInterviewSummary Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const submitInterviewDecision = async (
  interviewId: ID,
  payload: { recommendation: string; confidence: string; overall_score?: number; rejection_reason?: string }
): Promise<ApiResponse<InterviewSummaryData>> => {
  try {
    const data = await serverKyInstance
      .post(`schedulers/${interviewId}/decision/`, { json: payload })
      .json<InterviewSummaryData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("submitInterviewDecision Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

// "Advance to 2nd interview" -- re-invites the candidate to interview the
// same way the first round did (see scheduler.review_views.InterviewAdvanceRoundView),
// as an alternative to submitting a Yes/No recommendation.
export const advanceInterviewRound = async (interviewId: ID): Promise<ApiResponse<{ status: string }>> => {
  try {
    const data = await serverKyInstance
      .post(`schedulers/${interviewId}/advance-round/`)
      .json<{ status: string }>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("advanceInterviewRound Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const updateInterviewFeedback = async (
  interviewId: ID,
  content: string
): Promise<ApiResponse<InterviewCandidateFeedbackData>> => {
  try {
    const data = await serverKyInstance
      .patch(`schedulers/${interviewId}/feedback/`, { json: { content } })
      .json<InterviewCandidateFeedbackData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateInterviewFeedback Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const sendInterviewFeedback = async (interviewId: ID): Promise<ApiResponse<InterviewCandidateFeedbackData>> => {
  try {
    const data = await serverKyInstance
      .post(`schedulers/${interviewId}/feedback/send/`)
      .json<InterviewCandidateFeedbackData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("sendInterviewFeedback Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};
