"use server";

import { TeamListResponse, TeamMemberRole } from "../types";
import axiosInstance from "../utils/axios.instance";
import { _handleServerApiCallError } from "../utils";

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
