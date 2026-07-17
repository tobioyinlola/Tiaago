import { Metadata } from "next";

import LoginUpgradeModal from "@/app/common/components/LoginUpgradeModal";
import { getCurrentUser } from "@/app/common/services/profile";
import LoginForm from "@/app/common/components/Forms/LoginForm/V3";
import AuthFormPageWrapper from "@/app/common/components/Forms/AuthFormPageWrapper";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your tiaago account",
};

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) => {
  await getCurrentUser(undefined, {
    allowNull: true,
    validUserRedirect: "dashboard",
  });
  const { next } = await searchParams;
  return (
    <AuthFormPageWrapper
      title='Welcome back!'
      isSignIn
      // titleContainerClassName='hidden'
      // altLinkClassName='text-center'
      next={next}
    >
      <LoginUpgradeModal />
      <LoginForm as='recruiter' next={next} />
    </AuthFormPageWrapper>
  );
};

export default LoginPage;
