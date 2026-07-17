import { Metadata } from "next";

import EmailVerificationForm from "./EmailVerificationForm";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";
import { getRoleUrlSegment } from "@/app/common/utils";

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
  const role = as === "talent" ? "talent" : "recruiter";
  const roleSegment = getRoleUrlSegment(role);
  return (
    <AuthFormPageWrapper
      title='Verify your email address'
      description={`Kindly enter below the verification code sent to your email: ${
        email || "unavailable"
      }.`}
      goBackHref={`/${roleSegment}/signin${next ? `?next=${next}` : ""}`}
      as={role}
    >
      <EmailVerificationForm
        email={email}
        loginUrl={`/${roleSegment}/signin${next ? `?next=${next}` : ""}`}
        autoLoginRedirect={
          role === "recruiter"
            ? next || "/recruiter/onboarding"
            : next || "/talents/dashboard"
        }
      />
    </AuthFormPageWrapper>
  );
};

export default EmailVerification;
