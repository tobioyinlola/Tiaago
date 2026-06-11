import { Metadata } from "next";

import { getCurrentUser } from "@/app/common/services/profile";
import ResetPasswordForm from "../../common/components/Forms/ResetPasswordForm";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your tiaago account",
};

const ResetPassword = async ({
  searchParams,
}: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) => {
  await getCurrentUser(undefined, {
    allowNull: true,
    validUserRedirect: "dashboard",
  });
  const resolvedSearchParams = await searchParams;
  const uid = typeof resolvedSearchParams.uid === "string" ? resolvedSearchParams.uid : "";
  // Reset emails sent before the link fix appended a stray "/" to the token.
  const token =
    typeof resolvedSearchParams.token === "string"
      ? resolvedSearchParams.token.replace(/\/+$/, "")
      : "";

  if (!uid || !token) {
    return (
      <AuthFormPageWrapper
        title='Invalid Link'
        description='The link you have followed is invalid or expired'
        as='staff'
      >
        <p className='text-center'>
          Please check the link in your email and try again
        </p>
      </AuthFormPageWrapper>
    );
  }

  return (
    <AuthFormPageWrapper
      title='Set New Password'
      description='Please enter your new password'
      as='staff'
      // className='md:pt-20'
    >
      <ResetPasswordForm token={token} uid={uid} as='staff' />
    </AuthFormPageWrapper>
  );
};

export default ResetPassword;
