"use server";

import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";
import { PagedResource, Community, Coupon, ID, ApiResponse } from "../types";

export async function getCommunities(page = 1, page_size = 10) {
  const data = await serverKyInstance
    .get<PagedResource<Community>>("payments/communities", {
      searchParams: {
        page,
        page_size,
      },
    })
    .json();
  return data;
}

export async function getCoupons(page = 1, page_size = 10) {
  const data = await serverKyInstance
    .get<PagedResource<Coupon>>("payments/coupons", {
      searchParams: {
        page,
        page_size,
      },
    })
    .json();
  return data;
}

export async function deleteCoupon(id: ID) {
  try {
    const data = await serverKyInstance
      .delete(`payments/coupons/${id}/`)
      .json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("deleteCoupon Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
}

export async function createCommunity(inputData: {
  name: string;
  description?: string;
}) {
  try {
    const data = await serverKyInstance
      .post("payments/communities/", { json: inputData })
      .json<ApiResponse<Community>>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("createCommunity Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
}

export type CreateCouponInput = {
  community_id: ID;
  discount_amount_ngn?: string | number;
  discount_amount_usd?: string | number;
  discount_percent?: number;
  max_usage?: number;
  expires_at: string;
};

export async function createCoupon(
  inputData: CreateCouponInput
): Promise<ApiResponse<Coupon>> {
  try {
    const data = await serverKyInstance
      .post("payments/coupons/", { json: inputData })
      .json<Coupon>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("createCoupon Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
}

export async function updateCoupon(
  id: ID,
  inputData: Partial<CreateCouponInput>
): Promise<ApiResponse<Coupon>> {
  try {
    const data = await serverKyInstance
      .patch(`payments/coupons/${id}/`, { json: inputData })
      .json<Coupon>();
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("createCoupon Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
}
