"use server";

import { Staff } from "../types";
import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";

export const updateStaff = async (
  input: Partial<Staff> | FormData,
  endpoint: "profile" | "me" = "me"
): Promise<Staff> => {
  const options =
    input instanceof FormData ? { body: input } : { json: input };
  const responseData = await serverKyInstance
    .patch(`auth/users/${endpoint}`, options)
    .json<{ user: Staff; [key: string]: any }>();
  const { user, ...rest } = responseData;
  return { ...user, ...rest };
};

// -- Staff RBAC: role and team-member management (admin/staff page) --

export type StaffPermissionDef = {
  id: string;
  slug: string;
  name: string;
  group: string;
  description: string;
};

export type StaffRoleDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system_role: boolean;
  permissions: StaffPermissionDef[];
  member_count: number;
  permission_count: number;
  created_at: string;
  updated_at: string;
};

export type StaffMemberStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export type StaffMember = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  staff_role: { id: string; name: string; slug: string } | null;
  status: StaffMemberStatus;
  last_login: string | null;
  invited_by_admin: { id: number; name: string } | null;
  invited_at: string | null;
  created: string;
};

export type StaffActivityLogEntry = {
  id: string;
  actor: number | null;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export const getStaffPermissions = async () => {
  const data = await serverKyInstance.get("staff/permissions/").json<StaffPermissionDef[]>();
  return data;
};

export const getStaffRoles = async () => {
  const data = await serverKyInstance.get("staff/roles/").json<Paginated<StaffRoleDetail> | StaffRoleDetail[]>();
  return Array.isArray(data) ? data : data.results;
};

export const getStaffRole = async (id: string) => {
  const data = await serverKyInstance.get(`staff/roles/${id}/`).json<StaffRoleDetail>();
  return data;
};

export const createStaffRole = async (payload: { name: string; description?: string; permission_slugs: string[] }) => {
  try {
    const data = await serverKyInstance.post("staff/roles/", { json: payload }).json<StaffRoleDetail>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const updateStaffRole = async (
  id: string,
  payload: { name?: string; description?: string; permission_slugs?: string[] }
) => {
  try {
    const data = await serverKyInstance.patch(`staff/roles/${id}/`, { json: payload }).json<StaffRoleDetail>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deleteStaffRole = async (id: string) => {
  try {
    await serverKyInstance.delete(`staff/roles/${id}/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getStaffMembers = async (page = 1) => {
  const data = await serverKyInstance
    .get("staff/members/", { searchParams: { page } })
    .json<Paginated<StaffMember>>();
  return data;
};

export const getStaffMember = async (id: number | string) => {
  const data = await serverKyInstance.get(`staff/members/${id}/`).json<StaffMember>();
  return data;
};

export const inviteStaffMember = async (payload: {
  email: string;
  first_name?: string;
  last_name?: string;
  role_slug: string;
}) => {
  try {
    const data = await serverKyInstance.post("staff/invite/", { json: payload }).json<StaffMember>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deactivateStaffMember = async (id: number | string) => {
  try {
    const data = await serverKyInstance.post(`staff/members/${id}/deactivate/`).json<StaffMember>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const activateStaffMember = async (id: number | string) => {
  try {
    const data = await serverKyInstance.post(`staff/members/${id}/activate/`).json<StaffMember>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const changeStaffMemberRole = async (id: number | string, role_slug: string) => {
  try {
    const data = await serverKyInstance
      .post(`staff/members/${id}/role/`, { json: { role_slug } })
      .json<StaffMember>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getStaffActivityLog = async (page = 1) => {
  const data = await serverKyInstance
    .get("staff/activity-log/", { searchParams: { page } })
    .json<Paginated<StaffActivityLogEntry>>();
  return data;
};
