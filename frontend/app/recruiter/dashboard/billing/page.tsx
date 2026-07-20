import {
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
import { getTeamRole } from "@/app/common/services/team";
import AccessDenied from "@/app/common/components/AccessDenied";

export const metadata = {
  title: "Billing",
};

const BillingPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  // currentUser and teamRoleData are independent requests -- fetch in parallel
  const [userRes, teamRoleData] = await Promise.all([
    getCurrentUser("recruiter"),
    getTeamRole().catch(() => null),
  ]);
  const currentUser = userRes?.currentUser;

  if (teamRoleData && teamRoleData.role !== "admin") {
    return (
      <AccessDenied
        title="Admin Access Only"
        message="Billing can only be managed by team admins. Contact your admin for billing related requests."
      />
    );
  }

  // All remaining calls are independent -- fetch in parallel
  const [walletBalance, walletTransactionsRes, walletUsage] =
    await Promise.all([
      getWalletBalance().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get wallet balance error (billing page): ", error);
        errors.push({
          message: error,
          title: "Error getting wallet balance",
        });
        return null;
      }),
      getWalletTransactions().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get wallet transactions error (billing page): ", error);
        errors.push({
          message: error,
          title: "Error getting wallet transactions",
        });
        return null;
      }),
      getWalletUsage().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get wallet usage error (billing page): ", error);
        errors.push({
          message: error,
          title: "Error getting wallet usage",
        });
        return null;
      }),
    ]);

  const walletTransactions = walletTransactionsRes?.results || [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <UserBilling
        currentUser={currentUser}
        walletBalance={walletBalance}
        walletTransactions={walletTransactions}
        walletUsage={walletUsage}
      />
    </>
  );
};

export default BillingPage;
