import Link from "next/link";
import { FiBell } from "react-icons/fi";

import MobileNav from "./MobileNav";
import UserAvatar, {
  type UserAvatarProps,
} from "@/app/common/components/UserAvatar";

import { cn } from "@/app/common/utils";
import { BasePageProps } from "@/app/common/types";
import BrandLink from "@/app/common/components/BrandLink";
import SearchBar from "@/app/common/components/SearchBar";
// import UpgradePlanModal from "../subscription/UpgradePlanModal";
// import { getAvailableSubscriptionPlans } from "@/app/common/services/subscription";

type NavProps = {
  as?: BasePageProps["as"];
  // subscribedPlan: User["subscribed_plan"];
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
  // const availablePlans =
  //   as !== "startup" ? [] : await getAvailableSubscriptionPlans();
  // const highestPlan = !availablePlans.length
  //   ? null
  //   : availablePlans.reduce((prev, current) =>
  //       parseFloat(prev.amount) > parseFloat(current.amount) ? prev : current
  //     );
  // const isOnHighestPlan =
  //   subscribedPlan?.plan_id === highestPlan?.pk &&
  //   parseFloat(highestPlan?.amount ?? "0") > 0;
  const dashboardLink =
    as === "staff"
      ? "/admin"
      : `/${as}s${as === "startup" ? "/dashboard" : ""}`;
  // console.dir(
  //   { availablePlans, subscribedPlan, isOnHighestPlan },
  //   { depth: 5 }
  // );
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

      <div className='flex items-center gap-4 lg:gap-6 max-lg:hidden'>
        {/* CTA */}
        {/* {as === "startup" && !isOnHighestPlan && (
          <UpgradePlanModal
            subscriptionPlans={availablePlans}
            subscribedPlan={subscribedPlan}
            isNav
            as={as}
            email={email}
          />
        )} */}
        {/* Notifications */}
        {!isStaff && (
          <Link
            href={`${dashboardLink}/settings?tab=notifications`}
            className='text-2xl text-gray-500 hover:text-gray-700'
          >
            <FiBell />
          </Link>
        )}
        {/* Avatar */}
        <Link href={`${dashboardLink}/settings?tab=profile`}>
          <UserAvatar forCurrentUser {...userAvatarProps} />
        </Link>
      </div>
      {!hideMenuIcon && <MobileNav />}
    </header>
  );
};

export default Nav;
