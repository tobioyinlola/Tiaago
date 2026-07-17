"use server";

import { RevenueSummary } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getRevenueSummary = async ({
  days = 30,
  page = 1,
}: { days?: 30 | 90; page?: number } = {}) => {
  const data = await serverKyInstance
    .get<RevenueSummary>("analytics/revenue/", { searchParams: { days, page } })
    .json();
  return data;
};
