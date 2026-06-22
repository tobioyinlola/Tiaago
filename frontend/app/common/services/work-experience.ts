"use server";
import { ID, WorkExperience } from "../types";
import { _handleServerApiCallError } from "../utils";
import axiosInstance from "../utils/axios.instance";
import serverKyInstance from "../utils/server-ky.instance";

export const getWorkExperiences = async () => {
  try {
    const data = await serverKyInstance
      .get<WorkExperience[]>("work-experiences")
      .json();
    const results = Array.isArray(data) ? data : (data as any)?.results || [];
    return results as WorkExperience[];
  } catch (error) {
    return [];
  }
};

export type WorkExperienceInput = Omit<WorkExperience, "talent">;

export const createWorkExperience = async (
  workExperience: WorkExperienceInput
) => {
  try {
    const { data } = await axiosInstance.post<WorkExperience>(
      "work-experiences/",
      workExperience
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Create work experience error: ", errMsg);
    console.log("Create work experience error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const updateWorkExperience = async (
  workExperience: WorkExperienceInput,
  id: ID
) => {
  try {
    const { data } = await axiosInstance.put<WorkExperience>(
      `work-experiences/${id}/`,
      workExperience
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Update work experience error: ", errMsg);
    console.log("Update work experience error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const deleteWorkExperience = async (id: ID) => {
  try {
    await axiosInstance.delete(`work-experiences/${id}/`);
    return {
      success: true,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Delete work experience error: ", errMsg);
    console.log("Delete work experience error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getTalentWorkExperiences = async (id: ID) => {
  try {
    const data = await serverKyInstance
      .get<WorkExperience[]>(`work-experiences/talents/${id}`)
      .json();
    const results = Array.isArray(data) ? data : (data as any)?.results || [];
    return results as WorkExperience[];
  } catch (error) {
    return [];
  }
};
