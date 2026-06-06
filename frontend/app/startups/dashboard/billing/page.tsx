import {
  getSubscriptionPlansBasedOnCountry,
  getSubscriptionTransactions,
  getSubscriptionUsage,
  getWalletBalance,
  getWalletTransactions,
  getWalletUsage,
} from "@/app/common/services/subscription";
import UserBilling from "./_components/UserBilling";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import { SubscriptionPlanV3 } from "@/app/common/types";

export const metadata = {
  title: "Billing",
};

const BillingPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const currentUser = (await getCurrentUser("startup"))?.currentUser;
  const subscriptionPlansRes = await getSubscriptionPlansBasedOnCountry(
    currentUser?.country
  ).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get paystack subscription plans error (billing page): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting subscription plans",
    });
    return null;
  });
  const subscriptionPlans = Array.isArray(subscriptionPlansRes)
    ? (subscriptionPlansRes as any as SubscriptionPlanV3[])
    : subscriptionPlansRes?.results || [];
  const walletBalance = await getWalletBalance().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get wallet balance error (billing page): ", error);
    errors.push({
      message: error,
      title: "Error getting wallet balance",
    });
    return null;
  });

  const walletTransactionsRes = await getWalletTransactions().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get wallet transactions error (billing page): ", error);
    errors.push({
      message: error,
      title: "Error getting wallet transactions",
    });
    return null;
  });
  const walletTransactions = walletTransactionsRes?.results || [];

  const subscriptionTransactionsRes = await getSubscriptionTransactions().catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get subscription transactions error (billing page): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting subscription transactions",
      });
      return null;
    }
  );
  const subscriptionTransactions = subscriptionTransactionsRes?.results || [];

  const subscriptionUsage = await getSubscriptionUsage().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get subscription usage error (billing page): ", error);
    errors.push({
      message: error,
      title: "Error getting subscription usage",
    });
    return null;
  });

  const walletUsage = await getWalletUsage().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get wallet usage error (billing page): ", error);
    errors.push({
      message: error,
      title: "Error getting wallet usage",
    });
    return null;
  });

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <UserBilling
        subscriptionPlans={subscriptionPlans}
        currentUser={currentUser}
        walletBalance={walletBalance}
        walletTransactions={walletTransactions}
        subscriptionTransactions={subscriptionTransactions}
        subscriptionUsage={subscriptionUsage}
        walletUsage={walletUsage}
      />
    </>
  );
};

export default BillingPage;
