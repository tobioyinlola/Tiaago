"use client";

import Link from "next/link";
import { BiSolidChat } from "react-icons/bi";
import { RxDashboard } from "react-icons/rx";
import { MdKeyboardDoubleArrowRight } from "react-icons/md";

import Logout from "./Logout";
import NavLink from "../../NavLink";
import { cn } from "@/app/common/utils";
import ScrollArea from "../../ScrollArea";
import { BasePageProps } from "@/app/common/types";
import { SUPPORT_EMAIL } from "@/app/common/constants";
import { talentNavItems } from "@/app/talents/(dashboard)/constants/nav";
import { startupNavItems } from "@/app/startups/dashboard/constants/nav";
import { navItems as adminNavItems } from "@/app/admin/(dashboard)/constants/nav";
import { usePersistedStore } from "@/app/common/store/usePersistedStore";
import NavDropdown from "../../NavDropdown";

const SideNavV3 = ({
  badges = {},
  as,
  isProfileComplete,
}: {
  badges?: Record<string, number | boolean>;
  as: BasePageProps["as"];
  isProfileComplete?: boolean;
}) => {
  const [isExpanded, toggleExpansion] = usePersistedStore(state => [
    state.isSideBarExpanded,
    state.toggleSideBarExpanded,
  ]);

  const baseHref = as === "staff" ? "/admin" : `/${as}s`;
  const homeItem = {
    name: "home",
    href: as === "staff" ? baseHref : `${baseHref}/dashboard`,
    Icon: RxDashboard,
  };

  const navItems =
    as === "talent"
      ? talentNavItems
      : as === "staff"
      ? adminNavItems
      : startupNavItems;

  return (
    <ScrollArea
      id={`${as}-side-bar`}
      className={cn(
        "px-3 flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-[width] duration-300 overflow-hidden",
        isExpanded ? "lg:w-[240px]" : "lg:w-[72px]"
      )}
      verticalScrollClassName='!hidden'
      horizontalScrollClassName='!hidden'
    >
      <div className='px-1.5 pt-5'>
        <div
          className={cn(
            "flex w-full max-lg:hidden",
            isExpanded ? "justify-end" : "justify-center"
          )}
        >
          <button
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            onClick={toggleExpansion}
            className={cn(
              "text-2xl text-primary transition-transform duration-300 hover:text-primary/80",
              isExpanded && "rotate-180"
            )}
          >
            <MdKeyboardDoubleArrowRight />
          </button>
        </div>
        <NavLink
          className='flex items-center group mt-4 text-sidebar-foreground capitalize hover:bg-sidebar-accent rounded-md px-2.5 py-2'
          href={homeItem.href}
          exact
          activeClassName='text-sidebar-accent-foreground fill-sidebar-accent-foreground bg-sidebar-accent border-l-[3px] border-primary'
          colsesMobileDrawer
          isProfileComplete={isProfileComplete}
          title={!isExpanded ? homeItem.name : undefined}
        >
          <homeItem.Icon className='text-2xl min-w-[24px] group-data-[active=false]:text-foreground/70' />

          <h2
            className={cn(
              "ms-3 text-sm font-medium whitespace-nowrap",
              !isExpanded && "lg:hidden"
            )}
          >
            {homeItem.name}
          </h2>
        </NavLink>
      </div>
      <div className='mx-1.5 my-3 border-t border-sidebar-border' />

      <div className='px-1.5 space-y-1'>
        {isExpanded && (
          <p className='px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            Menu
          </p>
        )}
        {navItems.map((item, i) =>
          item.type === "divider" ? (
            <div key={i}>
              <div className='my-3 border-t border-sidebar-border' />
              {isExpanded && (
                <p className='px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                  {as === "staff" ? "Management" : "Account"}
                </p>
              )}
            </div>
          ) : item.subLinks && isExpanded ? (
            <NavDropdown
              key={`${i}-dropdown`}
              href={item.href}
              subLinks={item.subLinks}
              colsesMobileDrawer
              className='py-1.5 md:px-2.5 text-sidebar-foreground fill-foreground/70 text-sm font-medium hover:bg-sidebar-accent flex rounded-md'
              activeClassName='text-sidebar-accent-foreground fill-sidebar-accent-foreground bg-sidebar-accent'
              anchorClassName='py-2 min-h-fit h-fit md:px-2.5 md:pe-9 text-sidebar-foreground fill-foreground/70 text-sm font-medium hover:bg-sidebar-accent flex items-center rounded-md'
              anchorActiveClassName='text-sidebar-accent-foreground fill-sidebar-accent-foreground'
              badges={badges}
            >
              <div className='w-6 h-6'>
                <item.Icon className='text-2xl group-data-[active=false]:text-foreground/70' />
              </div>
              <h2 className='me-auto ms-3 text-sm font-medium capitalize whitespace-nowrap'>
                {item.name}
              </h2>
            </NavDropdown>
          ) : (
            <NavLink
              href={item.href}
              key={i}
              className='group flex items-center text-sidebar-foreground hover:bg-sidebar-accent rounded-md px-2.5 py-2'
              activeClassName='text-sidebar-accent-foreground fill-sidebar-accent-foreground bg-sidebar-accent border-l-[3px] border-primary'
              exact={item.exact}
              colsesMobileDrawer
              badge={isExpanded ? badges[item.name] : undefined}
              isProfileComplete={isProfileComplete}
              title={!isExpanded ? item.name : undefined}
            >
              <item.Icon className='text-2xl min-w-[24px] group-data-[active=false]:text-foreground/70' />
              <h2
                className={cn(
                  "me-auto ms-3 text-sm font-medium capitalize whitespace-nowrap",
                  !isExpanded && "lg:hidden"
                )}
              >
                {item.name}
              </h2>

              {!!(item.tag && isExpanded) && (
                <span className='ms-auto bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[10px] font-semibold'>
                  {item.tag}
                </span>
              )}
            </NavLink>
          )
        )}
      </div>

      <div className='mx-1.5 mt-3 mb-auto border-t border-sidebar-border' />

      <div className='px-1.5 py-4'>
        <Link
          href={`mailto:${SUPPORT_EMAIL}`}
          target='_blank'
          className='flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent rounded-md px-2.5 py-2 transition-colors'
          title={!isExpanded ? "Support Center" : undefined}
        >
          <div className='w-6 h-6 flex items-center justify-center rounded-full bg-primary shrink-0'>
            <BiSolidChat className='text-base text-white' />
          </div>
          <h2
            className={cn(
              "text-sm font-medium whitespace-nowrap",
              !isExpanded && "lg:hidden"
            )}
          >
            Support Center
          </h2>
        </Link>

        <Logout
          className='px-2.5'
          as={as}
          textClassName={cn(!isExpanded && "lg:hidden")}
        />
      </div>
    </ScrollArea>
  );
};

export default SideNavV3;
