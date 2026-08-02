"use server";
import { HTTPError } from "ky";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";
import {
  ApiResponse,
  AssessmentQuestionSection,
  ID,
  InterviewSlotInput,
  Job,
  JobApplication,
  PagedResource,
  PipelineStepStatus,
} from "../types";
import { InitialValues as JobFormPayload } from "@/app/recruiter/dashboard/jobs/create/CreateJobForm/form.constants";

type JobCreatePayload = Omit<JobFormPayload, "hiring_type" | "payment_range"> & {
  // hiring_type is no longer collected in the wizard -- omitted, backend defaults it.
  hiring_type?: JobFormPayload["hiring_type"];
  // payment_range is resolved into payment_range_usd/payment_range_ngn before sending.
  payment_range?: string;
  payment_range_usd?: string;
  payment_range_ngn?: string;
  screening_threshold?: number;
  passing_grade?: number;
  assessment_time_limit?: number;
  interview_slots?: InterviewSlotInput[];
  assessment_questions?: AssessmentQuestionSection[];
  proctoring_enabled?: boolean;
  require_fullscreen?: boolean;
  require_webcam?: boolean;
  webcam_snapshots_enabled?: boolean;
  snapshot_interval_seconds?: number;
  max_tab_switches_before_warning?: number;
  max_tab_switches_before_termination?: number;
  copy_paste_blocked?: boolean;
  right_click_blocked?: boolean;
  devtools_detection_enabled?: boolean;
  force_submit_on_critical_violation?: boolean;
};

export const getJobs = async (
  page = 1,
  page_size = 10,
  role?: string,
  location?: string
) => {
  const data = await serverKyInstance
    .get<PagedResource<Job>>("jobs", {
      searchParams: {
        page,
        page_size,
        ...(role ? { role } : {}),
        ...(location ? { location } : {}),
      },
    })
    .json();
  return data;
};

/** Recruiter/admin/talent-dashboard lookup -- requires auth + ownership,
 * keyed on the non-guessable public_id (never the raw int id). */
export const getJob = async (publicId: string): Promise<Job | undefined> => {
  try {
    const data = await serverKyInstance.get<Job>("jobs/" + publicId).json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getJob Error: ", errMsg);
    throw Error(errMsg);
  }
};

/** Public candidate-facing lookup -- always keyed on apply_token, the
 * non-guessable identifier designed for this. No unauthenticated fallback
 * to an int id. */
export const getPublicJob = async (applyToken: string): Promise<Job | undefined> => {
  try {
    const data = await serverKyInstance.get<Job>(`jobs/apply/${applyToken}`).json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getPublicJob Error: ", errMsg);
    throw Error(errMsg);
  }
};

/** Fire-and-forget view counter for the public job page -- call once from
 * that page only (not the apply/application-complete pages, which would
 * otherwise inflate the count across a single candidate's journey). Never
 * throws: a tracking failure must never break the page it's called from. */
export const trackJobView = async (applyToken: string): Promise<void> => {
  try {
    await serverKyInstance.post(`jobs/apply/${applyToken}/track-view/`);
  } catch (error) {
    console.log("trackJobView Error: ", error);
  }
};

/** Basic public/approved-only job data (title, company) keyed on public_id --
 * for pages (like a talent's own interview-slots page) that only have a
 * job's public_id and aren't its owning recruiter, so getJob()'s owner-only
 * auth doesn't apply. */
