"use server";

import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";
import { TalentNetworkJoinPayload } from "../constants/talent-network";

// Next.js requires every export from a "use server" file to be an async
// function -- the option lists/types live in constants/talent-network.ts
// instead. Re-exporting the type here is compile-time-only (erased), so it
// doesn't violate that rule.
export type { TalentNetworkJoinPayload };

export const joinTalentNetwork = async (payload: TalentNetworkJoinPayload) => {
  try {
    const data = await serverKyInstance
      .post("talent-network/join/", { json: payload })
      .json<{ message: string }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getTalentNetworkConfirmation = async (token: string) => {
  try {
    const data = await serverKyInstance
      .get(`talent-network/confirm/${token}/`)
      .json<{ first_name: string; email: string; status: string }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const confirmTalentNetworkMembership = async (token: string) => {
  try {
    const data = await serverKyInstance
      .post(`talent-network/confirm/${token}/`)
      .json<{ message: string; status: string }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};
