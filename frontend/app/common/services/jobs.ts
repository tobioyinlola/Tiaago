"use server";
import { handleServerApiCallError } from "../utils";
import axiosInstance from "../utils/axios.instance";
import serverKyInstance from "../utils/server-ky.instance";
import { ApiResponse, ID, Job, JobApplication, PagedResource } from "../types";
import { InitialValues as JobFormPayload } from "@/app/startups/dashboard/jobs/create/CreateJobForm/form.constants";

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

export const getJob = async (id: ID): Promise<Job | undefined> => {
  try {
    const data = await serverKyInstance.get<Job>("jobs/" + id).json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getJob Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const createJob = async (
  job: JobFormPayload
): Promise<ApiResponse<Job>> => {
  try {
    const response = await axiosInstance.post<Job>("jobs/", job);
    return {
      success: true,
      data: response.data,
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

export const submitJobApplication = async (jobId: ID, cover_letter: string) => {
  try {
    const response = await axiosInstance.post<JobApplication>(
      `jobs/${jobId}/apply/`,
      { cover_letter }
    );
    return {
      success: true,
      data: response.data,
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
  jobId: ID,
  job: Partial<JobFormPayload>
): Promise<ApiResponse<Job>> => {
  try {
    const response = await axiosInstance.patch<Job>(`jobs/${jobId}/`, job);
    return {
      success: true,
      data: response.data,
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
  jobId: ID,
  job_status: Job["job_status"]
) => {
  try {
    const response = await axiosInstance.patch<Job>(`jobs/${jobId}/`, {
      job_status,
    });
    return {
      success: true,
      data: response.data,
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

export const deleteJob = async (jobId: ID) => {
  try {
    const response = await axiosInstance.delete(`jobs/${jobId}/delete`);
    return {
      success: true,
      data: response.data,
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
