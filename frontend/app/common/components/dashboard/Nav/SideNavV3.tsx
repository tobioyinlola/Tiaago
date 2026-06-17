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
        "px-2.5 flex flex-col font-poppins h-full bg-[#FDFDFD] transition-[width] duration-300 overflow-hidden",
        isExpanded ? "lg:w-[240px]" : "lg:w-[72px]"
      )}
      verticalScrollClassName='!hidden'
      horizontalScrollClassName='!hidden'
    >
      <div className='p-2.5 pt-5'>
        <div
          className={cn(
            "flex w-full max-lg:hidden",
            isExpanded ? "justify-end" : "justify-center"
          )}
        >
          <button
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            onClick={toggleExpansion}
            className={cn(
              "text-2xl text-primary transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          >
            <MdKeyboardDoubleArrowRight />
          </button>
        </div>
        <NavLink
          className='flex items-center group mt-4 text-[#6C757D] capitalize hover:bg-[#F1F3FF] rounded-[5px] px-2.5 py-[5px]'
          href={homeItem.href}
          exact
          activeClassName='text-primary fill-primary bg-[#F1F3FF]'
          colsesMobileDrawer
          isProfileComplete={isProfileComplete}
          title={!isExpanded ? homeItem.name : undefined}
        >
          <homeItem.Icon className='text-2xl min-w-[24px] group-data-[active=false]:text-[#2E3031]' />

          <h2
            className={cn(
              "ms-3 text-base font-medium whitespace-nowrap",
              !isExpanded && "lg:hidden"
            )}
          >
            {homeItem.name}
          </h2>
        </NavLink>
      </div>
      <hr />

      <div className='p-2.5 mt-8 space-y-2.5'>
        {navItems.map((item, i) =>
          item.type === "divider" ? (
            <hr key={i} className='pb-8' />
          ) : item.subLinks && isExpanded ? (
            <NavDropdown
              key={`${i}-dropdown`}
              href={item.href}
              subLinks={item.subLinks}
              colsesMobileDrawer
              className='py-[5px] md:px-2.5 text-[#6C757D] fill-[#2E3031] text-sm font-medium hover:bg-[#F1F3FF] flex rounded-[5px]'
              activeClassName='text-primary fill-primary bg-[#FAFAFA]'
              anchorClassName='py-[5px] min-h-fit h-fit md:px-2.5 md:pe-9 text-[#6C757D] fill-[#2E3031] text-sm font-medium hover:bg-[#F1F3FF] flex items-center rounded-[5px]'
              anchorActiveClassName='text-primary fill-primary'
              badges={badges}
            >
              <div className='w-6 h-6'>
                <item.Icon className='text-2xl group-data-[active=false]:text-[#292D32]' />
              </div>
              <h2 className='me-auto ms-3 text-base font-medium capitalize whitespace-nowrap'>
                {item.name}
              </h2>
            </NavDropdown>
          ) : (
            <NavLink
              href={item.href}
              key={i}
              className='group flex items-center text-[#6C757D] hover:bg-[#F1F3FF] rounded-[5px] px-2.5 py-[5px]'
              activeClassName='text-primary fill-primary bg-[#F1F3FF]'
              exact={item.exact}
              colsesMobileDrawer
              badge={isExpanded ? badges[item.name] : undefined}
              isProfileComplete={isProfileComplete}
              title={!isExpanded ? item.name : undefined}
            >
              <item.Icon className='text-2xl min-w-[24px] group-data-[active=false]:text-[#2E3031]' />
              <h2
                className={cn(
                  "me-auto ms-3 text-base font-medium capitalize whitespace-nowrap",
                  !isExpanded && "lg:hidden"
                )}
              >
                {item.name}
              </h2>

              {!!(item.tag && isExpanded) && (
                <h3 className='ms-5 bg-[#FFC7C7] rounded-sm p-[2px] font-poppins font-medium text-[10px] text-[#FF4A4A]'>
                  {item.tag}
                </h3>
              )}
            </NavLink>
          )
        )}
      </div>

      <hr className='mb-auto' />

      <div className='p-2.5 mt-8'>
        <Link
          href={`mailto:${SUPPORT_EMAIL}`}
          target='_blank'
          className='flex items-center gap-3 text-[#6C757D] px-2.5 py-[5px]'
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
