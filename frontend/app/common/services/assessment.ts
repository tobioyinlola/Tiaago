"use server";
import {
  AssessmentQuestion,
  ID,
  QuizAttempt,
  SkillAssessmentQuiz,
  QuizAttemptInitialize,
  SkillAssessment,
  PagedResource,
  CompanySkillAssessment,
  MCQAnswer,
  SkillAssessmentResult,
  ApiResponse,
  AssessmentStack,
  AiFeedbackItem,
  AssessmentCert,
  AssessmentCert2,
  AssessmentCert3,
} from "../types";
import { _handleServerApiCallError, handleServerApiCallError } from "../utils";
import axiosInstance from "../utils/axios.instance";
import serverKyInstance from "../utils/server-ky.instance";
import { initialValues } from "@/app/startups/dashboard/constants/assessment-form.constants";

export const getSkillAssessments = async () => {
  const data = await serverKyInstance
    .get<SkillAssessment[]>("skill-assessments")
    .json();
  return data;
};

export const getSkillAssessment = async (id: ID) => {
  const data = await serverKyInstance
    .get<SkillAssessment>(`skill-assessments/${id}`)
    .json();
  return data;
};

export const getAssessments = async () => {
  const data = await serverKyInstance
    .get<SkillAssessmentQuiz[]>("quizzes/")
    .json();
  return data;
};

export type AssessmentInput = {
  name: string;
  description: string;
  questions_on: string[];
  roles: ID[];
  minutes?: number;
  question_count?: number;
  roll_out?: boolean;
};

export const createAssessment = async (
  data: Omit<AssessmentInput, "roll_out">
) => {
  const response = await axiosInstance.post<SkillAssessmentQuiz>(
    "quizzes/",
    data
  );
  return response.data;
};

export const updateAssessment = async (
  slug: string,
  data: Omit<AssessmentInput, "roll_out">
) => {
  const response = await axiosInstance.put<SkillAssessmentQuiz>(
    `quizzes/${slug}/`,
    data
  );
  return response.data;
};

export const updateAssessmentStatus = async (
  slug: string,
  roll_out: boolean
) => {
  const response = await axiosInstance.patch<SkillAssessmentQuiz>(
    `quizzes/${slug}/`,
    { roll_out }
  );
  return response.data;
};

export const getAssessment = async (slug: string) => {
  const response = await serverKyInstance
    .get<SkillAssessmentQuiz>(`quizzes/${slug}/`)
    .json();
  return response;
};

export const deleteAssessment = async (slug: string) =>
  serverKyInstance.delete(`quizzes/${slug}/`).json();

export const getAssessmentQuestions = async (slug: string) => {
  const response = await serverKyInstance
    .get<AssessmentQuestion[]>(`quizzes/${slug}/questions/`)
    .json();
  return response;
};

export type AssessmentQuestionInput = {
  label: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  is_correct: "option_1" | "option_2" | "option_3" | "option_4";
};

export const createAssessmentQuestion = async (
  slug: string,
  data: AssessmentQuestionInput
) => {
  const response = await axiosInstance.post<AssessmentQuestion>(
    `quizzes/${slug}/questions/`,
    data
  );
  return response.data;
};

export const updateAssessmentQuestion = async (
  slug: string,
  id: ID,
  data: AssessmentQuestionInput
) => {
  const response = await axiosInstance.put<AssessmentQuestion>(
    `quizzes/${slug}/questions/${id}/`,
    data
  );
  return response.data;
};

export const deleteAssessmentQuestion = async (slug: string, id: ID) =>
  serverKyInstance.delete(`quizzes/${slug}/questions/${id}/`).json();

export const getQuizAttempts = async () => {
  const response = await serverKyInstance
    .get<QuizAttempt[]>("quizzes/quiz-attempts/")
    .json();
  return response;
};

// talent section
export const getAvailableAssessments = async () => {
  const data = await serverKyInstance
    .get<SkillAssessmentQuiz[]>("quizzes/me/")
    .json();
  return data;
};

export const initializeQuizAttempt = async (quiz_slug: string) => {
  const data = await serverKyInstance
    .post<QuizAttemptInitialize>(
      `quizzes/attempt-quiz/${quiz_slug}/initialize/`
    )
    .json();
  return data;
};

export const talentGetAssessment = async (slug: string) => {
  const assessments = await getAvailableAssessments();
  return assessments.find(assessment => assessment.slug === slug);
};

export const getQuizAttempt = async (id: ID) => {
  const attempts = await getQuizAttempts();
  return attempts.find(assessment => assessment.id == id);
};

export type AttemptQuestionInput = {
  quiztaker: ID;
  question: ID;
  answer?: ID;
  completed?: boolean;
};

export type AttemptQuestionResponse = AttemptQuestionInput & {
  id: ID;
};

export const attemptQuestion = async (json: AttemptQuestionInput) => {
  const response = await axiosInstance.post<AttemptQuestionResponse>(
    "quizzes/attempt-quiz/answer-question/",
    json
  );
  return response.data;
};

export const getCompanyAssessments = async (
  page = 1,
  page_size = 10,
  search?: string
) => {
  const data = await serverKyInstance
    .get<PagedResource<CompanySkillAssessment>>(
      "skill-assessments/company-assessments",
      {
        searchParams: {
          page,
          page_size,
          ...(search ? { title: search } : {}),
        },
      }
    )
    .json();
  return data;
};

export const getCompanyAssessment = async (id: ID) => {
  const data = await serverKyInstance
    .get<CompanySkillAssessment>(`skill-assessments/company-assessments/${id}`)
    .json();
  return data;
};

