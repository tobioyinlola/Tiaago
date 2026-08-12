"use server";

import {
  AudiencePreview,
  CampaignAnalytics,
  CampaignAudiencePool,
  CampaignAudienceType,
  CampaignEmail,
  CampaignScheduleType,
  ConditionType,
  EmailBlock,
  EmailCampaign,
  EmailTemplate,
  SendDelayType,
  TemplateCategory,
} from "../types/campaigns.type";
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

export const previewTemplateBlocks = async (blocks: EmailBlock[]) => {
  const data = await serverKyInstance
    .post("campaigns/templates/preview/", { json: { blocks } })
    .json<{ html_body: string; plain_text_body: string }>();
  return data;
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
  name?: string;
  audience_pool?: CampaignAudiencePool;
  audience_type?: CampaignAudienceType | null;
  audience_segment?: string | null;
  audience_tag?: string | null;
  manual_organisation_ids?: number[];
  tn_role_categories?: string[];
  tn_industries?: string[];
  tn_years_experience?: string[];
  tn_work_type?: string;
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

// ── Campaign emails (sequence steps) ────────────────────────────────────

export type CampaignEmailPayload = {
  sequence_number?: number;
  email_template?: string | null;
  subject?: string;
  preview_text?: string;
  from_name?: string;
  reply_to?: string | null;
  send_delay_type?: SendDelayType;
  send_delay_hours?: number | null;
  send_delay_days?: number | null;
  condition_type?: ConditionType;
};

export const createCampaignEmail = async (campaignId: string, payload: CampaignEmailPayload) => {
  try {
    const data = await serverKyInstance
      .post(`campaigns/${campaignId}/emails/`, { json: payload })
      .json<CampaignEmail>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const updateCampaignEmail = async (campaignId: string, emailId: string, payload: Partial<CampaignEmailPayload>) => {
  try {
    const data = await serverKyInstance
      .patch(`campaigns/${campaignId}/emails/${emailId}/`, { json: payload })
      .json<CampaignEmail>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deleteCampaignEmail = async (campaignId: string, emailId: string) => {
  try {
    await serverKyInstance.delete(`campaigns/${campaignId}/emails/${emailId}/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const reorderCampaignEmails = async (campaignId: string, orderedIds: string[]) => {
  try {
    const data = await serverKyInstance
      .post(`campaigns/${campaignId}/emails/reorder/`, { json: { ordered_ids: orderedIds } })
      .json<CampaignEmail[]>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

// ── Audience preview, send, lifecycle ───────────────────────────────────

export const previewCampaignAudience = async (payload: {
  audience_pool?: CampaignAudiencePool;
  audience_type?: CampaignAudienceType;
  audience_segment?: string | null;
  audience_tag?: string | null;
  manual_organisation_ids?: number[];
  tn_role_categories?: string[];
  tn_industries?: string[];
  tn_years_experience?: string[];
  tn_work_type?: string;
}) => {
  const data = await serverKyInstance.post("campaigns/audience-preview/", { json: payload }).json<AudiencePreview>();
  return data;
};

export const sendTestCampaignEmail = async (id: string, campaignEmailId?: string) => {
  try {
    const data = await serverKyInstance
      .post(`campaigns/${id}/send-test/`, { json: campaignEmailId ? { campaign_email_id: campaignEmailId } : {} })
      .json<{ status: string; to: string }>();
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

export const pauseCampaign = async (id: string) => {
  try {
    await serverKyInstance.post(`campaigns/${id}/pause/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const resumeCampaign = async (id: string) => {
  try {
    await serverKyInstance.post(`campaigns/${id}/resume/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getCampaignAnalytics = async (id: string) => {
  const data = await serverKyInstance.get(`campaigns/${id}/analytics/`).json<CampaignAnalytics>();
  return data;
};
