import { Metadata } from "next";
import { redirect } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import TalentVerification from "../components/TalentVerification";
import { getTalenProfileStatus } from "@/app/common/services";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";

export const metadata: Metadata = {
  title: "Talent Verification",
};

const TalentVerificationPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  
  // Get current user
  const { currentUser } = await getCurrentUser("talent");
  
  // Get profile status
  const profileStatus = await getTalenProfileStatus().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get talent profile status error (talent verification page): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting talent profile status",
    });
    return undefined;
  });

  // If profile is already complete, redirect to dashboard
  if (profileStatus && Object.values(profileStatus).every(Boolean)) {
    redirect("/talents/dashboard");
  }

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      {!!profileStatus && (
        <TalentVerification profileStatus={profileStatus} />
      )}
    </>
  );
};

export default TalentVerificationPage;