"use server";

import { PagedResource } from "../types";
import {
  TicketListItem,
  AdminTicketListItem,
  TicketDetail,
  TicketCategory,
  TicketStatus,
  TicketPriority,
} from "../types/support.type";
import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";

// ── User-facing ──────────────────────────────────────────────────────────

export type SubmitTicketPayload = {
  title: string;
  category: TicketCategory;
  message: string;
  attachments: File[];
};

export const submitTicket = async (payload: SubmitTicketPayload) => {
  try {
    const formData = new FormData();
    formData.set("title", payload.title);
    formData.set("category", payload.category);
    formData.set("message", payload.message);
    payload.attachments.forEach(file => formData.append("attachments", file));

    const data = await serverKyInstance
      .post("support/tickets/", { body: formData })
      .json<TicketDetail>();
    return { success: true as const, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const getMyTickets = async (page = 1) => {
  const data = await serverKyInstance
    .get("support/tickets/", { searchParams: { page } })
    .json<PagedResource<TicketListItem>>();
  return data;
};

export const getTicketDetail = async (id: string) => {
  const data = await serverKyInstance.get(`support/tickets/${id}/`).json<TicketDetail>();
  return data;
};

export const replyToTicket = async (id: string, message: string, attachments: File[] = []) => {
  try {
    const formData = new FormData();
    formData.set("message", message);
    attachments.forEach(file => formData.append("attachments", file));

    const data = await serverKyInstance
      .post(`support/tickets/${id}/replies/`, { body: formData })
      .json<TicketDetail>();
    return { success: true as const, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const reopenTicket = async (id: string) => {
  try {
    const data = await serverKyInstance.post(`support/tickets/${id}/reopen/`).json<TicketDetail>();
    return { success: true as const, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

// ── Admin ────────────────────────────────────────────────────────────────

export type GetAdminTicketsParams = {
  page?: number;
  q?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
};

export const getAdminTickets = async ({ page = 1, q, status, priority, category }: GetAdminTicketsParams = {}) => {
  const searchParams: Record<string, string | number> = { page };
  if (q) searchParams.search = q;
  if (status) searchParams.status = status;
  if (priority) searchParams.priority = priority;
  if (category) searchParams.category = category;

  const data = await serverKyInstance
    .get("support/admin/tickets/", { searchParams })
    .json<PagedResource<AdminTicketListItem>>();
  return data;
};

export const getAdminTicketDetail = async (id: string) => {
  const data = await serverKyInstance.get(`support/admin/tickets/${id}/`).json<TicketDetail>();
  return data;
};

export type AdminTicketUpdatePayload = Partial<{
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assigned_to: number | null;
}>;

export const updateAdminTicket = async (id: string, payload: AdminTicketUpdatePayload) => {
  try {
    const data = await serverKyInstance
      .patch(`support/admin/tickets/${id}/`, { json: payload })
      .json<TicketDetail>();
    return { success: true as const, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const replyToTicketAsAdmin = async (
  id: string,
  message: string,
  attachments: File[] = [],
  isInternalNote = false
) => {
  try {
    const formData = new FormData();
    formData.set("message", message);
    formData.set("is_internal_note", String(isInternalNote));
    attachments.forEach(file => formData.append("attachments", file));

    const data = await serverKyInstance
      .post(`support/admin/tickets/${id}/replies/`, { body: formData })
      .json<TicketDetail>();
    return { success: true as const, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const getAdminStaffList = async () => {
  const data = await serverKyInstance
    .get("support/admin/staff/")
    .json<{ id: number; name: string; email: string }[]>();
  return data;
};
