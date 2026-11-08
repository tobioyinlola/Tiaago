"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "../constants";
import { CompanyOnboarding } from "../types";
import { _handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

export const getCompanyOnboarding = async (): Promise<CompanyOnboarding> => {
  const data = await serverKyInstance
    .get<CompanyOnboarding>("auth/company-onboarding/", { cache: "no-store" })
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
    const data = await serverKyInstance.patch("auth/company-onboarding/", {
      json: input,
    }).json<CompanyOnboarding>();
    console.info("Company onboarding API save", {
      apiUrl: API_URL,
      fields: Object.keys(input),
      complete: input.complete === true,
      skip: input.skip === true,
      completed: data.has_completed_onboarding,
      skipped: data.has_skipped_onboarding,
    });
    if (input.complete && !data.has_completed_onboarding) {
      return {
        success: false as const,
        error: "Your setup was saved, but completion was not confirmed. Please try Finish again.",
      };
    }
    if (input.skip && !data.has_skipped_onboarding && !data.has_completed_onboarding) {
      return {
        success: false as const,
        error: "We couldn't save your setup preference. Please try again.",
      };
    }
    if (input.complete || input.skip) {
      revalidatePath("/recruiter", "layout");
    }
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
