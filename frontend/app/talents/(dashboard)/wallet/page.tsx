import { Metadata } from "next";

import {
  getCurrentUser,
  getReferralRewardsWallet,
  getUserReferralCode,
  getUsersReferred,
} from "@/app/common/services/profile";

import { DisplayErrorMessagesProps } from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import WalletContent from "./_components/WalletContent";

export const metadata: Metadata = {
  title: "Wallet",
};

type Props = {
  searchParams: Promise<{
    tab?: string;
    page?: string;
  }>;
};

const TalentWallet = async ({ searchParams }: Props) => {
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page)
    : 1;

  const errors: DisplayErrorMessagesProps["errors"] = [];

  const [currentUserRes, referralCodeRes, usersReferredRes, referralRewardsWallet] =
    await Promise.all([
      getCurrentUser("talent"),
      getUserReferralCode().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get referral code error (Wallet => Referral): ", error);
        errors.push({
          message: error,
          title: "Error getting referral code",
        });
        return null;
      }),
      getUsersReferred(page).catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get users referred error (Wallet => Referral): ", error);
        errors.push({
          message: error,
          title: "Error getting users referred",
        });
        return null;
      }),
      getReferralRewardsWallet().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log(
          "Get referral rewards wallet error (Wallet => Referral): ",
          error
        );
        errors.push({
          message: error,
          title: "Error getting referral rewards wallet",
        });
        return {
          balance: "0.00",
          total_earned: "0.00",
          total_withdrawn: "0.00",
        };
      }),
    ]);

  const currentUser = currentUserRes.currentUser;
  const referralCode = referralCodeRes?.referral_code ?? null;

  return (
    <WalletContent
      currentUser={currentUser}
      referralCode={referralCode}
      usersReferredRes={usersReferredRes}
      referralRewardsWallet={referralRewardsWallet}
      errors={errors}
      page={page}
    />
  );
};

export default TalentWallet;
