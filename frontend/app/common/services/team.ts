"use server";

import { TeamListResponse, TeamMemberRole } from "../types";
import { _handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";
import { publicKyInstance } from "../utils/client-ky.instance";

export type TeamInviteValidation = {
  email: string;
  company: string;
  company_id: number;
  role: TeamMemberRole;
  status: "pending" | "accepted" | "revoked";
  is_expired: boolean;
  existing_user?: boolean;
  message?: string;
};

export const validateTeamInvite = async (token: string) => {
  try {
    const data = await publicKyInstance.get(`auth/invite/validate/${token}/`).json<TeamInviteValidation>();
    return { success: true as const, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const acceptTeamInvite = async (token: string) => {
  try {
    const data = await serverKyInstance.post(`auth/invite/accept/${token}/`).json<{ detail: string; member_id?: number }>();
    return { success: true as const, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const getTeamRole = async (): Promise<{ role: TeamMemberRole | null }> => {
  const data = await serverKyInstance.get("auth/companies/team/role/").json<{ role: TeamMemberRole | null }>();
  return data;
};

export const getTeamList = async (): Promise<TeamListResponse> => {
  const data = await serverKyInstance.get("auth/companies/team/").json<TeamListResponse>();
  return data;
};

export const inviteTeamMembers = async (
  emails: string[],
  role: TeamMemberRole
) => {
  try {
    const data = await serverKyInstance.post("auth/companies/invite/", {
      json: { emails, role },
    }).json<{
      created: { email: string }[];
      errors: { email: string; error: string }[];
    }>();
    return { success: true as const, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const resendInvite = async (inviteId: number | string) => {
  try {
    await serverKyInstance.post(`auth/invite/resend/${inviteId}/`).json();
    return { success: true as const };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const revokeInvite = async (inviteId: number | string) => {
  try {
    await serverKyInstance.post(`auth/invite/revoke/${inviteId}/`).json();
    return { success: true as const };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const removeMember = async (
  companyId: number | string,
  memberId: number | string
) => {
  try {
    await serverKyInstance.delete(`auth/companies/${companyId}/team/${memberId}/remove/`).json();
    return { success: true as const };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};
