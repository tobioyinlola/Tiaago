"use server";

import { ApiResponse } from "../types";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export type CompanyInterviewSettingsData = {
  recording_enabled_default: boolean;
  recording_retention_days: number;
  ai_copilot_enabled: boolean;
  copilot_live_transcription_enabled: boolean;
  copilot_suggestions_enabled: boolean;
  copilot_evidence_capture_enabled: boolean;
  copilot_post_interview_summary_enabled: boolean;
  default_duration_minutes: number;
  notify_recruiter_reminder: boolean;
  notify_recruiter_summary_ready: boolean;
  notify_candidate_feedback_sent: boolean;
};

export const getCompanyInterviewSettings = async (): Promise<ApiResponse<CompanyInterviewSettingsData>> => {
  try {
    const data = await serverKyInstance
      .get("schedulers/interview-settings/")
      .json<CompanyInterviewSettingsData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getCompanyInterviewSettings Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const updateCompanyInterviewSettings = async (
  payload: Partial<CompanyInterviewSettingsData>
): Promise<ApiResponse<CompanyInterviewSettingsData>> => {
  try {
    const data = await serverKyInstance
      .patch("schedulers/interview-settings/", { json: payload })
      .json<CompanyInterviewSettingsData>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateCompanyInterviewSettings Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};
