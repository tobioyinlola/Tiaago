"use server";

import { SystemHealthSummary } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getSystemHealthSummary = async () => {
  const data = await serverKyInstance
    .get<SystemHealthSummary>("analytics/system/")
    .json();
  return data;
};
