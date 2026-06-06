import { isAfter, isSameMonth, subMonths } from "date-fns";

import {
  formatPrice,
  getMetricPercentageChange,
  isBasicUser,
  isProUser,
} from "@/app/common/utils";
import { Contract, User } from "@/app/common/types";

export const getContractMetrics = (contracts: Contract[] = []) => {
  const now = new Date();
  const activeContracts = contracts.filter(c =>
    isAfter(new Date(c.expires), now)
  );
  const activeContractsValue = activeContracts.reduce(
    (acc, c) => acc + c.value,
    0
  );
  const completedContracts = contracts.filter(c =>
    isAfter(now, new Date(c.expires))
  );
  const completedContractsValue = completedContracts.reduce(
    (acc, c) => acc + c.value,
    0
  );
  const activeContractsThisMonth = activeContracts.filter(c =>
    isSameMonth(new Date(c.created), now)
  );
  const activeContractsLastMonth = activeContracts.filter(c =>
    isSameMonth(new Date(c.created), subMonths(now, 1))
  );
  const completedContractsThisMonth = completedContracts.filter(c =>
    isSameMonth(new Date(c.created), now)
  );
  const completedContractsLastMonth = completedContracts.filter(c =>
    isSameMonth(new Date(c.created), subMonths(now, 1))
  );
  const contractMetrics = [
    {
      title: "Active Contracts",
      data: [activeContractsLastMonth.length, activeContractsThisMonth.length],
      percentChange: getMetricPercentageChange(
        activeContractsThisMonth.length,
        activeContractsLastMonth.length
      ),
      currentVal: formatPrice({
        price: activeContractsValue,
        makeFriendly: true,
      }),
    },
    {
      title: "Completed Contracts",
      data: [
        completedContractsLastMonth.length,
        completedContractsThisMonth.length,
      ],
      percentChange: getMetricPercentageChange(
        completedContractsThisMonth.length,
        completedContractsLastMonth.length
      ),
      currentVal: formatPrice({
        price: completedContractsValue,
        makeFriendly: true,
      }),
    },
  ];
  return contractMetrics;
};

// mixpanel track active users
// contract
