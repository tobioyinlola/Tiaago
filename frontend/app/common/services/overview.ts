"use server";

import { OverviewMetrics, TrafficSummary } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getOverviewMetrics = async () => {
  const data = await serverKyInstance
    .get<OverviewMetrics>("analytics/overview/")
    .json();
  return data;
};

export const getTrafficSummary = async () => {
  const data = await serverKyInstance
    .get<TrafficSummary>("analytics/traffic/")
    .json();
  return data;
};
