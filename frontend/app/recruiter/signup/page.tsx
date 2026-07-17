import "react-phone-input-2/lib/style.css";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import SignupForm from "./components/SignUpFormV3";
import { getCountries } from "@/app/common/services";
import { getCurrentUser } from "@/app/common/services/profile";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Recruiter Registration",
  description: "Create a Tiaago account for your recruiter",
};

const Signup = async ({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    referral_code?: string;
    email?: string;
    invite_token?: string;
    ref?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { next, referral_code, email, invite_token, ref, utm_source, utm_medium, utm_campaign } =
    await searchParams;
  await getCurrentUser(undefined, {
    allowNull: true,
    validUserRedirect: "dashboard",
  });
  const groupedCountries = await getCountries().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get countries error (recruiter signup): ", error);
    errors.push({
      message: error,
      title: "Error getting countries",
    });
    return [];
  });
  return (
    <AuthFormPageWrapper
      title='Create An Account'
      description='Sign up to access top talent and streamline your hiring'
      unconstrainedWidth
      hideSupport
      className='pb-3 md:flex md:flex-col md:justify-center'
      containerClassName='pt-3'
      next={next}
    >
      <SignupForm
        groupedCountries={groupedCountries}
        next={next}
        referral_code={referral_code}
        initialEmail={email}
        invite_token={invite_token}
        orgRefCode={ref}
        utm_source={utm_source}
        utm_medium={utm_medium}
        utm_campaign={utm_campaign}
      />
      <DisplayErrorMessages errors={errors} />
    </AuthFormPageWrapper>
  );
};

export default Signup;
