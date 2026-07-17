"use server";

import { GrowthSummary } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getGrowthSummary = async () => {
  const data = await serverKyInstance
    .get<GrowthSummary>("analytics/growth/")
    .json();
  return data;
};
