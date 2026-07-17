"use server";

import { AssessmentIntelligenceSummary } from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";

export const getAssessmentIntelligenceSummary = async () => {
  const data = await serverKyInstance
    .get<AssessmentIntelligenceSummary>("analytics/assessments/")
    .json();
  return data;
};
