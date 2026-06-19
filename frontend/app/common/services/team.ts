"use server";

import { TeamListResponse, TeamMemberRole } from "../types";
import axiosInstance, { publicAxiosInstance } from "../utils/axios.instance";
import { _handleServerApiCallError } from "../utils";

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
    const { data } = await publicAxiosInstance.get<TeamInviteValidation>(
      `auth/invite/validate/${token}/`
    );
    return { success: true as const, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const acceptTeamInvite = async (token: string) => {
  try {
    const { data } = await axiosInstance.post<{ detail: string; member_id?: number }>(
      `auth/invite/accept/${token}/`
    );
    return { success: true as const, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const getTeamList = async (): Promise<TeamListResponse> => {
  const { data } = await axiosInstance.get<TeamListResponse>(
    "auth/companies/team/"
  );
  return data;
};

export const inviteTeamMembers = async (
  emails: string[],
  role: TeamMemberRole
) => {
  try {
    const { data } = await axiosInstance.post<{
      created: { email: string }[];
      errors: { email: string; error: string }[];
    }>("auth/companies/invite/", { emails, role });
    return { success: true as const, data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const resendInvite = async (inviteId: number | string) => {
  try {
    await axiosInstance.post(`auth/invite/resend/${inviteId}/`);
    return { success: true as const };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const revokeInvite = async (inviteId: number | string) => {
  try {
    await axiosInstance.post(`auth/invite/revoke/${inviteId}/`);
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
    await axiosInstance.delete(
      `auth/companies/${companyId}/team/${memberId}/remove/`
    );
    return { success: true as const };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};
