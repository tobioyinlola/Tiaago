"use server";

import {
  ApiResponse,
  CompetencyScore,
  ID,
  InterviewNotesData,
  InterviewProcessingStatus,
  InterviewScorecard,
  StartInterviewResponse,
} from "../types";
import { _handleServerApiCallError, handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

/** Recruiter clicks "Join Interview" / the workspace mounts -- charges the
 * interview package (unless free allowance/already charged applies) and
 * mints the recruiter's Daily.co owner token. A 402 here means insufficient
 * wallet balance; the caller should redirect to billing rather than load
 * the video call. */
export const startInterview = async (
  interviewId: ID,
  enableRecording?: boolean
): Promise<ApiResponse<StartInterviewResponse>> => {
  try {
    const data = await serverKyInstance
      .post(`schedulers/${interviewId}/start/`, {
        json: { enable_recording: !!enableRecording },
      })
      .json<StartInterviewResponse>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("startInterview Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const endInterview = async (
  interviewId: ID
): Promise<ApiResponse<{ status: string; ended_at: string | null }>> => {
  try {
    const data = await serverKyInstance
      .post(`schedulers/${interviewId}/end/`)
      .json<{ status: string; ended_at: string | null }>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("endInterview Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const getInterviewProcessingStatus = async (
  interviewId: ID
): Promise<ApiResponse<InterviewProcessingStatus>> => {
  try {
    const data = await serverKyInstance
      .get(`schedulers/${interviewId}/processing-status/`)
      .json<InterviewProcessingStatus>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getInterviewProcessingStatus Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const getInterviewNotes = async (
  interviewId: ID
): Promise<ApiResponse<InterviewNotesData>> => {
  try {
    const data = await serverKyInstance
      .get(`schedulers/${interviewId}/notes/`)
      .json<InterviewNotesData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getInterviewNotes Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const saveInterviewNotes = async (
  interviewId: ID,
  contentRich: string,
  contentPlain: string
): Promise<ApiResponse<InterviewNotesData>> => {
  try {
    const data = await serverKyInstance
      .put(`schedulers/${interviewId}/notes/`, {
        json: { content_rich: contentRich, content_plain: contentPlain },
      })
      .json<InterviewNotesData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("saveInterviewNotes Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const getInterviewScorecard = async (
  interviewId: ID
): Promise<ApiResponse<InterviewScorecard>> => {
  try {
    const data = await serverKyInstance
      .get(`schedulers/${interviewId}/scorecard/`)
      .json<InterviewScorecard>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getInterviewScorecard Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const updateCompetencyScore = async (
  interviewId: ID,
  competencyScoreId: ID,
  payload: { score_raw?: number; recruiter_notes?: string }
): Promise<ApiResponse<CompetencyScore>> => {
  try {
    const data = await serverKyInstance
      .patch(`schedulers/${interviewId}/scorecard/${competencyScoreId}/`, {
        json: payload,
      })
      .json<CompetencyScore>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateCompetencyScore Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const submitInterviewScorecard = async (
  interviewId: ID
): Promise<
  | { success: true }
  | { success: false; error: string; missing: string[] }
> => {
  try {
    await serverKyInstance.post(`schedulers/${interviewId}/scorecard/submit/`).json();
    return { success: true };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("submitInterviewScorecard Error: ", errMsg);
    const missing = Array.isArray((errorMap as any)?.missing) ? (errorMap as any).missing : [];
    return { success: false, error: errMsg, missing };
  }
};
