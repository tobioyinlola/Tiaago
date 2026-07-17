"use server";

import { PagedResource } from "../types";
import { AdminProctoringOverview, AdminHighRiskSession, ProctoringReport } from "../types/proctoring.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getAdminProctoringOverview = async () => {
  const data = await serverKyInstance.get("proctoring/admin/overview/").json<AdminProctoringOverview>();
  return data;
};

export const getAdminHighRiskSessions = async (page = 1) => {
  const data = await serverKyInstance
    .get("proctoring/admin/sessions/", { searchParams: { page } })
    .json<PagedResource<AdminHighRiskSession>>();
  return data;
};

export const getProctoringReport = async (submissionId: string | number) => {
  const data = await serverKyInstance.get(`proctoring/report/${submissionId}/`).json<ProctoringReport>();
  return data;
};