export const createCompanyAssessment = async (data: typeof initialValues) => {
  try {
    const response = await axiosInstance.post<CompanySkillAssessment>(
      "skill-assessments/company-assessments",
      data
    );
    return response.data;
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const getQuestionsFromQuestionBank = async (roles: ID[]) => {
  const response = await serverKyInstance
    .get<PagedResource<any>>(
      `skill-assessments/question-bank?roles=${roles.join(",")}`
    )
    .json();
  return response;
};

export const attemptCompanyAssessmentMCQs = async (
  id: ID,
  data: {
    answers: { section_id: ID; mcq_answers: MCQAnswer[] }[];
  }
): Promise<ApiResponse<CompanySkillAssessment>> => {
  try {
    const response = await axiosInstance.post<CompanySkillAssessment>(
      `skill-assessments/company-assessments/${id}/take`,
      data
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("attemptCompanyAssessmentMCQs Error: ", errMsg);
    console.log("attemptCompanyAssessmentMCQs Error Map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const attemptCompanyAssessmentCodeSection = async (
  id: ID,
  section_id: ID,
  coding_task_answers: {
    coding_task_id: ID;
    user_answer: string;
  }[]
): Promise<ApiResponse<CompanySkillAssessment>> => {
  try {
    const response = await axiosInstance.post<CompanySkillAssessment>(
      `skill-assessments/company-assessments/${id}/take`,
      {
        answers: [
          {
            coding_task_answers,
            section_id,
          },
        ],
      }
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("attemptCompanyAssessmentCodeSection Error: ", errMsg);
    console.log("attemptCompanyAssessmentCodeSection Error Map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getAssessmentResults = async (id: ID) => {
  const response = await serverKyInstance
    .get<SkillAssessmentResult>(`skill-assessments/results/${id}`)
    .json();
  return response;
};

export const getAssessmentResultsList = async (id: ID) => {
  const response = (await serverKyInstance.get)<
    PagedResource<SkillAssessmentResult>
  >(`skill-assessments/skill-assessment-results/${id}`).json();
  return response;
};

export const initiateAssessmentPayment = async (
  id: ID,
  coupon_code?: string
) => {
  try {
    const response = await axiosInstance.post<{
      payment_url?: string;
    }>("skill-assessments/initiate-assessment-payment/", {
      assessment_id: id,
      coupon_code,
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("initiateAssessmentPayment Error: ", errMsg);
    console.log("initiateAssessmentPayment Error Map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getAssessmentStacks = async (page = 1, page_size = 10) => {
  try {
    const response = await serverKyInstance
      .get<PagedResource<AssessmentStack>>("skill-assessments/stacks/", {
        searchParams: {
          page,
          page_size,
        },
      })
      .json();
    return response;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getAssessmentStacks Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const uploadMcqAssessment = async (data: FormData) => {
  try {
    const response = await axiosInstance.post<CompanySkillAssessment>(
      "skill-assessments/staff/add-mcq-assessment/",
      data
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("uploadMcqAssessment Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const createCodeAssessment = async (json: {
  mcq_section_id: ID;
  stack: ID;
  difficulty_level: string;
  name: string;
  description: string;
  duration_minutes: number;
}) => {
  try {
    const response = await axiosInstance.post<CompanySkillAssessment>(
      "skill-assessments/staff/add-coding-assessment/",
      json,
      {
        params: {
          v: 2,
        },
      }
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("createCodeAssessment Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getAiFeedback = async (job_id: ID) => {
  try {
    const response = await serverKyInstance
      .get<PagedResource<AiFeedbackItem>>(
        `skill-assessments/company-ai-applications/${job_id}/summary`
      )
      .json();
    return response;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getAiFeedback Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const createOrGetAssessmentCert = async (
  assessment_id: ID,
  talent_id?: ID
) => {
  try {
    const response = await serverKyInstance
      .post<AssessmentCert>(
        `skill-assessments/certificates/prepare/${assessment_id}/`,
        {
          ...(talent_id
            ? {
                searchParams: {
                  talent_id,
                },
              }
            : {}),
        }
      )
      .json();
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("createCodeAssessment Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const uploadAssessmentCert = async (id: ID, data: FormData) => {
  try {
    const response = await axiosInstance.patch<AssessmentCert>(
      `skill-assessments/certificates/${id}/upload/`,
      data
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("uploadAssessmentCert Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getAssessmentCerts = async (page = 1, page_size = 10) => {
  try {
    const response = await serverKyInstance
      .get<PagedResource<AssessmentCert2>>("skill-assessments/certificates/", {
        searchParams: {
          page,
          page_size,
        },
      })
      .json();
    return response;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getAssessmentCerts Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const getTalentAssessmentCerts = async (portfolio_slug: string) => {
  try {
    const response = await serverKyInstance
      .get<PagedResource<AssessmentCert3> | AssessmentCert3[]>(
        `skill-assessments/certificates/public/by-portfolio/${portfolio_slug}/list`
      )
      .json();
    const certs = Array.isArray(response) ? response : response?.results;
    return certs;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getTalentAssessmentCerts Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const getCompanyAssessmentCooldownStatus = async (id: ID) => {
  try {
    const response = await serverKyInstance
      .get<{
        id: ID;
        skill_assessment: ID;
        failed_at: string;
        cooldown_ends_at: string;
        days_remaining: number;
        is_active: boolean;
        can_take_assessment: boolean;
      }>(`skill-assessments/cooldown-status/${id}/`)
      .json();
    return response;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getCompanyAssessmentCooldownStatus Error: ", errMsg);
    throw Error(errMsg);
  }
};
