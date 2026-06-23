"use server";
import { cache } from "react";
import { HTTPError } from "ky";
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
  backendDown?: boolean;
};

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
    const responseData = await serverKyInstance
      .get("auth/users/profile")
      .json<{ user: User }>();
    const { user, ...rest } = responseData;
    currentUser = { ...rest, ...user };
  } catch (error: any) {
    if (error instanceof HTTPError) {
      const status = error.response?.status;
      if (status === 502 || status === 503 || status === 504) {
        return { removeAuthCookies: false, currentUser: null as any, backendDown: true };
      }
      const errorResponse = await error.response?.json().catch(() => ({})) ?? {};
      if (errorResponse?.code === "token_not_valid") {
        removeAuthCookies = true;
      } else if (IS_DEV) {
        console.log({ error });
        console.log(error.message, errorResponse);
      }
    } else if (error?.cause?.code === "ECONNREFUSED" || error?.code === "ECONNREFUSED" || error?.message?.includes("fetch failed")) {
      return { removeAuthCookies: false, currentUser: null as any, backendDown: true };
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
  const data = await serverKyInstance
    .post("auth/referrals/send-invite-link/", { json: { email } })
    .json();
  return data;
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
    const data = await serverKyInstance
      .post(`auth/verify-user/${userId}/`, {
        json: { verified: approved ?? null },
      })
      .json();
    return {
      success: true,
      data,
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
    const data = await serverKyInstance
      .post("auth/referral-rewards/request_withdrawal/", {
        json: { amount: amount.toString() },
      })
      .json<{
        amount: string | number;
        bank_name: string;
        account_name: string;
        account_number: string;
      }>();
    return {
      success: true,
      data,
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
    const data = await serverKyInstance
      .post(`auth/admin/referral-withdrawals/${id}/approve/`)
      .json<ReferralWithdrawal>();
    return {
      success: true,
      data,
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
    const data = await serverKyInstance
      .post(`auth/admin/referral-withdrawals/${id}/complete/`)
      .json<ReferralWithdrawal>();
    return {
      success: true,
      data,
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
    const data = await serverKyInstance
      .post(`auth/admin/referral-withdrawals/${id}/fail/`)
      .json<ReferralWithdrawal>();
    return {
      success: true,
      data,
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
