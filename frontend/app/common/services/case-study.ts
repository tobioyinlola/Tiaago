"use server";
import serverKyInstance from "../utils/server-ky.instance";
import { ID, CaseStudyProject, CaseStudyAttempt } from "../types";

export const getCaseStudyProjects = async () => {
  const data = await serverKyInstance
    .get("case-study-projects/")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as CaseStudyProject[];
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
  const responseData = await serverKyInstance
    .post("case-study-projects/", { json: data })
    .json<CaseStudyProject>();
  return responseData;
};

export const updateCaseStudyProject = async (
  id: ID,
  data: CaseStudyProjectInput
) => {
  const responseData = await serverKyInstance
    .put(`case-study-projects/${id}/`, { json: data })
    .json<CaseStudyProject>();
  return responseData;
};

export const deleteCaseStudyProject = async (id: ID) => {
  await serverKyInstance.delete(`case-study-projects/${id}/`);
};

export const getAvailableCaseStudyProjects = async () => {
  const data = await serverKyInstance
    .get("case-study-projects/for-me/")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as CaseStudyProject[];
};

export const attemptCaseStudyProject = async (id: ID, submission?: string) => {
  const responseData = await serverKyInstance
    .post(`case-study-projects/${id}/attempt-case-study/`, {
      json: submission ? { submission } : {},
    })
    .json<CaseStudyAttempt>();
  return responseData;
};

export const getCaseStudyAttempts = async () => {
  const data = await serverKyInstance
    .get("case-study-projects/all-attempted-for-me/")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as CaseStudyAttempt[];
};

export const getAllCaseStudyAttempts = async () => {
  const data = await serverKyInstance
    .get(
      "case-study-projects/talent-attempt-all-case-study-for-admin/"
    )
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as CaseStudyAttempt[];
};

export const submitCaseStudyProject = async (
  id: ID,
  attemptId: ID,
  submission: string
) => {
  const responseData = await serverKyInstance
    .put(`case-study-projects/${id}/attempt-case-study/${attemptId}/`, {
      json: { submission },
    })
    .json<CaseStudyAttempt>();
  return responseData;
};

export const approveCaseStudyAttempt = async (
  id: ID,
  project_id: ID,
  talent_id: ID,
  approved: boolean,
  remark: string
) => {
  const responseData = await serverKyInstance
    .put(
      `case-study-projects/${project_id}/attempt-case-study/${id}/talent/${talent_id}/`,
      { json: { approved, remark } }
    )
    .json<CaseStudyAttempt>();
  return responseData;
};
