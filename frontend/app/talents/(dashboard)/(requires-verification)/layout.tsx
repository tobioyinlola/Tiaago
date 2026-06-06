import { PropsWithChildren } from "react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getPortfolio } from "@/app/common/services/talents";
import SetTalentProfile from "../components/SetTalentProfile";
import { getTalenProfileStatus } from "@/app/common/services";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import TalentVerification from "../components/TalentVerification";

const TalentVerificationRequiredLayout = async ({
  children,
}: PropsWithChildren) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const user = (await getCurrentUser("talent")).currentUser;
  const profileStatus = await getTalenProfileStatus().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get talent profile status error (talent dashboard (requires-verification) layout): ",
      error
    );
    // !Already pushed in talent layout
    // errors.push({
    //   message: error,
    //   title: "Error getting talent profile status",
    // });
    return undefined;
  });
  const isProfileComplete = Object.values(profileStatus ?? {}).every(Boolean);
  const portfolioRes = await getPortfolio().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get talent portfolio error (talent dashboard (requires-verification) layout): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting talent portfolio",
    });
    return {
      success: false,
      error: error,
      data: undefined,
    };
  });
  return (
    <>
      {isProfileComplete ? (
        children
      ) : (
        <>
          <DisplayErrorMessages errors={errors} />
          <SetTalentProfile profile={user} portfolio={portfolioRes.data} />
          {!!profileStatus && (
            <TalentVerification profileStatus={profileStatus} />
          )}
        </>
      )}
    </>
  );
};

export default TalentVerificationRequiredLayout;
