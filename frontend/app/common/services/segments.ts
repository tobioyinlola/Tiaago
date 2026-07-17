"use server";

import { AudienceSegment, MatchType, SegmentCondition, SegmentPreview } from "../types/segments.type";
import serverKyInstance from "../utils/server-ky.instance";
import { handleServerApiCallError } from "../utils";

export const getSegments = async () => {
  const data = await serverKyInstance.get("segments/admin/").json<AudienceSegment[]>();
  return data;
};

export type SegmentPayload = {
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  match_type: MatchType;
};

export const createSegment = async (payload: SegmentPayload) => {
  try {
    const data = await serverKyInstance.post("segments/admin/", { json: payload }).json<AudienceSegment>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const updateSegment = async (id: string, payload: SegmentPayload) => {
  try {
    const data = await serverKyInstance.patch(`segments/admin/${id}/`, { json: payload }).json<AudienceSegment>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deleteSegment = async (id: string) => {
  try {
    await serverKyInstance.delete(`segments/admin/${id}/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};
