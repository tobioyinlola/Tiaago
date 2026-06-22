"use server";

import { BASE_URL } from "../constants";
import {
  SubscriptionPlan,
  SubscriptionInvoice,
  PagedResource,
  PaymentCard,
  ID,
  SubscriptionPlanV3,
  WalletTransaction,
  SubscriptionTransaction,
  SubscriptionUsage,
  WalletUsage,
} from "../types";
import { _handleServerApiCallError, handleServerApiCallError } from "../utils";
import axiosInstance from "../utils/axios.instance";
import serverKyInstance from "../utils/server-ky.instance";

export const getSubscriptionPlan = async (
  id: number
): Promise<SubscriptionPlan | undefined> => {
  const data = await serverKyInstance
    .get<SubscriptionPlan>(`subscriptions/sub_plan/${id}`)
    .json();
  return data;
};

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const data = await serverKyInstance
    .get("subscriptions/sub_plan/")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as SubscriptionPlan[];
};

export const getAvailableSubscriptionPlans = async (): Promise<
  SubscriptionPlan[]
> => {
  const data = await serverKyInstance
    .get("subscriptions/sub_plan/for-me")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as SubscriptionPlan[];
};

export const getSubscriptionInvoices = async (): Promise<
  SubscriptionInvoice[]
> => {
  const data = await serverKyInstance
    .get("payments/invoice")
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as SubscriptionInvoice[];
};

// new APIs
export const getStripeClientSecret = async () => {
  const response = await axiosInstance.post<{ client_secret: string }>(
    "payments/setup-intent/"
  );
  return response.data;
};

export const addStripePaymentMethod = async (payment_method_id: string) => {
  try {
    const response = await axiosInstance.post<{ payment_method_id: string }>(
      "payments/payment-methods/",
      {
        payment_method_id,
      }
    );
    return response.data;
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const getPaymentCards = async (page = 1, page_size = 3) => {
  const data = await serverKyInstance
    .get<PagedResource<PaymentCard>>("payments/payment-methods", {
      searchParams: {
        page,
        page_size,
      },
    })
    .json();
  return data;
};

export const addPaystackPaymentMethod = async (transaction_ref: string) => {
  try {
    const response = await axiosInstance.post<{ transaction_ref: string }>(
      "payments/paystack-payment-method/",
      {
        transaction_ref,
      }
    );
    return response.data;
  } catch (error) {
    throw Error(await handleServerApiCallError(error));
  }
};

export const deletePaymentMethod = async (id: ID) => {
  try {
    const response = await axiosInstance.delete(
      `payments/payment-method/${id}/delete/`
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("deletePaymentMethod Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const setDefaultPaymentMethod = async (id: ID) => {
  try {
    const response = await axiosInstance.patch(
      `payments/payment-method/${id}/set-default/`,
      {}
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("setDefaultPaymentMethod Error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getPaystackSubscriptionPlans = async (): Promise<
  PagedResource<SubscriptionPlanV3>
> => {
  const data = await serverKyInstance
    .get<PagedResource<SubscriptionPlanV3> | SubscriptionPlanV3[]>(
      "subscriptions/paystack-plans/"
    )
    .json();

  if (Array.isArray(data)) {
    return {
      count: data.length,
      current: 1,
      results: data,
    };
  }
  return data;
};

export const subscribeToPaystackPlan = async (plan_code: string) => {
  try {
    const response = await axiosInstance.post<{
      status: "subscription created";
      data: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    }>("subscriptions/paystack/subscriptions/", {
      plan_code,
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("subscribeToPaystackPlan Error: ", errMsg);
    console.log("subscribeToPaystackPlan Error Map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

type StripeSubPlan = {
  id: ID;
  name: string;
  description: string;
  price_id: string;
  currency: string;
  unit_amount: number;
  recurring_interval: "month" | "year";
};

export const getStripeSubscriptionPlans = async (): Promise<
  PagedResource<SubscriptionPlanV3>
> => {
  const data = await serverKyInstance
    .get("subscriptions/stripe-plan-prices/")
    .json();

  const plans = (
    Array.isArray(data) ? data : (data as any)?.results || []
  ) as StripeSubPlan[];

  return {
    count: plans.length,
    current: 1,
    results: plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      amount: plan.unit_amount,
      interval: plan.recurring_interval === "month" ? "monthly" : "annually",
      plan_code: plan.price_id,
      currency: plan.currency.toUpperCase(),
    })),
  };
};

export const subscribeToStripePlan = async (
  price_id: ID,
  success_url: string
) => {
  try {
    const response = await axiosInstance.post<{
      status: "subscription created";
      data: {
        checkout_url: string;
        session_id: string;
      };
    }>("subscriptions/create-stripe-checkout-session/", {
      price_id,
      success_url,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("subscribeToStripePlan Error: ", errMsg);
    console.log("subscribeToStripePlan Error Map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const subscribeToFreePlan = async () => {
  try {
    const response = await axiosInstance.post<{
      status: "subscription created";
      data: {
        status: string;
      };
    }>("subscriptions/free-plan-subscription/");
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("subscribeToFreePlan Error: ", errMsg);
    console.log("subscribeToFreePlan Error Map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getSubscriptionPlansBasedOnCountry = async (
  country?: string
): Promise<PagedResource<SubscriptionPlanV3>> => {
  const isNigerian = country?.toLowerCase() === "nigeria";
  if (isNigerian) {
    return getPaystackSubscriptionPlans();
  } else {
    return getStripeSubscriptionPlans();
  }
};

export const getWalletBalance = async () => {
  const data = await serverKyInstance
    .get<{
      balance: number;
      currency: string;
    }>("subscriptions/get-wallet-balance/")
    .json();
  return data;
};

export const fundWallet = async (
  amount: number,
  provider: "stripe" | "paystack"
) => {
  try {
    const response = await axiosInstance.post<{
      data: { checkout_url: string; authorization_url: string };
    }>("subscriptions/fund-wallet/", {
      amount,
      provider,
      success_url: `${BASE_URL}/startups/dashboard/billing`,
    });
    return {
      success: true,
      data: response.data?.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("fundWallet Error: ", errMsg);
    console.log("fundWallet Error Map: ", errorMap);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getWalletTransactions = async () => {
  const data = await serverKyInstance
    .get<PagedResource<WalletTransaction>>("subscriptions/wallet-transactions/")
    .json();
  return data;
};

export const getSubscriptionTransactions = async () => {
  const data = await serverKyInstance
    .get<PagedResource<SubscriptionTransaction>>(
      "subscriptions/subscription-transactions/"
    )
    .json();
  return data;
};

export const getSubscriptionUsage = async () => {
  const data = await serverKyInstance
    .get<SubscriptionUsage>("subscriptions/get-user-usage/")
    .json();
  return data;
};

export const getWalletUsage = async () => {
  const data = await serverKyInstance
    .get<WalletUsage>("subscriptions/get-wallet-usage/")
    .json();
  return data;
};
