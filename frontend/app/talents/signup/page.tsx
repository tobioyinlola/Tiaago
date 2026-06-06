import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import SignupForm from "./components/SignUpFormV3";
import LoginUpgradeModal from "@/app/common/components/LoginUpgradeModal";
import { getCountries } from "@/app/common/services";
import { getTalentRoles } from "@/app/common/services";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";

export const metadata = {
  title: "Talent Registration",
  description: "Create a Tiaago account as a talent",
};

const Signup = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; referral_code?: string }>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { next, referral_code } = await searchParams;
  await getCurrentUser(undefined, {
    allowNull: true,
    validUserRedirect: "dashboard",
  });
  const talentRoles = await getTalentRoles().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get talent roles error (talent signup): ", error);
    errors.push({
      message: error,
      title: "Error getting talent roles",
    });
    return [];
  });
  const groupedCountries = await getCountries().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get countries error (talent signup): ", error);
    errors.push({
      message: error,
      title: "Error getting countries",
    });
    return [];
  });

  return (
    <AuthFormPageWrapper
      title='Create An Account'
      as='talent'
      unconstrainedWidth
      hideSupport
      className='pb-3'
      containerClassName='max-md:pt-3'
      next={next}
    >
      <LoginUpgradeModal />
      <SignupForm
        talentRoles={talentRoles}
        groupedCountries={groupedCountries}
        next={next}
        referral_code={referral_code}
      />
      <DisplayErrorMessages errors={errors} />
    </AuthFormPageWrapper>
  );
};

export default Signup;
