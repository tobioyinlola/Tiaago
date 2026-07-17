"use server";

import { FunnelSummary } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getFunnelSummary = async () => {
  const data = await serverKyInstance
    .get<FunnelSummary>("analytics/funnel/")
    .json();
  return data;
};
