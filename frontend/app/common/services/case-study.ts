"use server";
import axiosInstance from "../utils/axios.instance";
import serverKyInstance from "../utils/server-ky.instance";
import { ID, CaseStudyProject, CaseStudyAttempt } from "../types";

export const getCaseStudyProjects = async () => {
  const data = await serverKyInstance
    .get<CaseStudyProject[]>("case-study-projects/")
    .json();
  return data;
};

export const getCaseStudyProject = async (id: ID) => {
  const response = await serverKyInstance
    .get<CaseStudyProject>(`case-study-projects/${id}/`)
    .json();
  return response;
};

type CaseStudyProjectInput = {
  title: string;
  about: string;
  roles: ID[];
};

export const createCaseStudyProject = async (data: CaseStudyProjectInput) => {
  const response = await axiosInstance
    .post<CaseStudyProject>("case-study-projects/", data);
  return response.data;
};

export const updateCaseStudyProject = async (
  id: ID,
  data: CaseStudyProjectInput
) => {
  const response = await axiosInstance
    .put<CaseStudyProject>(`case-study-projects/${id}/`, data);
  return response.data;
};

export const deleteCaseStudyProject = async (id: ID) => {
  await axiosInstance.delete(`case-study-projects/${id}/`);
};

export const getAvailableCaseStudyProjects = async () => {
  const data = await serverKyInstance
    .get<CaseStudyProject[]>("/case-study-projects/for-me/")
    .json();
  return data;
};

export const attemptCaseStudyProject = async (id: ID, submission?: string) => {
  const response = await axiosInstance
    .post<CaseStudyAttempt>(`case-study-projects/${id}/attempt-case-study/`, 
      submission ? { submission } : {}
    );
  return response.data;
};

export const getCaseStudyAttempts = async () => {
  const data = await serverKyInstance
    .get<CaseStudyAttempt[]>("case-study-projects/all-attempted-for-me/")
    .json();
  return data;
};

export const getAllCaseStudyAttempts = async () => {
  const data = await serverKyInstance
    .get<CaseStudyAttempt[]>(
      "case-study-projects/talent-attempt-all-case-study-for-admin/"
    )
    .json();
  return data;
};

export const submitCaseStudyProject = async (
  id: ID,
  attemptId: ID,
  submission: string
) => {
  const response = await axiosInstance
    .put<CaseStudyAttempt>(
      `case-study-projects/${id}/attempt-case-study/${attemptId}/`,
      { submission }
    );
  return response.data;
};

export const approveCaseStudyAttempt = async (
  id: ID,
  project_id: ID,
  talent_id: ID,
  approved: boolean,
  remark: string
) => {
  const response = await axiosInstance
    .put<CaseStudyAttempt>(
      `case-study-projects/${project_id}/attempt-case-study/${id}/talent/${talent_id}/`,
      { approved, remark }
    );
  return response.data;
};
