"use server";
import { HTTPError } from "ky";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";
import {
  ApiResponse,
  AssessmentQuestionSection,
  ApplicationEligibilityCheck,
  ApplicationWorkSample,
  ApplicationScenarioResponse,
  ApplicationPracticalAssessment,
  ApplicationReadiness,
  RecoveryQueue,
  ReadinessStatus,
  PracticalAssessmentSlot,
  ID,
  InterviewSlotInput,
  HiringProfilesResponse,
  Job,
  JobApplication,
  PagedResource,
  PipelineStepStatus,
} from "../types";
import { InitialValues as JobFormPayload } from "@/app/recruiter/dashboard/jobs/create/CreateJobForm/form.constants";

export type JobCreatePayload = Omit<JobFormPayload, "hiring_type" | "payment_range"> & {
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
  ai_interview_enabled?: boolean;
  ai_interview_duration_minutes?: number;
  ai_interview_questions_count?: number;
  ai_interview_window_hours?: number;
  /** Null when the AI interview is off -- the field is nullable server-side. */
  ai_interview_pass_mark?: number | null;
  interview_type?: "IN_HOUSE" | "GOOGLE_MEET" | "ZOOM" | "OTHER";
  interview_duration_minutes?: number;
  interview_meeting_url?: string;
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

/** The backend returns an empty, disabled response until the company has
 * been approved for the configurable-hiring rollout. Keeping that switch on
 * the server means a browser cannot opt itself into an unfinished release. */
export const getHiringProfiles = async (): Promise<HiringProfilesResponse> => {
  try {
    return await serverKyInstance.get("jobs/hiring-profiles/").json<HiringProfilesResponse>();
  } catch (error) {
    console.log("getHiringProfiles Error: ", error);
    return { enabled: false, profiles: [] };
  }
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

export interface DashboardStats {
  active_jobs: number;
  standalone_assessments: number;
  pipeline_candidates: number;
  outreach_sent: number;
}

/** The recruiter dashboard's 4 headline stat cards, in one call. Never
 * throws: a failed fetch falls back to all-zero cards rather than breaking
 * the dashboard. */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    return await serverKyInstance.get<DashboardStats>("jobs/dashboard-stats/").json();
  } catch (error) {
    console.log("getDashboardStats Error: ", error);
    return { active_jobs: 0, standalone_assessments: 0, pipeline_candidates: 0, outreach_sent: 0 };
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

export type SignedInJobApplicationPayload = Omit<GuestJobApplicationPayload, "full_name" | "email" | "phone_number" | "terms_accepted">;

/** Signed-in talent application, through the same published journey as the
 * guest form (CV, LinkedIn, extra answer, declarations, work sample, scenario). */
export const submitSignedInJobApplication = async (
  applyToken: string,
  payload: SignedInJobApplicationPayload
): Promise<ApiResponse<JobApplication>> => {
  try {
    const formData = new FormData();
    if (payload.linkedin_url) formData.set("linkedin_url", payload.linkedin_url);
    if (payload.resume) formData.set("resume", payload.resume);
    formData.set("cover_letter", payload.cover_letter || "");
    formData.set("additional_info", payload.additional_info || "");
    if (payload.work_sample) formData.set("work_sample", payload.work_sample);
    formData.set("work_sample_note", payload.work_sample_note || "");
    // The signed-in endpoint's response nests the stored scenario record under
    // `scenario_response`, so the written answer is sent as scenario_response_text.
    formData.set("scenario_response_text", payload.scenario_response || "");
    if (payload.eligibility_declarations) {
      formData.set("eligibility_declarations", JSON.stringify(payload.eligibility_declarations));
    }
    const data = await serverKyInstance
      .post(`jobs/apply/${applyToken}/apply/`, { body: formData })
      .json<JobApplication>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("submitSignedInJobApplication Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export type GuestJobApplicationPayload = {
  full_name: string;
  email: string;
  phone_number: string;
  linkedin_url?: string;
  resume?: File;
  cover_letter?: string;
  additional_info?: string;
  work_sample?: File;
  work_sample_note?: string;
  scenario_response?: string;
  /** Candidate statements for the published job's reviewed eligibility rules.
   * They are declarations only; the hiring team records the final decision. */
  eligibility_declarations?: Record<string, boolean>;
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
    if (payload.linkedin_url) formData.set("linkedin_url", payload.linkedin_url);
    if (payload.resume) formData.set("resume", payload.resume);
    formData.set("cover_letter", payload.cover_letter || "");
    formData.set("additional_info", payload.additional_info || "");
    if (payload.work_sample) formData.set("work_sample", payload.work_sample);
    formData.set("work_sample_note", payload.work_sample_note || "");
    formData.set("scenario_response", payload.scenario_response || "");
    if (payload.eligibility_declarations) {
      formData.set("eligibility_declarations", JSON.stringify(payload.eligibility_declarations));
    }
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

/** Applications with at least one declaration that a recruiter still needs
 * to decide. The backend scopes this to the current recruiter's company. */
export const getEligibilityReviewQueue = async (page = 1, page_size = 50) => {
  try {
    return await serverKyInstance
      .get<PagedResource<JobApplication>>("jobs/job-applications/eligibility-review/", {
        searchParams: { page, page_size },
      })
      .json();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getEligibilityReviewQueue Error: ", errMsg);
    throw Error(errMsg);
  }
};

export type EligibilityReviewDecision = Exclude<ApplicationEligibilityCheck["status"], "PENDING">;

/** Records the recruiter's human decision. A candidate declaration never
 * changes a check to pass by itself. */
export const reviewApplicationEligibilityCheck = async (
  applicationId: ID,
  checkId: ID,
  status: EligibilityReviewDecision,
  reason = ""
): Promise<ApiResponse<ApplicationEligibilityCheck>> => {
  try {
    const data = await serverKyInstance
      .patch(`jobs/job-applications/${applicationId}/eligibility/${checkId}/`, {
        json: { status, reason },
      })
      .json<ApplicationEligibilityCheck>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("reviewApplicationEligibilityCheck Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const getWorkSampleReviewQueue = async (page = 1, page_size = 50) => {
  try {
    return await serverKyInstance
      .get<PagedResource<JobApplication>>("jobs/job-applications/work-sample-review/", {
        searchParams: { page, page_size },
      })
      .json();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    throw Error(errMsg);
  }
};

export type WorkSampleReviewDecision = ApplicationWorkSample["status"];

export const reviewApplicationWorkSample = async (
  applicationId: ID,
  sampleId: ID,
  status: WorkSampleReviewDecision,
  reviewer_reason = "",
  scores?: Record<string, number>,
  score_notes?: Record<string, string>
): Promise<ApiResponse<ApplicationWorkSample>> => {
  try {
    const data = await serverKyInstance
      .patch(`jobs/job-applications/${applicationId}/work-samples/${sampleId}/`, {
        json: { status, reviewer_reason, ...(scores ? { scores } : {}), ...(score_notes ? { score_notes } : {}) },
      })
      .json<ApplicationWorkSample>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const getScenarioReviewQueue = async (page = 1, page_size = 50) => {
  try {
    return await serverKyInstance
      .get<PagedResource<JobApplication>>("jobs/job-applications/scenario-review/", {
        searchParams: { page, page_size },
      })
      .json();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    throw Error(errMsg);
  }
};

export const reviewApplicationScenarioResponse = async (
  applicationId: ID,
  responseId: ID,
  status: WorkSampleReviewDecision,
  reviewer_reason = "",
  scores?: Record<string, number>,
  score_notes?: Record<string, string>
): Promise<ApiResponse<ApplicationScenarioResponse>> => {
  try {
    const data = await serverKyInstance
      .patch(`jobs/job-applications/${applicationId}/scenario-responses/${responseId}/`, {
        json: { status, reviewer_reason, ...(scores ? { scores } : {}), ...(score_notes ? { score_notes } : {}) },
      })
      .json<ApplicationScenarioResponse>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const getReadinessQueue = async (page = 1, page_size = 50) => {
  try {
    return await serverKyInstance
      .get<PagedResource<ApplicationReadiness>>("jobs/job-applications/readiness/", {
        searchParams: { page, page_size },
      })
      .json();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    throw Error(errMsg);
  }
};

export type ReadinessUpdateInput = {
  readiness_status: Exclude<ReadinessStatus, "NOT_STARTED">;
  readiness_target_start_date?: string | null;
  readiness_note?: string;
};

export const updateApplicationReadiness = async (
  applicationId: ID,
  input: ReadinessUpdateInput
): Promise<ApiResponse<ApplicationReadiness>> => {
  try {
    const data = await serverKyInstance
      .patch(`jobs/job-applications/${applicationId}/readiness/`, { json: input })
      .json<ApplicationReadiness>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const getPracticalAssessmentReviewQueue = async (page = 1, page_size = 50) => {
  try {
    return await serverKyInstance
      .get<PagedResource<JobApplication>>("jobs/job-applications/practical-assessment-review/", {
        searchParams: { page, page_size },
      })
      .json();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    throw Error(errMsg);
  }
};

export type PracticalAssessmentReviewInput = {
  outcome: "PASS" | "FAIL";
  observations?: string;
  critical_failure?: boolean;
  critical_failure_reason?: string;
  scores?: Record<string, number>;
  score_notes?: Record<string, string>;
};

export const reviewApplicationPracticalAssessment = async (
  applicationId: ID,
  assessmentId: ID,
  input: PracticalAssessmentReviewInput
): Promise<ApiResponse<ApplicationPracticalAssessment>> => {
  try {
    const data = await serverKyInstance
      .patch(`jobs/job-applications/${applicationId}/practical-assessments/${assessmentId}/`, { json: input })
      .json<ApplicationPracticalAssessment>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const getPracticalAssessmentSlots = async (jobPublicId: string): Promise<PracticalAssessmentSlot[]> => {
  try {
    return await serverKyInstance.get(`jobs/${jobPublicId}/practical-assessment-slots/`).json<PracticalAssessmentSlot[]>();
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    throw Error(errMsg);
  }
};

export const createPracticalAssessmentSlot = async (
  jobPublicId: string,
  slot: Pick<PracticalAssessmentSlot, "starts_at" | "ends_at" | "location" | "capacity" | "instructions">
): Promise<ApiResponse<PracticalAssessmentSlot>> => {
  try {
    const data = await serverKyInstance
      .post(`jobs/${jobPublicId}/practical-assessment-slots/`, { json: slot })
      .json<PracticalAssessmentSlot>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const scheduleApplicationPracticalAssessment = async (
  applicationId: ID,
  slotId: ID
): Promise<ApiResponse<ApplicationPracticalAssessment>> => {
  try {
    const data = await serverKyInstance
      .post(`jobs/job-applications/${applicationId}/practical-assessments/`, { json: { slot_id: slotId } })
      .json<ApplicationPracticalAssessment>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false, error: errMsg };
  }
};

export const updateJobApplicationStatus = async (
  id: ID,
  status: JobApplication["status"],
  rejectionReason?: string
): Promise<ApiResponse<JobApplication>> => {
  try {
    const data = await serverKyInstance
      .put(`jobs/job-applications/${id}/`, {
        json: {
          status,
          ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
        },
      })
      .json<JobApplication>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateJobApplicationStatus Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const updateJob = async (
  publicId: string,
  job: Partial<JobCreatePayload>
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


// ---- Recovery queue (held transitions + undelivered candidate messages) ----

export const getRecoveryQueue = async (): Promise<RecoveryQueue> => {
  try {
    return await serverKyInstance.get<RecoveryQueue>("jobs/recovery-queue/").json();
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const runRecoveryAction = async (
  kind: "holds" | "notifications",
  id: ID,
  action: "retry" | "dismiss",
  note?: string
): Promise<ApiResponse<{ result: string }>> => {
  try {
    const data = await serverKyInstance
      .post(`jobs/recovery-queue/${kind}/${id}/${action}/`, { json: note ? { note } : {} })
      .json<{ result: string }>();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: await handleServerApiCallError(error) };
  }
};

// ---- Practical assessments: attendance and candidate self-booking link ----

export const recordPracticalAttendance = async (
  applicationId: ID,
  assessmentId: ID,
  status: "NO_SHOW" | "CANCELLED",
  reason: string
): Promise<ApiResponse<ApplicationPracticalAssessment>> => {
  try {
    const data = await serverKyInstance
      .patch(`jobs/job-applications/${applicationId}/practical-assessments/${assessmentId}/attendance/`, {
        json: { status, reason },
      })
      .json<ApplicationPracticalAssessment>();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: await handleServerApiCallError(error) };
  }
};

export const createPracticalBookingLink = async (
  applicationId: ID
): Promise<ApiResponse<{ url: string; notification_status: string }>> => {
  try {
    const data = await serverKyInstance
      .post(`jobs/job-applications/${applicationId}/practical-booking-link/`)
      .json<{ url: string; notification_status: string }>();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: await handleServerApiCallError(error) };
  }
};

// ---- Assisted (phone / walk-in) intake ----

export type AssistedIntakePayload = {
  full_name: string;
  phone_number: string;
  email?: string;
  channel: "PHONE" | "IN_PERSON" | "AGENT";
  consent_confirmed: boolean;
  intake_notes?: string;
  additional_info?: string;
  cover_letter?: string;
  linkedin_url?: string;
  scenario_response?: string;
  eligibility_declarations?: Record<string, boolean>;
};

export const submitAssistedApplication = async (
  jobPublicId: string,
  payload: AssistedIntakePayload
): Promise<ApiResponse<{ id: ID }>> => {
  try {
    const data = await serverKyInstance
      .post(`jobs/${jobPublicId}/assisted-applications/`, { json: payload })
      .json<{ id: ID }>();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: await handleServerApiCallError(error) };
  }
};
