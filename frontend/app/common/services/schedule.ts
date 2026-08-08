"use server";
import { ApiResponse, ID, InterviewSlot, ScheduledMeeting } from "../types";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";
import { publicKyInstance } from "../utils/client-ky.instance";

export const getSchedule = async () => {
  try {
    const data = await serverKyInstance.get("schedulers").json();
    const results = Array.isArray(data)
      ? data
      : ((data as any)?.results || []);
    return results as ScheduledMeeting[];
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const acceptMeeting = async (id: ID, accepted = true) => {
  try {
    const data = await serverKyInstance
      .put(`schedulers/${id}/`, { json: { accepted } })
      .json<ScheduledMeeting>();
    return data;
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const deleteMeeting = async (id: ID) => {
  try {
    const data = await serverKyInstance
      .delete(`schedulers/${id}/delete/`)
      .json<ScheduledMeeting>();
    return data;
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const getJobInterviewSlots = async (
  jobId: ID
): Promise<ApiResponse<InterviewSlot[]>> => {
  try {
    const data = await serverKyInstance
      .get(`jobs/${jobId}/interview-slots/`)
      .json<InterviewSlot[]>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getJobInterviewSlots Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const claimInterviewSlot = async (
  jobId: ID,
  slotId: ID
): Promise<ApiResponse<InterviewSlot>> => {
  try {
    const data = await serverKyInstance
      .post(`jobs/${jobId}/interview-slots/${slotId}/claim/`)
      .json<InterviewSlot>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("claimInterviewSlot Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export type GuestInterviewSlots = {
  job_title: string;
  company_name: string;
  slots: InterviewSlot[];
};

// No-login equivalents for a guest (account-less) applicant, keyed by the
// invite token emailed to them (see jobs.views.GuestInterviewSlotListView/
// GuestInterviewSlotClaimView) instead of an authenticated session.
export const getGuestInterviewSlots = async (
  token: string
): Promise<ApiResponse<GuestInterviewSlots>> => {
  try {
    const data = await publicKyInstance
      .get(`jobs/interview-slots/guest/${token}/`)
      .json<GuestInterviewSlots>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getGuestInterviewSlots Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const claimGuestInterviewSlot = async (
  token: string,
  slotId: ID
): Promise<ApiResponse<InterviewSlot>> => {
  try {
    const data = await publicKyInstance
      .post(`jobs/interview-slots/guest/${token}/${slotId}/claim/`)
      .json<InterviewSlot>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("claimGuestInterviewSlot Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};
