"use server";

import { PagedResource } from "../types";
import {
  EmailTrack,
  EmailTrackStats,
} from "../types/email-track.type";
import serverKyInstance from "../utils/server-ky.instance";

type GetEmailTracksParams = {
  page?: number;
  page_size?: number;
  search?: string;
  delivery_status?: string;
  email_type?: string;
};

export const getEmailTracks = async ({
  page = 1,
  page_size = 20,
  search,
  delivery_status,
  email_type,
}: GetEmailTracksParams = {}) => {
  const searchParams: Record<string, string | number> = { page, page_size };
  if (search) searchParams.search = search;
  if (delivery_status) searchParams.delivery_status = delivery_status;
  if (email_type) searchParams.email_type = email_type;
  const data = await serverKyInstance
    .get<PagedResource<EmailTrack>>("management/email-tracks/", {
      searchParams,
    })
    .json();
  return data;
};

export const getEmailTrackStats = async () => {
  const data = await serverKyInstance
    .get<EmailTrackStats>("management/email-tracks/stats/")
    .json();
  return data;
};
