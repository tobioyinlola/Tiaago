import clientKyInstance from "../utils/client-ky.instance";
import { handleServerApiCallError } from "../utils";
import { ID } from "../types";

// These calls are client-driven on purpose: the flow needs to react to
// @nangohq/frontend's browser-side Connect UI events (open modal -> user
// authorizes -> 'connect' event) in real time, so there's no natural place
// for a server action to sit in the middle of it.

// Values must exactly equal the Nango integration's Unique Key -- see
// ats_integrations.models.AtsProvider on the backend for why these carry
// auth-type suffixes (e.g. "lever-basic") rather than the bare provider name.
export type AtsProvider =
  | "greenhouse"
  | "lever-basic"
  | "workable"
  | "smartrecruiters-api-key"
  | "zoho-recruit"
  | "ashby"
  | "gem"
  | "breezy-hr"
  | "jazzhr"
  | "jobvite"
  | "recruiterflow"
  | "recruitee"
  | "teamtailor";

export type AtsConnectionStatus = "PENDING" | "CONNECTED" | "SYNCING" | "SYNCED" | "FAILED";

export type AtsConnection = {
  id: ID;
  provider: AtsProvider;
  status: AtsConnectionStatus;
  candidates_synced: number;
  jobs_synced: number;
  error_message: string;
  connected_at: string | null;
  synced_at: string | null;
  disconnected_at: string | null;
  created_at: string;
};

export type AtsConnectSessionResponse = {
  connection_id: ID;
  session_token: string;
  expires_at: string;
};

export const createAtsConnectSession = async (provider: AtsProvider) => {
  try {
    const data = await clientKyInstance
      .post("ats/connect-session/", { json: { provider } })
      .json<AtsConnectSessionResponse>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const triggerAtsSync = async (
  connectionId: ID,
  payload?: { nango_connection_id: string; provider_config_key: string }
) => {
  try {
    const data = await clientKyInstance
      .post(`ats/connections/${connectionId}/sync/`, { json: payload || {} })
      .json<AtsConnection>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getAtsConnection = async (connectionId: ID) => {
  try {
    const data = await clientKyInstance.get(`ats/connections/${connectionId}/`).json<AtsConnection>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const listAtsConnections = async () => {
  try {
    const data = await clientKyInstance
      .get("ats/connections/")
      .json<{ count: number; results: AtsConnection[] }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};
