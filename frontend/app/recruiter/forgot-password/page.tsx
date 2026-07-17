import { Metadata } from "next";

import { getCurrentUser } from "@/app/common/services/profile";
import ForgotPasswordForm from "@/app/common/components/Forms/ForgotPasswordForm";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";

export const metadata: Metadata = {
  title: "Forgot Password",
  description:
    "Request password reset instructions to be sent to your email address",
};

const ForgotPassword = async () => {
  await getCurrentUser(undefined, {
    allowNull: true,
    validUserRedirect: "dashboard",
  });
  return (
    <AuthFormPageWrapper
      title='Forgot Password'
      description='Please enter your email address to reset password'
      goBackHref='/recruiter/signin'
      as='recruiter'
    >
      <ForgotPasswordForm />
    </AuthFormPageWrapper>
  );
};

export default ForgotPassword;
