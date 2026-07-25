"use server";

import { PipelineSummary } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getPipelineSummary = async (zeroPipelinePage?: number) => {
  const searchParams: Record<string, string> = {};
  if (zeroPipelinePage) searchParams.zero_pipeline_page = String(zeroPipelinePage);

  const data = await serverKyInstance
    .get<PipelineSummary>("analytics/pipeline/", { searchParams })
    .json();
  return data;
};
