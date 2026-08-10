"use server";

import { ApiResponse, ID, PagedResource } from "../types";
import { ReportDetail, ReportListItem, ReportType } from "../types/reports.type";
import { _handleServerApiCallError, handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export const getReports = async (page = 1): Promise<PagedResource<ReportListItem> | null> => {
  try {
    const data = await serverKyInstance
      .get("reports/", { searchParams: { page } })
      .json<PagedResource<ReportListItem>>();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getReports Error: ", errMsg);
    return null;
  }
};

export const getReport = async (id: ID): Promise<ApiResponse<ReportDetail>> => {
  try {
    const data = await serverKyInstance.get(`reports/${id}/`).json<ReportDetail>();
    return { success: true, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("getReport Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export type GenerateReportPayload = {
  name: string;
  report_type: ReportType;
  job_ids: ID[];
  date_from: string;
  date_to: string;
};

export const generateReport = async (
  payload: GenerateReportPayload
): Promise<ApiResponse<{ reportId: ID }>> => {
  try {
    const data = await serverKyInstance
      .post("reports/", { json: payload })
      .json<{ reportId: ID }>();
    return { success: true, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("generateReport Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const regenerateReport = async (id: ID): Promise<ApiResponse<ReportDetail>> => {
  try {
    const data = await serverKyInstance.post(`reports/${id}/regenerate/`).json<ReportDetail>();
    return { success: true, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("regenerateReport Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const deleteReport = async (id: ID): Promise<ApiResponse<null>> => {
  try {
    await serverKyInstance.delete(`reports/${id}/`);
    return { success: true, data: null };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    console.log("deleteReport Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};
