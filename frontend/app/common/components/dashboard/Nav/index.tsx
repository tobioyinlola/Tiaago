import Link from "next/link";

import MobileNav from "./MobileNav";
import UserAvatar, {
  type UserAvatarProps,
} from "@/app/common/components/UserAvatar";

import { cn, getRoleUrlSegment } from "@/app/common/utils";
import { BasePageProps } from "@/app/common/types";
import BrandLink from "@/app/common/components/BrandLink";
import SearchBar from "@/app/common/components/SearchBar";
import NotificationBell from "@/app/common/components/dashboard/NotificationBell";

type NavProps = {
  as?: BasePageProps["as"];
  email: string;
  hideMenuIcon?: boolean;
} & UserAvatarProps;

const Nav = ({
  as = "talent",
  email,
  className,
  hideMenuIcon,
  ...userAvatarProps
}: NavProps) => {
  const isStaff = as === "staff";
  const dashboardLink =
    as === "staff"
      ? "/admin"
      : `/${getRoleUrlSegment(as!)}${as === "recruiter" ? "/dashboard" : ""}`;
  return (
    <header
      className={cn(
        "flex justify-between items-center bg-white border-b border-outline px-9 h-20",
        className
      )}
    >
      <BrandLink className='max-lg:fill-white hover:fill-primary' href={dashboardLink} />

      {/* Search */}
      <SearchBar
        className='max-lg:hidden flex-[0.5]'
        placeholder='Search anything that comes to mind'
        searchKey='global'
      />

      <div className='flex items-center gap-4 lg:gap-6'>
        {/* Notifications -- visible at every breakpoint; the sidebar has no
            equivalent entry point on mobile, so this is the only way in. */}
        {!isStaff && <NotificationBell viewAllHref={`${dashboardLink}/notifications`} />}
        {/* Avatar */}
        <Link href={`${dashboardLink}/settings?tab=profile`} className='max-lg:hidden'>
          <UserAvatar forCurrentUser {...userAvatarProps} />
        </Link>
      </div>
      {!hideMenuIcon && <MobileNav />}
    </header>
  );
};

export default Nav;
