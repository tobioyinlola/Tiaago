"use server";

import {
  OrganisationAlerts,
  OrganisationDetail,
  OrganisationRow,
  PagedResult,
} from "../types/analytics.type";
import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";

type GetOrganisationsParams = {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  joined_after?: string;
  joined_before?: string;
  wallet_below?: number;
  ordering?: string;
  tags?: string[];
  tag_match?: "any" | "all";
};

export const getOrganisations = async ({
  page = 1,
  page_size = 20,
  q,
  status,
  joined_after,
  joined_before,
  wallet_below,
  ordering,
  tags,
  tag_match,
}: GetOrganisationsParams = {}) => {
  const searchParams: Record<string, string | number> = { page, page_size };
  if (q) searchParams.q = q;
  if (status) searchParams.status = status;
  if (joined_after) searchParams.joined_after = joined_after;
  if (joined_before) searchParams.joined_before = joined_before;
  if (wallet_below !== undefined) searchParams.wallet_below = wallet_below;
  if (ordering) searchParams.ordering = ordering;
  if (tags?.length) searchParams.tags = tags.join(",");
  if (tag_match) searchParams.tag_match = tag_match;

  const data = await serverKyInstance
    .get<PagedResult<OrganisationRow>>("analytics/organisations/", { searchParams })
    .json();
  return data;
};

export const getOrganisationDetail = async (id: number | string) => {
  const data = await serverKyInstance
    .get<OrganisationDetail>(`analytics/organisations/${id}/`)
    .json();
  return data;
};

export const getOrganisationAlerts = async () => {
  const data = await serverKyInstance
    .get<OrganisationAlerts>("analytics/organisations/alerts/")
    .json();
  return data;
};

// Permanently deletes the organisation's account (company_rep user, company,
// and everything under it -- jobs, applications, wallet, subscriptions,
// etc). No confirmation email is sent; the email is freed for a fresh
// signup immediately. See analytics.views.OrganisationDeleteAPIView.
export const deleteOrganisation = async (id: number | string) => {
  try {
    await serverKyInstance.delete(`analytics/organisations/${id}/delete/`);
    return { success: true as const };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("deleteOrganisation Error: ", errMsg);
    return { success: false as const, error: errMsg };
  }
};
