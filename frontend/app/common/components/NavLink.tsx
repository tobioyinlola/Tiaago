"use client";

import Link from "next/link";
import { toast } from "sonner";
import type { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";

import { closeDropdown, cn, optimizeCount } from "../utils";
import { useAlert } from "../store/useAlert";

type NavLinkProps = {
  className?: string;
  activeClassName?: string;
  href: string;
  exact?: boolean;
  colsesMobileDrawer?: boolean;
  colsesDropdown?: boolean;
  badge?: number | boolean;
  isProfileComplete?: boolean;
};

const NavLink = ({
  className,
  href,
  activeClassName,
  exact,
  children,
  colsesMobileDrawer,
  colsesDropdown,
  badge,
  isProfileComplete,
}: PropsWithChildren<NavLinkProps>) => {
  const setAlert = useAlert(s => s.setAlert);
  const pathName = usePathname();
  const isActive = exact
    ? pathName === href
    : pathName.includes(href.split("?").at(0) ?? "");
  const jobsPostedOvveride =
    pathName === "/startups/dashboard/jobs/jobs-posted" &&
    href === "/startups/dashboard/jobs/create";
  const _isActive = isActive || jobsPostedOvveride;

  return (
    <Link
      href={href}
      className={cn("relative", className, _isActive && activeClassName)}
      data-active={_isActive}
      onClick={e => {
        if (!isProfileComplete && href === "/talents/jobs/search") {
          setAlert({
            title: "Verify Your Account",
            message: "Please complete your verification to unlock this feature.",
            icon: "info",
            buttonText: "Verify Account",
            buttonLink: "/talents/verification",
          });
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (colsesMobileDrawer)
          document.getElementById("mobile-drawer")?.click();
        if (colsesDropdown) closeDropdown();
        if (href === "#") {
          e.preventDefault();
          e.stopPropagation();
          toast.info("Coming soon...");
        }
      }}
    >
      {!!badge && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 right-0 badge badge-primary text-white font-medium",
            badge === true && "badge-sm"
          )}
        >
          {typeof badge === "number" ? optimizeCount(badge) : ""}
        </div>
      )}
      {children}
    </Link>
  );
};

export default NavLink;
