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
  AssessmentBundleSummary,
  SubmissionAnswers,
  TalentQuestionBankEntry,
  AssessmentBundleAdmin,
} from "../types";
import { _handleServerApiCallError, handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";
import { initialValues } from "@/app/recruiter/dashboard/constants/assessment-form.constants";

export const getSkillAssessments = async () => {
  const data = await serverKyInstance
    .get("skill-assessments")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as SkillAssessment[];
};

export const getSkillAssessment = async (id: ID) => {
  const data = await serverKyInstance
    .get<SkillAssessment>(`skill-assessments/${id}`)
    .json();
  return data;
};

export const getAssessments = async () => {
  const data = await serverKyInstance
    .get("quizzes/")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as SkillAssessmentQuiz[];
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
  const result = await serverKyInstance
    .post("quizzes/", { json: data })
    .json<SkillAssessmentQuiz>();
  return result;
};

export const updateAssessment = async (
  slug: string,
  data: Omit<AssessmentInput, "roll_out">
) => {
  const result = await serverKyInstance
    .put(`quizzes/${slug}/`, { json: data })
    .json<SkillAssessmentQuiz>();
  return result;
};

export const updateAssessmentStatus = async (
  slug: string,
  roll_out: boolean
) => {
  const result = await serverKyInstance
    .patch(`quizzes/${slug}/`, { json: { roll_out } })
    .json<SkillAssessmentQuiz>();
  return result;
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
    .get(`quizzes/${slug}/questions/`)
    .json();
  const results = Array.isArray(response) ? response : (response as any)?.results || [];
  return results as AssessmentQuestion[];
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
  const result = await serverKyInstance
    .post(`quizzes/${slug}/questions/`, { json: data })
    .json<AssessmentQuestion>();
  return result;
};

export const updateAssessmentQuestion = async (
  slug: string,
  id: ID,
  data: AssessmentQuestionInput
) => {
  const result = await serverKyInstance
    .put(`quizzes/${slug}/questions/${id}/`, { json: data })
    .json<AssessmentQuestion>();
  return result;
};

export const deleteAssessmentQuestion = async (slug: string, id: ID) =>
  serverKyInstance.delete(`quizzes/${slug}/questions/${id}/`).json();

export const getQuizAttempts = async () => {
  const data = await serverKyInstance
    .get("quizzes/quiz-attempts/")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as QuizAttempt[];
};

// talent section
export const getAvailableAssessments = async () => {
  const data = await serverKyInstance
    .get("quizzes/me/")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as SkillAssessmentQuiz[];
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
  const result = await serverKyInstance
    .post("quizzes/attempt-quiz/answer-question/", { json })
    .json<AttemptQuestionResponse>();
  return result;
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

export const createCompanyAssessment = async (
  data: Partial<typeof initialValues> & Record<string, unknown>
): Promise<ApiResponse<CompanySkillAssessment>> => {
  try {
    const result = await serverKyInstance
      .post("skill-assessments/company-assessments", { json: data })
      .json<CompanySkillAssessment>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export type AssessmentSectionInput = {
  name: string;
  type: "MCQ" | "CODING_TASK" | "OPEN_ENDED";
  mcq_questions?: {
    question: string;
    options: { value: string; index: number }[];
    correct_option_index: number;
    is_ai_generated?: boolean;
  }[];
  coding_tasks?: {
    title: string;
    description: string;
    difficulty_level: string;
    constraints?: string;
    sample_input?: string;
    sample_output?: string;
    max_score?: number;
    time_limit?: number;
    test_cases?: { input_data: string; expected_output: string; is_sample?: boolean }[];
  }[];
  open_ended_questions?: {
    question: string;
    grading_guidance?: string;
    max_score?: number;
  }[];
};

export const addSectionsToAssessment = async (
  id: ID,
  sections: AssessmentSectionInput[]
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const result = await serverKyInstance
      .post(`skill-assessments/company-assessments/${id}/add-sections`, {
        json: { sections },
      })
      .json<{ message: string }>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const listAssessmentBundles = async (params?: { role?: ID; search?: string }) => {
  try {
    const response = await serverKyInstance
      .get<PagedResource<AssessmentBundleSummary>>(
        "skill-assessments/question-bank/bundles/",
        {
          searchParams: {
            ...(params?.role ? { role: params.role } : {}),
            ...(params?.search ? { search: params.search } : {}),
          },
        }
      )
      .json();
    return response;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("listAssessmentBundles Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const addBundleToAssessment = async (
  id: ID,
  bundle_id: ID
): Promise<ApiResponse<{ message: string; section_ids: ID[] }>> => {
  try {
    const result = await serverKyInstance
      .post(`skill-assessments/company-assessments/${id}/sections/from-bundle/`, {
        json: { bundle_id },
      })
      .json<{ message: string; section_ids: ID[] }>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const publishCompanyAssessment = async (
  id: ID
): Promise<ApiResponse<CompanySkillAssessment>> => {
  try {
    const result = await serverKyInstance
      .post(`skill-assessments/company-assessments/${id}/publish/`)
      .json<CompanySkillAssessment>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const inviteCandidatesToAssessment = async (
  id: ID,
  invites: { email: string; name: string }[]
): Promise<ApiResponse<{ sent: string[]; failed: string[] }>> => {
  try {
    const result = await serverKyInstance
      .post(`skill-assessments/company-assessments/${id}/invite/`, {
        json: { invites },
      })
      .json<{ sent: string[]; failed: string[] }>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
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
    const result = await serverKyInstance
      .post(`skill-assessments/company-assessments/${id}/take`, { json: data })
      .json<CompanySkillAssessment>();
    return {
      success: true,
      data: result,
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
    const result = await serverKyInstance
      .post(`skill-assessments/company-assessments/${id}/take`, {
        json: {
          answers: [
            {
              coding_task_answers,
              section_id,
            },
          ],
        },
      })
      .json<CompanySkillAssessment>();
    return {
      success: true,
      data: result,
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
  const response = await serverKyInstance
    .get<PagedResource<SkillAssessmentResult>>(
      `skill-assessments/skill-assessment-results/${id}`
    )
    .json();
  return response;
};

export const initiateAssessmentPayment = async (
  id: ID,
  coupon_code?: string
) => {
  try {
    const result = await serverKyInstance
      .post("skill-assessments/initiate-assessment-payment/", {
        json: { assessment_id: id, coupon_code },
      })
      .json<{ payment_url?: string }>();
    return {
      success: true,
      data: result,
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
    const result = await serverKyInstance
      .post("skill-assessments/staff/add-mcq-assessment/", { body: data })
      .json<CompanySkillAssessment>();
    return {
      success: true,
      data: result,
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
    const result = await serverKyInstance
      .post("skill-assessments/staff/add-coding-assessment/", {
        json,
        searchParams: { v: 2 },
      })
      .json<CompanySkillAssessment>();
    return {
      success: true,
      data: result,
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

export const getAiFeedback = async (publicId: string) => {
  try {
    const response = await serverKyInstance
      .get<PagedResource<AiFeedbackItem>>(
        `skill-assessments/company-ai-applications/${publicId}/summary`
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
    const result = await serverKyInstance
      .patch(`skill-assessments/certificates/${id}/upload/`, { body: data })
      .json<AssessmentCert>();
    return {
      success: true,
      data: result,
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

export const getSubmissionSnapshots = async (
  submissionId: ID
): Promise<{ id: ID; image: string; created_at: string }[]> => {
  try {
    const response = await serverKyInstance
      .get<{ id: ID; image: string; created_at: string }[]>(
        `skill-assessments/submissions/${submissionId}/snapshots/`
      )
      .json();
    return response;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getSubmissionSnapshots Error: ", errMsg);
    return [];
  }
};

export const getSubmissionAnswers = async (submissionId: ID): Promise<SubmissionAnswers> => {
  const data = await serverKyInstance
    .get<SubmissionAnswers>(`skill-assessments/submissions/${submissionId}/answers/`)
    .json();
  return data;
};

// --- Staff-only Question Bank / Bundle CRUD, backing /admin/assessment/question-bank and /admin/assessment/bundles ---

export const getStaffQuestionBank = async (params?: { role?: ID; question_type?: string }) => {
  const data = await serverKyInstance
    .get<PagedResource<TalentQuestionBankEntry>>("skill-assessments/staff/question-bank/", {
      searchParams: {
        ...(params?.role ? { role: params.role } : {}),
        ...(params?.question_type ? { question_type: params.question_type } : {}),
      },
    })
    .json();
  return data;
};

export const createStaffQuestionBankEntry = async (
  payload: Record<string, unknown>
): Promise<ApiResponse<TalentQuestionBankEntry>> => {
  try {
    const result = await serverKyInstance
      .post("skill-assessments/staff/question-bank/", { json: payload })
      .json<TalentQuestionBankEntry>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const updateStaffQuestionBankEntry = async (
  id: ID,
  payload: Record<string, unknown>
): Promise<ApiResponse<TalentQuestionBankEntry>> => {
  try {
    const result = await serverKyInstance
      .patch(`skill-assessments/staff/question-bank/${id}/`, { json: payload })
      .json<TalentQuestionBankEntry>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const deleteStaffQuestionBankEntry = async (id: ID): Promise<ApiResponse<null>> => {
  try {
    await serverKyInstance.delete(`skill-assessments/staff/question-bank/${id}/`);
    return { success: true, data: null };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const getStaffBundles = async (params?: { role?: ID }) => {
  const data = await serverKyInstance
    .get<PagedResource<AssessmentBundleAdmin>>("skill-assessments/staff/bundles/", {
      searchParams: params?.role ? { role: params.role } : {},
    })
    .json();
  return data;
};

export const createStaffBundle = async (
  payload: Record<string, unknown>
): Promise<ApiResponse<AssessmentBundleAdmin>> => {
  try {
    const result = await serverKyInstance
      .post("skill-assessments/staff/bundles/", { json: payload })
      .json<AssessmentBundleAdmin>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const updateStaffBundle = async (
  id: ID,
  payload: Record<string, unknown>
): Promise<ApiResponse<AssessmentBundleAdmin>> => {
  try {
    const result = await serverKyInstance
      .patch(`skill-assessments/staff/bundles/${id}/`, { json: payload })
      .json<AssessmentBundleAdmin>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const deleteStaffBundle = async (id: ID): Promise<ApiResponse<null>> => {
  try {
    await serverKyInstance.delete(`skill-assessments/staff/bundles/${id}/`);
    return { success: true, data: null };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const gradeOpenEndedAnswers = async (
  submissionId: ID,
  answers: { answer_id: ID; score: number; feedback?: string }[]
): Promise<
  ApiResponse<{ message: string; finalized: boolean; score?: number; passed?: boolean }>
> => {
  try {
    const result = await serverKyInstance
      .post(`skill-assessments/submissions/${submissionId}/grade-open-ended/`, {
        json: { answers },
      })
      .json<{ message: string; finalized: boolean; score?: number; passed?: boolean }>();
    return { success: true, data: result };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};
