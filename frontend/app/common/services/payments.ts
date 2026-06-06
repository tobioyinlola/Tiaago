"use server";

import { handleServerApiCallError } from "../utils";
import axiosInstance from "../utils/axios.instance";
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
    const response = await axiosInstance.delete(`payments/coupons/${id}/`);
    return {
      success: true,
      data: response.data,
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

export async function createCommunity(data: {
  name: string;
  description?: string;
}) {
  try {
    const response = await axiosInstance.post<ApiResponse<Community>>(
      "payments/communities/",
      data
    );
    return {
      success: true,
      data: response.data,
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
  data: CreateCouponInput
): Promise<ApiResponse<Coupon>> {
  try {
    const response = await axiosInstance.post<Coupon>(
      "payments/coupons/",
      data
    );
    return {
      success: true,
      data: response.data,
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
  data: Partial<CreateCouponInput>
): Promise<ApiResponse<Coupon>> {
  try {
    const response = await axiosInstance.patch<Coupon>(
      `payments/coupons/${id}/`,
      data
    );
    return {
      success: true,
      data: response.data,
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
