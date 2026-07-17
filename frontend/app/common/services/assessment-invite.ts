"use server";

import serverKyInstance from "../utils/server-ky.instance";
import { _handleServerApiCallError, handleServerApiCallError } from "../utils";
import { ApiResponse, AssessmentInviteDetail, CompanySkillAssessment, MCQAnswer } from "../types";

export const getAssessmentInvite = async (
  token: string
): Promise<ApiResponse<AssessmentInviteDetail>> => {
  try {
    const data = await serverKyInstance
      .get<AssessmentInviteDetail>(`skill-assessments/invite/${token}/`)
      .json();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const confirmAssessmentInviteDetails = async (
  token: string,
  fullName: string
): Promise<ApiResponse<{ submission_id: number }>> => {
  try {
    const data = await serverKyInstance
      .post(`skill-assessments/invite/${token}/confirm/`, { json: { full_name: fullName } })
      .json<{ submission_id: number }>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const getAssessmentInviteQuestions = async (
  token: string
): Promise<ApiResponse<CompanySkillAssessment>> => {
  try {
    const data = await serverKyInstance
      .get(`skill-assessments/invite/${token}/questions/`)
      .json<CompanySkillAssessment>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const submitAssessmentInviteAnswers = async (
  token: string,
  data: {
    answers: {
      section_id: number | string;
      mcq_answers?: MCQAnswer[];
      coding_task_answers?: { coding_task_id: number | string; user_answer: string }[];
    }[];
  }
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const result = await serverKyInstance
      .post(`skill-assessments/invite/${token}/submit/`, { json: data })
      .json<{ message: string }>();
    return { success: true, data: result };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const submitAssessmentInviteFeedback = async (
  token: string,
  data: { rating?: number; comment?: string }
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const result = await serverKyInstance
      .post(`skill-assessments/invite/${token}/feedback/`, { json: data })
      .json<{ message: string }>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};
