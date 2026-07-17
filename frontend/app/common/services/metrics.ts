"use server";
import { formatPrice } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";

type ServerMetricItem = {
  title: string;
  value_last_month: number;
  value_this_month: number;
  current_value: number;
};

type ServerAdminMetrics = {
  talent_metrics: ServerMetricItem[];
  user_metrics: ServerMetricItem[];
  recruiter_metrics: ServerMetricItem[];
  contract_metrics: ServerMetricItem[];
  registration_metrics: ServerMetricItem[];
};

export const getAdminMetrics = async () => {
  const data = await serverKyInstance
    .get<ServerAdminMetrics>("management/metrics")
    .json();
  const final = {
    "User Details": data.user_metrics,
    "Talent Details": data.talent_metrics,
    "Recruiter Details": data.recruiter_metrics,
    Contracts: data.contract_metrics.map(item => ({
      ...item,
      current_value: formatPrice({
        price: item.current_value,
        makeFriendly: true,
      }),
    })),
    "Registrations this month": (
      data.registration_metrics ?? data.user_metrics
    ).map(item => ({
      ...item,
      current_value: item.value_this_month,
    })),
  };
  return final;
};
