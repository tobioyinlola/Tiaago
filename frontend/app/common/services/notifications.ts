"use server";

import { PagedResource } from "../types";
import {
  NotificationItem,
  NotificationHistoryItem,
  NotificationHistoryDetail,
  OrganisationOption,
  NotificationType,
  TargetScope,
} from "../types/notifications.type";
import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";

// ── User-facing ──────────────────────────────────────────────────────────

export const getNotifications = async (page = 1) => {
  const data = await serverKyInstance
    .get("notifications/", { searchParams: { page } })
    .json<PagedResource<NotificationItem>>();
  return data;
};

// ── Admin ────────────────────────────────────────────────────────────────

export type SendNotificationPayload = {
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string;
  link_label?: string;
  target_scope: TargetScope;
  target_organisation?: number;
  segment?: string;
  tag?: string;
};

export const sendNotification = async (payload: SendNotificationPayload) => {
  try {
    const data = await serverKyInstance
      .post("notifications/admin/", { json: payload })
      .json<{ id: string; title: string; recipient_count: number }>();
    return { success: true as const, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const getNotificationHistory = async (page = 1) => {
  const data = await serverKyInstance
    .get("notifications/admin/", { searchParams: { page } })
    .json<PagedResource<NotificationHistoryItem>>();
  return data;
};

export const getNotificationDetail = async (id: string) => {
  const data = await serverKyInstance
    .get(`notifications/admin/${id}/`)
    .json<NotificationHistoryDetail>();
  return data;
};

export const searchOrganisations = async (q?: string) => {
  const searchParams: Record<string, string> = {};
  if (q) searchParams.q = q;
  const data = await serverKyInstance
    .get("notifications/admin/organisations/", { searchParams })
    .json<PagedResource<OrganisationOption>>();
  return data;
};
