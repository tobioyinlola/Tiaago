"use server";

import { OverviewMetrics } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getOverviewMetrics = async () => {
  const data = await serverKyInstance
    .get<OverviewMetrics>("analytics/overview/")
    .json();
  return data;
};
