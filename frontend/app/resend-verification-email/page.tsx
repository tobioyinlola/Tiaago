import { Metadata } from "next";

import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";
import ForgotPasswordForm from "@/app/common/components/Forms/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Resend Verification Email",
  description:
    "Request account verification instructions to be sent to your email address",
};

const ForgotPassword = () => {
  return (
    <AuthFormPageWrapper
      title='Resend Verification Email'
      description='Please enter your email address to verify your account'
      as='talent'
    >
      <ForgotPasswordForm />
    </AuthFormPageWrapper>
  );
};

export default ForgotPassword;
