"use server";

import { AudiencePreview, CampaignAnalytics, CampaignAudienceType, CampaignScheduleType, EmailBlock, EmailCampaign, EmailTemplate, TemplateCategory } from "../types/campaigns.type";
import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";

export const getTemplates = async () => {
  const data = await serverKyInstance.get("campaigns/templates/").json<EmailTemplate[]>();
  return data;
};

export const getTemplate = async (id: string) => {
  const data = await serverKyInstance.get(`campaigns/templates/${id}/`).json<EmailTemplate>();
  return data;
};

export type TemplatePayload = {
  name: string;
  category: TemplateCategory;
  subject_line: string;
  preview_text?: string;
  blocks: EmailBlock[];
  merge_tags?: string[];
};

export const createTemplate = async (payload: TemplatePayload) => {
  try {
    const data = await serverKyInstance.post("campaigns/templates/", { json: payload }).json<EmailTemplate>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const updateTemplate = async (id: string, payload: Partial<TemplatePayload>) => {
  try {
    const data = await serverKyInstance.patch(`campaigns/templates/${id}/`, { json: payload }).json<EmailTemplate>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deleteTemplate = async (id: string) => {
  try {
    await serverKyInstance.delete(`campaigns/templates/${id}/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

// ── Campaigns ────────────────────────────────────────────────────────────

export const getCampaigns = async () => {
  const data = await serverKyInstance.get("campaigns/").json<EmailCampaign[]>();
  return data;
};

export const getCampaign = async (id: string) => {
  const data = await serverKyInstance.get(`campaigns/${id}/`).json<EmailCampaign>();
  return data;
};

export type CampaignPayload = {
  name: string;
  subject_line?: string;
  preview_text?: string;
  audience_type?: CampaignAudienceType;
  audience_segment?: string | null;
  audience_tag?: string | null;
  manual_organisation_ids?: number[];
  email_template?: string | null;
  schedule_type?: CampaignScheduleType;
  scheduled_for?: string | null;
};

export const createCampaign = async (payload: CampaignPayload) => {
  try {
    const data = await serverKyInstance.post("campaigns/", { json: payload }).json<EmailCampaign>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const updateCampaign = async (id: string, payload: Partial<CampaignPayload>) => {
  try {
    const data = await serverKyInstance.patch(`campaigns/${id}/`, { json: payload }).json<EmailCampaign>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deleteCampaign = async (id: string) => {
  try {
    await serverKyInstance.delete(`campaigns/${id}/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const previewCampaignAudience = async (payload: {
  audience_type: CampaignAudienceType;
  audience_segment?: string | null;
  audience_tag?: string | null;
  manual_organisation_ids?: number[];
}) => {
  const data = await serverKyInstance.post("campaigns/audience-preview/", { json: payload }).json<AudiencePreview>();
  return data;
};

export const sendTestCampaignEmail = async (id: string) => {
  try {
    const data = await serverKyInstance.post(`campaigns/${id}/send-test/`).json<{ status: string; to: string }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const sendCampaign = async (id: string) => {
  try {
    const data = await serverKyInstance.post(`campaigns/${id}/send/`).json<{ status: string }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const cancelCampaign = async (id: string) => {
  try {
    await serverKyInstance.post(`campaigns/${id}/cancel/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getCampaignAnalytics = async (id: string) => {
  const data = await serverKyInstance.get(`campaigns/${id}/analytics/`).json<CampaignAnalytics>();
  return data;
};
