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
