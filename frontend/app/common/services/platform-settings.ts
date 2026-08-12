"use server";

import serverKyInstance from "../utils/server-ky.instance";
import { _handleServerApiCallError } from "../utils";

export type PlatformSettingRow = {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by: string | null;
};

export const getPlatformSettings = async (): Promise<PlatformSettingRow[]> => {
  const data = await serverKyInstance.get<PlatformSettingRow[]>("subscriptions/platform-settings/").json();
  return data;
};

export const updatePlatformSettingValue = async (key: string, value: string) => {
  try {
    const data = await serverKyInstance
      .patch(`subscriptions/platform-settings/${key}/`, { json: { value } })
      .json<PlatformSettingRow>();
    return { success: true as const, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};
