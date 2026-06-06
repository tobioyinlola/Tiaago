"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getDashboardUrl } from "../utils";
import { useUserStore } from "../store/useUser";
import CustomButton, { CustomButtonProps } from "./CustomButton";

type AuthButtonProps = {
  text?: string;
  loggedInText?: string;
  loggedOutText?: string;
  className?: string;
  loggedInUrlPath?: string;
};

const AuthButton = ({
  text = "",
  loggedInText = text || "Dashboard",
  loggedOutText = text || "Get Started",
  className = "",
  loggedInUrlPath = "",
}: AuthButtonProps) => {
  const currentUser = useUserStore(s => s.profile);
  const dashboardUrl = getDashboardUrl(currentUser?.user_type);
  return (
    <Link
      href={dashboardUrl ? dashboardUrl + loggedInUrlPath : "/onboarding"}
      className={className}
    >
      {currentUser ? loggedInText : loggedOutText}
    </Link>
  );
};

export default AuthButton;

export const CustomAuthButton = ({
  text = "",
  loggedInText = text || "Dashboard",
  loggedOutText = text || "Get Started",
  className = "",
  loggedInUrlPath = "",
  children,
  ...props
}: AuthButtonProps & CustomButtonProps) => {
  const currentUser = useUserStore(s => s.profile);
  const router = useRouter();
  const dashboardUrl = getDashboardUrl(currentUser?.user_type);
  const href = dashboardUrl ? dashboardUrl + loggedInUrlPath : "/onboarding";
  const onClick = () => {
    router.push(href);
  };
  return (
    <CustomButton className={className} onClick={onClick} {...props}>
      {children || (currentUser ? loggedInText : loggedOutText)}
    </CustomButton>
  );
};
