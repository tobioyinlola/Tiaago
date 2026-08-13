"use server";

import serverKyInstance from "../utils/server-ky.instance";
import { _handleServerApiCallError } from "../utils";

export type PricingConfigRow = {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by_admin: string | null;
};

export const getPricingConfig = async (): Promise<PricingConfigRow[]> => {
  const data = await serverKyInstance.get<PricingConfigRow[]>("subscriptions/pricing-config/").json();
  return data;
};

export type PublicPricingConfig = Record<string, string>;

/** No-auth-required subset of pricing values (resume screening/assessment/AI
 * interview prices, free tier limit) for the marketing site -- pricing page,
 * cost calculator, use-case pages -- so whatever an admin sets in
 * /admin/pricing shows up there directly instead of a hardcoded number that
 * silently drifts from what's actually charged. Returns {} (never throws) on
 * failure so a public page never breaks if the API is briefly unreachable --
 * callers fall back to their own hardcoded defaults in that case. */
export const getPublicPricingConfig = async (): Promise<PublicPricingConfig> => {
  try {
    return await serverKyInstance.get<PublicPricingConfig>("subscriptions/pricing-config/public/").json();
  } catch {
    return {};
  }
};

export const updatePricingConfigValue = async (key: string, value: string) => {
  try {
    const data = await serverKyInstance
      .patch(`subscriptions/pricing-config/${key}/`, { json: { value } })
      .json<PricingConfigRow>();
    return { success: true as const, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};
