import { BiChevronRight } from "react-icons/bi";

import Logout from "./Logout";
import { cn } from "@/app/common/utils";
import NavLink from "@/app/common/components/NavLink";
import ScrollArea from "@/app/common/components/ScrollArea";
import NavDropdown from "@/app/common/components/NavDropdown";
import { BasePageProps, DashboardNavItem } from "@/app/common/types";

const SideNav = ({
  navItems,
  as,
  badges = {},
  className,
}: {
  navItems: DashboardNavItem[];
  as: BasePageProps["as"];
  badges?: Record<string, number | boolean>;
  className?: string;
}) => {
  return (
    <ScrollArea
      className={cn(
        "h-[calc(100svh-5rem)] w-full max-lg:min-w-[60%] bg-white lg:max-w-[calc(100svw*(1/6))]",
        className
      )}
    >
      <nav className='flex flex-col justify-between px-3 h-[calc(100svh-10rem)] sm:h-[calc(100svh-5rem)] w-full max-md:min-w-[60%]'>
        <ul className='py-4 flex flex-col gap-2'>
          {navItems.map(({ Icon, href, name, subLinks }) => (
            <li key={href}>
              {subLinks ? (
                <NavDropdown
                  href={href}
                  subLinks={subLinks}
                  colsesMobileDrawer
                  className='py-2 px-4 md:px-2 text-[#858585] fill-[#292D32] text-sm font-medium hover:bg-[#FAFAFA] flex rounded-sm'
                  activeClassName='text-primary fill-primary bg-[#FAFAFA]'
                  anchorClassName='flex items-center gap-2 text-sm font-medium group-hover:bg-[#FAFAFA] py-2 px-4 md:px-2 text-[#858585] fill-[#292D32] rounded-sm'
                  anchorActiveClassName='text-primary fill-primary'
                  badges={badges}
                >
                  <div className='w-6 h-6'>
                    <Icon className='text-2xl group-data-[active=false]:text-[#292D32]' />
                  </div>
                  <span className='capitalize'>{name}</span>
                </NavDropdown>
              ) : (
                <NavLink
                  className='flex items-center gap-2 py-2 px-4 md:px-2 group text-[#858585] fill-[#292D32] text-sm font-medium hover:bg-[#FAFAFA] rounded-sm'
                  activeClassName='text-primary fill-primary bg-[#FAFAFA]'
                  href={href}
                  exact={name === "home"}
                  colsesMobileDrawer
                  badge={badges[name]}
                >
                  <div className='w-6 h-6'>
                    <Icon className='text-2xl group-data-[active=false]:text-[#292D32]' />
                  </div>
                  <span className='capitalize'>{name}</span>
                  <BiChevronRight className='text-xl group-data-[active=false]:text-[#858585] ml-auto md:hidden shrink-0' />
                </NavLink>
              )}
            </li>
          ))}
          {as !== "staff" && (
            <li>
              <NavDropdown
                href='#'
                badges={{}}
                subLinks={[
                  {
                    href: "https://tiaago.tawk.help/",
                    name: "Knowledge base",
                  },
                  ...(as === "recruiter"
                    ? [
                        {
                          // href: "https://calendly.com/tiaagoglobal/30min",
                          href: "https://calendly.com/justus-tiaago/30min",
                          name: "Schedule a call",
                        },
                      ]
                    : []),
                  {
                    href: "https://tawk.to/chat/66dc833e50c10f7a00a561a8/1i76m1c39",
                    name: "Live chat",
                  },
                ]}
                colsesMobileDrawer
                className='py-2 px-4 md:px-2 text-[#858585] fill-[#292D32] text-sm font-medium hover:bg-[#FAFAFA] flex rounded-sm'
                activeClassName='text-primary fill-primary bg-[#FAFAFA]'
                anchorClassName='flex items-center gap-2 text-sm font-medium group-hover:bg-[#FAFAFA] py-2 px-4 md:px-2 text-[#858585] fill-[#292D32] rounded-sm'
                anchorActiveClassName='text-primary fill-primary'
              >
                <div className='w-6 h-6'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    // className='text-2xl group-data-[active=false]:text-[#292D32]'
                  >
                    <path d='M8 22.3199C7.72 22.3199 7.42998 22.2499 7.16998 22.1099C6.59998 21.8099 6.25 21.2099 6.25 20.5699V19.15C3.23 18.84 1.25 16.6199 1.25 13.4399V7.43994C1.25 3.99994 3.56 1.68994 7 1.68994H17C20.44 1.68994 22.75 3.99994 22.75 7.43994V13.4399C22.75 16.8799 20.44 19.1899 17 19.1899H13.23L8.96997 22.03C8.67997 22.22 8.34 22.3199 8 22.3199ZM7 3.17993C4.42 3.17993 2.75 4.84993 2.75 7.42993V13.43C2.75 16.01 4.42 17.68 7 17.68C7.41 17.68 7.75 18.02 7.75 18.43V20.56C7.75 20.69 7.83 20.75 7.88 20.78C7.93001 20.81 8.03001 20.84 8.14001 20.77L12.59 17.81C12.71 17.73 12.86 17.68 13.01 17.68H17.01C19.59 17.68 21.26 16.01 21.26 13.43V7.42993C21.26 4.84993 19.59 3.17993 17.01 3.17993H7Z' />
                    <path d='M11.9998 12.1099C11.5898 12.1099 11.2498 11.7699 11.2498 11.3599V11.1499C11.2498 9.9899 12.0998 9.41989 12.4198 9.19989C12.7898 8.94989 12.9098 8.7799 12.9098 8.5199C12.9098 8.0199 12.4998 7.60986 11.9998 7.60986C11.4998 7.60986 11.0898 8.0199 11.0898 8.5199C11.0898 8.9299 10.7498 9.2699 10.3398 9.2699C9.92984 9.2699 9.58984 8.9299 9.58984 8.5199C9.58984 7.1899 10.6698 6.10986 11.9998 6.10986C13.3298 6.10986 14.4098 7.1899 14.4098 8.5199C14.4098 9.6599 13.5698 10.2299 13.2598 10.4399C12.8698 10.6999 12.7498 10.8699 12.7498 11.1499V11.3599C12.7498 11.7799 12.4098 12.1099 11.9998 12.1099Z' />
                    <path d='M12 14.6001C11.58 14.6001 11.25 14.2601 11.25 13.8501C11.25 13.4401 11.59 13.1001 12 13.1001C12.41 13.1001 12.75 13.4401 12.75 13.8501C12.75 14.2601 12.42 14.6001 12 14.6001Z' />
                  </svg>
                </div>
                Contact Support
              </NavDropdown>
            </li>
          )}
        </ul>
        <Logout as={as} />
      </nav>
    </ScrollArea>
  );
};

export default SideNav;
