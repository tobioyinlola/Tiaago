"use server";

import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";

export const lookupUnsubscribeToken = async (token: string) => {
  try {
    const data = await serverKyInstance
      .get("email/unsubscribe/", { searchParams: { token } })
      .json<{ email: string; campaign_name: string }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const confirmUnsubscribe = async (token: string, reason?: string) => {
  try {
    const data = await serverKyInstance
      .post("email/unsubscribe/", { json: { token, reason } })
      .json<{ status: string; email: string }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};
