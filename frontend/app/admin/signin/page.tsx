import { Metadata } from "next";

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
      title='Log in'
      isSignIn
      as='staff'
      next={next}
    >
      <LoginForm as='staff' next={next} />
    </AuthFormPageWrapper>
  );
};

export default LoginPage;
