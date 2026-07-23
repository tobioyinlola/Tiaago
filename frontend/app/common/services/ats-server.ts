"use server";

import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";
import { AtsProvider } from "./ats";

export type AvailableAtsIntegration = {
  provider: AtsProvider;
  display_name: string;
  logo: string | null;
};

/** The ATS platforms actually connectable right now -- the intersection of
 * what's configured in this Nango account and what we have a provider
 * module for. Fetched server-side since it's account-wide, not per-request
 * interactive state. */
export const getAvailableAtsIntegrations = async () => {
  try {
    const data = await serverKyInstance
      .get("ats/available-integrations/")
      .json<{ results: AvailableAtsIntegration[] }>();
    return { success: true as const, data: data.results };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};
