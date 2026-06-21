"use server";
import { cache } from "react";
import { AxiosError } from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  BasePageProps,
  GetProfileArgs,
  ID,
  Job,
  PagedResource,
  ReferredUser,
  ReferralWithdrawal,
  Staff,
  Startup,
  Talent,
  User,
} from "../types";
import axiosInstance from "../utils/axios.instance";
import { ACCESS_TOKEN_KEY, IS_DEV } from "../constants";
import serverKyInstance from "../utils/server-ky.instance";
import {
  _handleServerApiCallError,
  getFullUserType,
  getOnboardingUrl,
  handleServerApiCallError,
} from "../utils";

export type GetCurrentUserReturnType<T> = {
  removeAuthCookies: boolean;
  currentUser: T;
};

/** Stable reference for React.cache() deduplication. */
export const ALLOW_NULL_ARGS: GetProfileArgs = { allowNull: true };

const _getCurrentUserImpl = cache(async function getCurrentUserImpl(
  requiredUserType?: BasePageProps["as"],
  getProfileArgs?: GetProfileArgs
) {
  let currentUser: User;
  let removeAuthCookies = false;
  const { nullUserRedirect, validUserRedirect, allowNull } =
    getProfileArgs || {};
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_TOKEN_KEY);
  if (allowNull && !access) return { removeAuthCookies, currentUser: null };
  if (!allowNull && !access)
    return redirect(nullUserRedirect ?? getOnboardingUrl(requiredUserType));
  try {
    const response = await axiosInstance.get<{ user: User }>(
      "auth/users/profile"
    );
    const { user, ...rest } = response.data;
    currentUser = { ...rest, ...user };
  } catch (error: any) {
    if (error instanceof AxiosError) {
      const errorResponse = error.response?.data ?? {};
      if (errorResponse?.code === "token_not_valid") {
        removeAuthCookies = true;
      } else if (IS_DEV) {
        console.log({ error });
        console.log(error.message, errorResponse);
      }
    }
    if (IS_DEV) console.log({ error });
    if (allowNull) return { removeAuthCookies, currentUser: null };
    return redirect(nullUserRedirect ?? getOnboardingUrl(requiredUserType));
  }
  const as = getFullUserType(currentUser.user_type);

  if (!currentUser.verified && as !== "staff") {
    const role = as === "startup" ? "startup" : "talent";
    return redirect(
      `/verify-email?email=${encodeURIComponent(currentUser.email)}&as=${role}`
    );
  }

  if (
    requiredUserType &&
    getFullUserType(currentUser.user_type) !== requiredUserType
  ) {
    if (currentUser.user_type === "ST") return redirect("/admin");
    return redirect(`/${as}s/dashboard`);
  }
  if (validUserRedirect)
    return redirect(
      validUserRedirect === "dashboard"
        ? as === "staff"
          ? "/admin"
          : `/${as}s/dashboard`
        : validUserRedirect
    );
  return { removeAuthCookies, currentUser };
});

export async function getCurrentUser(): Promise<GetCurrentUserReturnType<User>>;
export async function getCurrentUser(
  requiredUserType: undefined,
  getProfileArgs?: GetProfileArgs
): Promise<GetCurrentUserReturnType<User>>;
export async function getCurrentUser(
  requiredUserType: "talent",
  getProfileArgs?: GetProfileArgs
): Promise<GetCurrentUserReturnType<Talent>>;
export async function getCurrentUser(
  requiredUserType: "startup",
  getProfileArgs?: GetProfileArgs
): Promise<GetCurrentUserReturnType<Startup>>;
export async function getCurrentUser(
  requiredUserType: "staff",
  getProfileArgs?: GetProfileArgs
): Promise<GetCurrentUserReturnType<Staff>>;
export async function getCurrentUser(
  requiredUserType?: BasePageProps["as"],
  getProfileArgs?: GetProfileArgs
) {
  return _getCurrentUserImpl(requiredUserType, getProfileArgs);
}

export const getAllUsers = async (includeUnverifiedUsers?: boolean) => {
  const data = await serverKyInstance.get<User[]>("auth/all-users").json();
  return data.filter(user => includeUnverifiedUsers || user.verified);
};

