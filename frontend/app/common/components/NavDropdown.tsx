"use client";

import Link from "next/link";
import type { PropsWithChildren } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { cn, optimizeCount } from "../utils";

type NavDropdownProps = {
  anchorClassName?: string;
  anchorActiveClassName?: string;
  className?: string;
  activeClassName?: string;
  href: string;
  colsesMobileDrawer?: boolean;
  subLinks: {
    name: string;
    href: string;
  }[];
  asAccordion?: boolean;
  badges: Record<string, number | boolean>;
};

const NavDropdown = ({
  className,
  href,
  activeClassName,
  children,
  colsesMobileDrawer,
  subLinks,
  anchorActiveClassName,
  anchorClassName,
  asAccordion,
  badges,
}: PropsWithChildren<NavDropdownProps>) => {
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const isActive = pathName.includes(href.split("?").at(0) ?? "");
  const relatedBadges = subLinks
    .map(({ name }) => ({
      name,
      badge: badges[name] ?? false,
    }))
    .filter(({ badge }) => badge);
  const badge = !relatedBadges.length
    ? false
    : relatedBadges.every(({ badge }) => typeof badge === "boolean")
    ? true
    : relatedBadges.reduce(
        (acc, { badge }) => acc + (typeof badge === "number" ? badge : 1),
        0
      );
  const isExternal = href.startsWith("http") || href.startsWith("//");

  return (
    <div
      className='collapse group collapse-arrow rounded-sm'
      data-active={isActive}
    >
      <input
        type={asAccordion ? "radio" : "checkbox"}
        name={asAccordion ? "side-nav-accordion" : undefined}
        defaultChecked={isActive}
        className="min-h-fit h-full"
      />
      <div
        className={cn(
          "collapse-title text-xl font-medium relative",
          anchorClassName,
          isActive && anchorActiveClassName
        )}
      >
        {children}
        {!!badge && (
          <div
            className={cn(
              "badge badge-primary text-white font-medium",
              badge === true && "badge-sm"
            )}
          >
            {typeof badge === "number" ? optimizeCount(badge) : ""}
          </div>
        )}
      </div>
      <div className='collapse-content pr-0'>
        <ul className='ml-[10px] py-4 pl-4 flex flex-col gap-2 border-l border-gray-200'>
          {subLinks.map(({ href, name }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "relative",
                  className,
                  (href.includes("?") ? `${pathName}?=${query}` : pathName) ===
                    href && activeClassName
                )}
                onClick={() => {
                  if (colsesMobileDrawer)
                    document.getElementById("mobile-drawer")?.click();
                }}
                target={isExternal ? "_blank" : ""}
                rel={isExternal ? "noopener noreferrer" : ""}
              >
                {!!badges[name] && (
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 right-0 badge badge-primary text-white font-medium",
                      badges[name] === true && "badge-sm"
                    )}
                  >
                    {typeof badges[name] === "number"
                      ? optimizeCount(badges[name] as number)
                      : ""}
                  </div>
                )}
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NavDropdown;
