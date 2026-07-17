"use server";

import { PipelineSummary } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getPipelineSummary = async () => {
  const data = await serverKyInstance
    .get<PipelineSummary>("analytics/pipeline/")
    .json();
  return data;
};