export const getPublicJobByPublicId = async (publicId: string): Promise<Job | undefined> => {
  try {
    const data = await serverKyInstance.get<Job>(`jobs/job-detail/by-public-id/${publicId}`).json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getPublicJobByPublicId Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const createJob = async (
  job: JobCreatePayload
): Promise<ApiResponse<Job>> => {
  try {
    const data = await serverKyInstance
      .post("jobs/", { json: job })
      .json<Job>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("createJob Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export type JobDraft = {
  id: ID;
  draft_data: Record<string, unknown>;
  job_status: "DRAFT";
  last_updated: string;
};

export const getJobDraft = async (): Promise<JobDraft | null> => {
  try {
    return await serverKyInstance.get("jobs/draft/").json<JobDraft>();
  } catch (error) {
    if (error instanceof HTTPError && error.response?.status === 404) return null;
    throw error;
  }
};

export const saveJobDraft = async (draft_data: Record<string, unknown>) => {
  try {
    const data = await serverKyInstance
      .post("jobs/draft/", { json: { draft_data } })
      .json<JobDraft>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deleteJobDraft = async () => {
  try {
    await serverKyInstance.delete("jobs/draft/");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

/** Kicks off async assessment-question generation (job-creation wizard Step 3)
 * and returns immediately with a request_id -- the AI call itself (up to ~4min
 * across sequential categories for technical roles) now runs in a Celery task
 * instead of blocking this request. Poll getAssessmentGenerationStatus with the
 * returned request_id until status is READY/FAILED. */
export const startAssessmentGeneration = async (details: {
  role: ID;
  description: string;
  job_requirement: string;
  job_level?: string;
}): Promise<ApiResponse<{ request_id: string }>> => {
  try {
    const data = await serverKyInstance
      .post("jobs/generate-assessment-questions/", { json: details })
      .json<{ request_id: string }>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("startAssessmentGeneration Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export type AssessmentGenerationStatus = {
  status: PipelineStepStatus;
  sections: AssessmentQuestionSection[] | null;
  error: string;
};

export const getAssessmentGenerationStatus = async (
  requestId: string
): Promise<ApiResponse<AssessmentGenerationStatus>> => {
  try {
    const data = await serverKyInstance
      .get(`jobs/generate-assessment-questions/${requestId}/status/`)
      .json<AssessmentGenerationStatus>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getAssessmentGenerationStatus Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const submitJobApplication = async (jobId: ID, cover_letter: string) => {
  try {
    const data = await serverKyInstance
      .post(`jobs/${jobId}/apply/`, { json: { cover_letter } })
      .json<JobApplication>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("submitJobApplication Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export type GuestJobApplicationPayload = {
  full_name: string;
  email: string;
  phone_number: string;
  linkedin_url: string;
  resume: File;
  cover_letter?: string;
  additional_info?: string;
  terms_accepted: boolean;
};

export const submitGuestJobApplication = async (
  applyToken: string,
  payload: GuestJobApplicationPayload
): Promise<ApiResponse<JobApplication>> => {
  try {
    const formData = new FormData();
    formData.set("full_name", payload.full_name);
    formData.set("email", payload.email);
    formData.set("phone_number", payload.phone_number);
    formData.set("linkedin_url", payload.linkedin_url);
    formData.set("resume", payload.resume);
    formData.set("cover_letter", payload.cover_letter || "");
    formData.set("additional_info", payload.additional_info || "");
    formData.set("terms_accepted", String(payload.terms_accepted));

    const data = await serverKyInstance
      .post(`jobs/apply/${applyToken}/guest/`, { body: formData })
      .json<JobApplication>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("submitGuestJobApplication Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const getJobApplications = async (page = 1, page_size = 10) => {
  try {
    const data = await serverKyInstance
      .get<PagedResource<JobApplication>>(`jobs/job-applications`, {
        searchParams: {
          page,
          page_size,
        },
      })
      .json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getJobApplications Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const updateJob = async (
  publicId: string,
  job: Partial<JobFormPayload>
): Promise<ApiResponse<Job>> => {
  try {
    const data = await serverKyInstance
      .patch(`jobs/${publicId}/`, { json: job })
      .json<Job>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateJob Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const updateJobStatus = async (
  publicId: string,
  job_status: Job["job_status"]
) => {
  try {
    const data = await serverKyInstance
      .patch(`jobs/${publicId}/`, { json: { job_status } })
      .json<Job>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateJobStatus Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const deleteJob = async (publicId: string) => {
  try {
    const data = await serverKyInstance
      .delete(`jobs/${publicId}/delete`)
      .json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("deleteJob Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};
