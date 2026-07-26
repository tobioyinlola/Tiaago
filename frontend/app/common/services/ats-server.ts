"use server";

import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";
import { AtsJob, ApiResponse, ID, Job } from "../types";
import { AtsProvider } from "./ats";

export type AvailableAtsIntegration = {
  provider: AtsProvider;
  display_name: string;
  logo: string | null;
};

/** The ATS platforms actually connectable right now -- the intersection of
 * what's configured in this Nango account and what we have a provider
 * module for. Fetched server-side since it's account-wide, not per-request
 * interactive state. */
export const getAvailableAtsIntegrations = async () => {
  try {
    const data = await serverKyInstance
      .get("ats/available-integrations/")
      .json<{ results: AvailableAtsIntegration[] }>();
    return { success: true as const, data: data.results };
  } catch (error) {
    return {
      success: false as const,
      error: await handleServerApiCallError(error),
    };
  }
};

/** Unconverted synced jobs for the recruiter's company, across all ATS
 * connections -- rendered as a small section above the paginated
 * Jobs Posted table. Deliberately unpaginated on the backend (small volume),
 * so this returns the full list, not a PagedResource. */
export const getSyncedJobs = async () => {
  try {
    const data = await serverKyInstance.get("ats/jobs/").json<AtsJob[]>();
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: await handleServerApiCallError(error),
    };
  }
};

export type ConvertAtsJobPayload = {
  job_type: string;
  job_level?: string;
  experience?: number;
  payment_currency: string;
  payment_range_usd?: string;
  payment_range_ngn?: string;
  hiring_type?: string;
  screening_threshold?: number;
  passing_grade?: number;
  assessment_time_limit?: number;
  assessment_questions?: unknown[];
  interview_slots?: unknown[];
};

/** Turns a synced AtsJob into a real, immediately-ACTIVE Job posting, and
 * converts all of its synced candidates into real applications. Called
 * directly from the (client) convert modal, same as `createJob` -- a plain
 * server action, no client-driven SDK event loop involved here. */
export const convertAtsJob = async (
  atsJobId: ID,
  payload: ConvertAtsJobPayload
): Promise<ApiResponse<{ job: Job; applications_created: number }>> => {
  try {
    const data = await serverKyInstance
      .post(`ats/jobs/${atsJobId}/convert/`, { json: payload })
      .json<{ job: Job; applications_created: number }>();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: await handleServerApiCallError(error) };
  }
};
