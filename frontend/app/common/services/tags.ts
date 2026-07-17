"use server";

import { OrganisationTag, SystemTagsResponse, Tag, TagAuditLogEntry, TaggedOrganisation } from "../types/tags.type";
import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";

export const getSystemTags = async () => {
  const data = await serverKyInstance.get("tags/admin/system/").json<SystemTagsResponse>();
  return data;
};

export const setSystemTagActive = async (tagId: string, active: boolean) => {
  try {
    const data = await serverKyInstance
      .post(`tags/admin/system/${tagId}/${active ? "activate" : "deactivate"}/`)
      .json<Tag>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getCustomTags = async () => {
  const data = await serverKyInstance.get("tags/admin/custom/").json<Tag[]>();
  return data;
};

export const createCustomTag = async (payload: { name: string; description?: string; colour: string }) => {
  try {
    const data = await serverKyInstance.post("tags/admin/custom/", { json: payload }).json<Tag>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const applyCustomTagToOrganisations = async (tagId: string, organisationIds: number[]) => {
  try {
    const data = await serverKyInstance
      .post(`tags/admin/custom/${tagId}/apply/`, { json: { organisation_ids: organisationIds } })
      .json<{ applied: number; already_tagged: number }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const removeCustomTagFromOrganisation = async (tagId: string, organisationId: number) => {
  try {
    const data = await serverKyInstance
      .post(`tags/admin/custom/${tagId}/remove/`, { json: { organisation_id: organisationId } })
      .json<{ removed: boolean }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getTagOrganisations = async (tagId: string) => {
  const data = await serverKyInstance.get(`tags/admin/${tagId}/organisations/`).json<TaggedOrganisation[]>();
  return data;
};

export const getOrganisationTags = async (companyId: number | string) => {
  const data = await serverKyInstance
    .get(`tags/admin/organisations/${companyId}/tags/`)
    .json<OrganisationTag[]>();
  return data;
};

export const addOrganisationTag = async (companyId: number | string, tagId: string) => {
  try {
    const data = await serverKyInstance
      .post(`tags/admin/organisations/${companyId}/tags/`, { json: { tag_id: tagId } })
      .json<OrganisationTag>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const removeOrganisationTag = async (companyId: number | string, tagId: string) => {
  try {
    const data = await serverKyInstance
      .delete(`tags/admin/organisations/${companyId}/tags/`, { json: { tag_id: tagId } })
      .json<{ removed: boolean }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getOrganisationTagTimeline = async (companyId: number | string) => {
  const data = await serverKyInstance
    .get(`tags/admin/organisations/${companyId}/tags/timeline/`)
    .json<TagAuditLogEntry[]>();
  return data;
};

export const reevaluateOrganisationTags = async (companyId: number | string) => {
  try {
    await serverKyInstance.post(`tags/admin/organisations/${companyId}/reevaluate/`).json();
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};
