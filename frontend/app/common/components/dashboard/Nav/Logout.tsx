"use client";
import { HiOutlineLogout } from "react-icons/hi";

import { BasePageProps } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { removeAuthCookies } from "@/app/common/actions";
import { cn, getOnboardingUrl } from "@/app/common/utils";

const Logout = ({
  as,
  className,
  textClassName,
}: {
  as?: BasePageProps["as"];
  className?: string;
  textClassName?: string;
}) => {
  const setAlert = useAlert(state => state.setAlert);
  const logout = async () => {
    try {
      const res = await removeAuthCookies();
      console.log({ res });
    } catch (error) {
      console.log({ error });
    } finally {
      window.location.href = getOnboardingUrl(as);
    }
  };
  const onClick = () =>
    setAlert({
      title: "Are you sure?",
      message: "Do you want to logout from your account?",
      icon: "warning",
      buttonText: "Logout",
      buttonAction: logout,
      buttonClassName: "btn-error text-white",
    });
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 group py-2 px-4 text-[#858585] text-sm font-medium hover:text-error",
        className
      )}
    >
      <HiOutlineLogout className='text-2xl text-[#292D32] group-hover:text-error' />
      <span className={cn("capitalize", textClassName)}>logout</span>
    </button>
  );
};

export default Logout;
