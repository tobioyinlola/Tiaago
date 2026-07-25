"use server";

import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";
import { PagedResource } from "../types";
import {
  TalentNetworkCommunity,
  TalentNetworkEmailFrequency,
  TalentNetworkIndustry,
  TalentNetworkRoleCategory,
  TalentNetworkWorkMode,
  TalentNetworkYearsExperience,
} from "../constants/talent-network";

export type TalentNetworkMemberStatus = "PENDING_CONFIRMATION" | "ACTIVE" | "UNSUBSCRIBED" | "DEACTIVATED";

export type TalentNetworkMember = {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  job_title: string;
  years_experience: TalentNetworkYearsExperience;
  industry: TalentNetworkIndustry[];
  interested_roles: TalentNetworkRoleCategory[];
  preferred_work_type: TalentNetworkWorkMode;
  preferred_locations: string[];
  communities: TalentNetworkCommunity[];
  other_community: string;
  email_frequency: TalentNetworkEmailFrequency;
  consent: boolean;
  status: TalentNetworkMemberStatus;
  created_at: string;
  updated_at: string;
  last_email_sent: string | null;
  last_opened: string | null;
};

export type TalentNetworkOverview = {
  total_members: number;
  new_this_week: number;
  countries: number;
  top_roles: { role: string; count: number }[];
  top_communities: { community: string; count: number }[];
  email_subscribers: number;
};

export type TalentNetworkAnalytics = {
  open_rate: number | null;
  click_rate: number | null;
  application_rate: number | null;
  top_performing_jobs: { job_id: number; job__role: string; match_count: number; applied: number }[];
  top_recruiters: { job__company_id: number; job__company__company_name: string; match_count: number; applied: number }[];
  members_growth: { month: string; count: number }[];
};

export const getTalentNetworkOverview = async () => {
  try {
    const data = await serverKyInstance.get("talent-network/admin/overview/").json<TalentNetworkOverview>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getTalentNetworkMembers = async (searchParams: Record<string, string | number | undefined>) => {
  try {
    // Filter out undefined/empty entries first -- ky's searchParams builds
    // a URLSearchParams from this object, which stringifies `undefined`
    // itself into the literal text "undefined" in the query string (e.g.
    // ?years_experience=undefined), which the backend then rejects as an
    // invalid choice.
    const cleanParams = Object.fromEntries(
      Object.entries(searchParams).filter(([, v]) => v !== undefined && v !== "")
    ) as Record<string, string>;
    const data = await serverKyInstance
      .get("talent-network/admin/members/", { searchParams: cleanParams })
      .json<PagedResource<TalentNetworkMember>>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getTalentNetworkMemberDetail = async (id: number) => {
  try {
    const data = await serverKyInstance
      .get(`talent-network/admin/members/${id}/`)
      .json<{ member: TalentNetworkMember; recent_notifications: unknown[] }>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const getTalentNetworkAnalytics = async () => {
  try {
    const data = await serverKyInstance.get("talent-network/admin/analytics/").json<TalentNetworkAnalytics>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};
