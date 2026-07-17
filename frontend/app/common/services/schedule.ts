"use server";
import { ApiResponse, ID, InterviewSlot, ScheduledMeeting } from "../types";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

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
