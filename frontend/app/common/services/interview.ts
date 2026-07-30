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
