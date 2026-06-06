"use server";
import { ID, ScheduledMeeting } from "../types";
import { handleServerApiCallError } from "../utils";
import axiosInstance from "../utils/axios.instance";
import serverKyInstance from "../utils/server-ky.instance";

export const getSchedule = async () => {
  try {
    const data = await serverKyInstance
      .get<ScheduledMeeting[]>("schedulers")
      .json();
    return data;
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const acceptMeeting = async (id: ID, accepted = true) => {
  try {
    const response = await axiosInstance
      .put<ScheduledMeeting>(`schedulers/${id}/`, { accepted });
    return response.data;
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const deleteMeeting = async (id: ID) => {
  try {
    const response = await axiosInstance
      .delete<ScheduledMeeting>(`schedulers/${id}/delete/`);
    return response.data;
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};
