import { Metadata } from "next";

import EmailVerificationForm from "./EmailVerificationForm";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";

export const metadata: Metadata = {
  title: "Email Verification",
  description: "Account email verification",
};

const EmailVerification = async ({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; email: string; next?: string }>;
}) => {
  const { as, email, next } = await searchParams;
  const role = as === "talent" ? "talent" : "startup";
  return (
    <AuthFormPageWrapper
      title='Verify your email address'
      description={`Kindly enter below the verification code sent to your email: ${
        email || "unavailable"
      }.`}
      goBackHref={`/${role}s/signin${next ? `?next=${next}` : ""}`}
      as={role}
    >
      <EmailVerificationForm
        email={email}
        loginUrl={`/${role}s/signin${next ? `?next=${next}` : ""}`}
        autoLoginRedirect={
          role === "startup" ? next || "/startups/onboarding" : undefined
        }
      />
    </AuthFormPageWrapper>
  );
};

export default EmailVerification;
