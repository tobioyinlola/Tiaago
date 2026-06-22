"use server";
import { ID, ScheduledMeeting } from "../types";
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
