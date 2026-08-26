"use server";

import { HTTPError } from "ky";

import { ApiResponse } from "../types";
import { _handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export type InterviewStatus =
  | "SCHEDULED"
  | "ROOM_CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type InterviewDetails = {
  job_title: string;
  company_name: string;
  recruiter_first_name: string;
  duration_minutes: number;
  recording_enabled: boolean;
  scheduled_at: string;
};

/** Result of looking an interview up by its candidate join token. A token that
 * matches nothing comes back as `{ found: false }` rather than an error. */
export type InterviewLookup =
  | ({ found: true; status: InterviewStatus } & InterviewDetails)
  | { found: false };

export type CandidateJoinResponse = {
  roomUrl: string;
  participantToken: string;
  interviewDetails: InterviewDetails;
};

/** Public (no auth) -- looks up an interview by the candidate's join token.
 * The token in the emailed link is the candidate's only credential. */
export const getInterviewByToken = async (
  token: string
): Promise<ApiResponse<InterviewLookup>> => {
  try {
    const data = await serverKyInstance
      .get(`interviews/${token}/`)
      .json<InterviewLookup>();
    return { success: true, data };
  } catch (error) {
    // A 404 here is a real answer (`{"found": false}`), not a failure -- the
    // page renders the "invalid or expired link" screen for it. Anything else
    // (network, 5xx) is a genuine error and is surfaced as one.
    if (error instanceof HTTPError && error.response?.status === 404) {
      return { success: true, data: { found: false } };
    }
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("getInterviewByToken Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

/** Result of looking an interview up by its *recruiter* join token. Carries
 * the candidate's name on top of the shared details, since the recruiter's
 * pre-join screen shows who they are about to interview. */
export type RecruiterInterviewLookup =
  | ({
      found: true;
      status: InterviewStatus;
      candidate_name: string;
    } & InterviewDetails)
  | { found: false };

export type RecruiterJoinResponse = {
  roomUrl: string;
  participantToken: string;
  interviewId: string;
  transcriptionWebsocketUrl: string;
  billing: { success: boolean; reason: string; amount_charged: string };
};

/** Public (no auth) -- looks up an interview by the recruiter's join token, so
 * a recruiter can open an interview straight from their email without logging
 * in, the same way a candidate already can. */
export const getInterviewByRecruiterToken = async (
  token: string
): Promise<ApiResponse<RecruiterInterviewLookup>> => {
  try {
    const data = await serverKyInstance
      .get(`interviews/recruiter/${token}/`)
      .json<RecruiterInterviewLookup>();
    return { success: true, data };
  } catch (error) {
    // Same reasoning as getInterviewByToken -- a 404 is the real answer
    // `{"found": false}`, not a transport failure.
    if (error instanceof HTTPError && error.response?.status === 404) {
      return { success: true, data: { found: false } };
    }
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("getInterviewByRecruiterToken Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

/** Public (no auth) -- exchanges the recruiter join token for a Daily room URL
 * and an *owner* participant token. Charges the interview package server-side,
 * exactly as the dashboard's "Join Interview" button does, so this link is not
 * a way around wallet billing. */
export const joinInterviewAsRecruiter = async (
  token: string,
  enableRecording: boolean
): Promise<ApiResponse<RecruiterJoinResponse>> => {
  try {
    const data = await serverKyInstance
      .post("interviews/join-recruiter/", { json: { token, enableRecording } })
      .json<RecruiterJoinResponse>();
    return { success: true, data };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    const message =
      typeof errorMap?.error === "string" ? errorMap.error : errMsg;
    console.log("joinInterviewAsRecruiter Error: ", message);
    return { success: false, error: message };
  }
};

/** Public (no auth) -- ends an interview the recruiter joined by link. Marks it
 * COMPLETED and starts the summary/scoring pipeline, exactly as the dashboard's
 * "End interview" does. Idempotent server-side, so a double call is harmless. */
export const endInterviewAsRecruiter = async (
  token: string
): Promise<ApiResponse<{ status: InterviewStatus; ended_at: string }>> => {
  try {
    const data = await serverKyInstance
      .post("interviews/end-recruiter/", { json: { token } })
      .json<{ status: InterviewStatus; ended_at: string }>();
    return { success: true, data };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    const message =
      typeof errorMap?.error === "string" ? errorMap.error : errMsg;
    console.log("endInterviewAsRecruiter Error: ", message);
    return { success: false, error: message };
  }
};

/** Public (no auth) -- exchanges the join token for a Daily room URL and a
 * non-owner participant token. Also notifies the recruiter that the candidate
 * is waiting (handled server-side on first success). */
export const joinInterviewAsCandidate = async (
  token: string,
  consentGiven: boolean
): Promise<ApiResponse<CandidateJoinResponse>> => {
  try {
    const data = await serverKyInstance
      .post("interviews/join-candidate/", { json: { token, consentGiven } })
      .json<CandidateJoinResponse>();
    return { success: true, data };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    // The backend owns the copy for the invalid/expired/already-completed/
    // cancelled/room-not-ready/consent-required cases, so surface its `error`
    // string verbatim instead of the field-prefixed generic message.
    const message =
      typeof errorMap?.error === "string" ? errorMap.error : errMsg;
    console.log("joinInterviewAsCandidate Error: ", message);
    return { success: false, error: message };
  }
};
