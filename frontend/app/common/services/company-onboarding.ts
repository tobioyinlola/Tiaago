"use server";

import { CompanyOnboarding } from "../types";
import axiosInstance from "../utils/axios.instance";
import { _handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export const getCompanyOnboarding = async (): Promise<CompanyOnboarding> => {
  const data = await serverKyInstance
    .get<CompanyOnboarding>("auth/company-onboarding/")
    .json();
  return data;
};

export type CompanyOnboardingInput = Partial<
  Omit<
    CompanyOnboarding,
    | "onboarding_completed_at"
    | "onboarding_skipped_at"
    | "has_completed_onboarding"
    | "has_skipped_onboarding"
  >
> & {
  /** Marks onboarding as finished — the cards never show again. */
  complete?: boolean;
  /** Defers onboarding: no forced redirect, but the flow stays resumable. */
  skip?: boolean;
};

export const updateCompanyOnboarding = async (
  input: CompanyOnboardingInput
) => {
  try {
    const { data } = await axiosInstance.patch<CompanyOnboarding>(
      "/auth/company-onboarding/",
      input
    );
    return {
      success: true as const,
      data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("Update company onboarding error: ", errMsg);
    console.log("Update company onboarding error map: ", errorMap);
    return {
      success: false as const,
      error: errMsg,
    };
  }
};