export const getAllStartups = async (
  page = 1,
  verified?: boolean | null,
  search?: string
) => {
  const searchParams = new URLSearchParams();
  searchParams.append("page", page + "");
  if (verified !== undefined) searchParams.append("verified", verified + "");
  if (search) searchParams.append("q", search);
  const data = await serverKyInstance
    .get<PagedResource<any>>(`auth/all-companies?${searchParams.toString()}`)
    .json();
  return {
    ...data,
    results: data.results.map(
      ({ user, ...rest }) => ({ ...rest, ...user } as Startup)
    ),
  } as PagedResource<Startup>;
};

export const getAllTalents = async (
  page = 1,
  verified?: boolean | null,
  search?: string
) => {
  const searchParams = new URLSearchParams();
  searchParams.append("page", page + "");
  if (verified !== undefined) searchParams.append("verified", verified + "");
  if (search) searchParams.append("q", search);
  const data = await serverKyInstance
    .get<PagedResource<any>>(`auth/all-talents?${searchParams.toString()}`)
    .json();
  return {
    ...data,
    results: data.results.map(
      ({ user, ...rest }) => ({ ...rest, ...user } as Talent)
    ),
  } as PagedResource<Talent>;
};

export const getUserReferralCode = async () => {
  const data = await serverKyInstance
    .get<{ referral_code: string }>("auth/referrals/referral-code")
    .json();
  return data;
};

export const sendReferralInvite = async (email: string) => {
  const response = await axiosInstance.post(
    "auth/referrals/send-invite-link/",
    { email }
  );
  return response.data;
};

export const getUsersReferred = async (page: number) => {
  const data = await serverKyInstance
    .get<PagedResource<ReferredUser>>("auth/referrals/tracking", {
      searchParams: {
        page,
      },
    })
    .json();
  return data;
};

export const approveUser = async (userId: ID, approved?: boolean) => {
  try {
    const response = await axiosInstance.post(`auth/verify-user/${userId}/`, {
      verified: approved ?? null,
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("approveUser Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getPublicCompanyProfile = async (id: ID) => {
  const data = await serverKyInstance
    .get<{
      company_name: string;
      country?: string;
      website?: string;
      profile_pic?: string;
      bio?: string;
      jobs: Job[];
    }>(`jobs/companies/${id}`)
    .json();
  return data;
};

export const getReferralRewardsWallet = async () => {
  const data = await serverKyInstance
    .get<{
      balance: string;
      total_earned: string;
      total_withdrawn: string;
    }>("auth/referral-rewards/wallet/")
    .json();
  return data;
};

export const requestWithdrawal = async (amount: number) => {
  try {
    const response = await axiosInstance.post<{
      amount: string | number;
      bank_name: string;
      account_name: string;
      account_number: string;
    }>("auth/referral-rewards/request_withdrawal/", {
      amount: amount.toString(),
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("requestWithdrawal Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getReferralWithdrawals = async (page = 1, page_size = 10) => {
  const data = await serverKyInstance
    .get<PagedResource<ReferralWithdrawal>>(
      "auth/admin/referral-withdrawals/",
      {
        searchParams: {
          page,
          page_size,
        },
      }
    )
    .json();
  return data;
};

// /auth/admin/referral-withdrawals/{id}/approve/
export const approveReferralWithdrawal = async (id: ID) => {
  try {
    const response = await axiosInstance.post<ReferralWithdrawal>(
      `auth/admin/referral-withdrawals/${id}/approve/`
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("approveReferralWithdrawal Error: ", errMsg);
    console.log("approveReferralWithdrawal ErrorMap: ", errorMap);
    console.log(
      "approveReferralWithdrawal ErrorMap KeysObj: ",
      Object.keys(errorMap)
    );
    return {
      success: false,
      error: errMsg,
    };
  }
};

// /auth/admin/referral-withdrawals/{id}/complete/
export const completeReferralWithdrawal = async (id: ID) => {
  try {
    const response = await axiosInstance.post<ReferralWithdrawal>(
      `auth/admin/referral-withdrawals/${id}/complete/`
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("completeReferralWithdrawal Error: ", errMsg);
    console.log("completeReferralWithdrawal ErrorMap: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

// /auth/admin/referral-withdrawals/{id}/fail/
export const failReferralWithdrawal = async (id: ID) => {
  try {
    const response = await axiosInstance.post<ReferralWithdrawal>(
      `auth/admin/referral-withdrawals/${id}/fail/`
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("failReferralWithdrawal Error: ", errMsg);
    console.log("failReferralWithdrawal ErrorMap: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};
