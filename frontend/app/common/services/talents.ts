"use server";

import {
  ID,
  Talent,
  TalentPortfolio,
  TalentPortfolioEducation,
  TalentPortfolioProject,
  TalentPortfolioWorkExperience,
} from "../types";
import { _handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export const updateTalent = async (
  input: Partial<Talent> | FormData,
  endpoint: "profile" | "me" = "me"
) => {
  try {
    const options = input instanceof FormData
      ? { body: input }
      : { json: input };
    const responseData = await serverKyInstance.patch(`auth/users/${endpoint}`, options).json<{ user: Talent; [key: string]: any }>();
    const { user, ...rest } = responseData;
    return {
      success: true,
      data: { ...user, ...rest },
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Error updating talent: ", errMsg);
    console.log("Error updating talent error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};
export const getPortfolio = async () => {
  try {
    const data = await serverKyInstance
      .get<TalentPortfolio>("jobs/portfolio")
      .json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Error getting portfolio: ", errMsg);
    console.log("Error getting portfolio error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getTalentPortfolio = async (slug: string) => {
  try {
    const data = await serverKyInstance
      .get<TalentPortfolio>(`jobs/portfolio/${slug}/details`)
      .json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Error getting talent portfolio: ", errMsg);
    console.log("Error getting talent portfolio error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const updatePortfolio = async (
  input: Partial<TalentPortfolio> | FormData
) => {
  try {
    const options = input instanceof FormData
      ? { body: input }
      : { json: input };
    const data = await serverKyInstance.patch("jobs/portfolio/", options).json<TalentPortfolio>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.log(error);
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Error updating portfolio: ", errMsg);
    console.log("Error updating portfolio error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const createPortfolioProject = async (
  json: Partial<TalentPortfolioProject>
) => {
  try {
    const data = await serverKyInstance.post("jobs/portfolio/projects/create/", {
      json,
    }).json<TalentPortfolioProject>();
    // console.log(data);
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Create portfolio project error: ", errMsg);
    console.log("Create portfolio project error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const updatePortfolioProject = async (
  id: ID,
  json: Partial<TalentPortfolioProject>
) => {
  try {
    const data = await serverKyInstance.patch(`jobs/portfolio/projects/${id}/`, {
      json,
    }).json<TalentPortfolioProject>();
    // console.log(data);
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Update portfolio project error: ", errMsg);
    console.log("Update portfolio project error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const deletePortfolioProject = async (id: ID) => {
  try {
    const data = await serverKyInstance
      .delete(`jobs/portfolio/projects/${id}`)
      .json();
    // console.log(data);
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Delete portfolio project error: ", errMsg);
    console.log("Delete portfolio project error map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const createPortfolioExperience = async (
  json: Partial<TalentPortfolioWorkExperience>
) => {
  try {
    const data = await serverKyInstance.post("jobs/portfolio/experiences/create/", {
      json,
    }).json<TalentPortfolioWorkExperience>();
    // console.log(data);
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Create portfolio experience error map: ", errorMap);
    console.log("Create portfolio experience error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const updatePortfolioExperience = async (
  id: ID,
  json: Partial<TalentPortfolioWorkExperience>
) => {
  try {
    const data = await serverKyInstance.patch(`jobs/portfolio/experiences/${id}/`, {
      json,
    }).json<TalentPortfolioWorkExperience>();
    // console.log(data);
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Update portfolio experience error map: ", errorMap);
    console.log("Update portfolio experience error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const deletePortfolioExperience = async (id: ID) => {
  try {
    const data = await serverKyInstance.delete(`jobs/portfolio/experiences/${id}/`).json<TalentPortfolioWorkExperience>();
    // console.log(data);
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Delete portfolio experience error map: ", errorMap);
    console.log("Update portfolio experience error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const createTalentPortfolioEducation = async (
  json: Partial<TalentPortfolioEducation>
) => {
  try {
    const data = await serverKyInstance.post("jobs/portfolio/educations/create/", {
      json,
    }).json<TalentPortfolioEducation>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Create talent portfolio education error map: ", errorMap);
    console.log("Create talent portfolio education error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const updateTalentPortfolioEducation = async (
  id: ID,
  json: Partial<TalentPortfolioEducation>
) => {
  try {
    const data = await serverKyInstance.patch(`jobs/portfolio/educations/${id}/`, {
      json,
    }).json<TalentPortfolioEducation>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Update talent portfolio education error map: ", errorMap);
    console.log("Update talent portfolio education error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const deleteTalentPortfolioEducation = async (id: ID) => {
  try {
    const data = await serverKyInstance.delete(`jobs/portfolio/educations/${id}/`).json<TalentPortfolioEducation>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Delete talent portfolio education error map: ", errorMap);
    console.log("Delete talent portfolio education error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};
