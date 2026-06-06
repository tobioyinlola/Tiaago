import { PropsWithChildren } from "react";

import {
  getAllStartups,
  getAllTalents,
  getCurrentUser,
} from "@/app/common/services/profile";
import { useAdminStore } from "./store";
import { navItems } from "./constants/nav";
import Nav from "@/app/common/components/dashboard/Nav";
import ScrollArea from "@/app/common/components/ScrollArea";
import SideNav from "@/app/common/components/dashboard/Nav/SideNav";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

const AdminDashboardLayout = async ({ children }: PropsWithChildren) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { currentUser: user } = await getCurrentUser("staff");
  useAdminStore.setState({ profile: user });
  const as = "staff";
  const noOfUnverifiedTalents = (
    await getAllTalents(1, false).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get talents error (admin dashboard layout): ", error);
      errors.push({
        message: error,
        title: "Error getting talents",
      });
      return {
        count: 0,
      };
    })
  ).count;
  const noOfUnverifiedStartups = (
    await getAllStartups(1, false).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get startups error (admin dashboard layout): ", error);
      errors.push({
        message: error,
        title: "Error getting startups",
      });
      return {
        count: 0,
      };
    })
  ).count;
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='bg-white min-h-[100svh]'>
        <Nav
          as={as}
          // subscribedPlan={user.subscribed_plan}
          firstName={user.first_name || user.email}
          lastName={user.last_name}
          profilePic={user.profile_pic}
          email={user.email}
        />
        <div className='grid grid-cols-1 lg:grid-cols-6 h-[calc(100svh-5rem)]'>
          <div className='border-r border-outline'>
            <div className='drawer lg:drawer-open block'>
              <input
                id='mobile-drawer'
                type='checkbox'
                className='drawer-toggle'
              />
              <div className='drawer-side top-[5rem] z-10 h-[calc(100svh-5rem)]'>
                <label
                  htmlFor='mobile-drawer'
                  aria-label='close sidebar'
                  className='drawer-overlay'
                />
                <SideNav
                  as={as}
                  navItems={navItems}
                  badges={{
                    Talents: noOfUnverifiedTalents,
                    Startups: noOfUnverifiedStartups,
                  }}
                />
              </div>
            </div>
          </div>

          <main className='col-span-5'>
            <ScrollArea className='h-[calc(100svh-5rem)] p-3 md:p-8 pt-8 pb-0 md:pb-0'>
              {children}
            </ScrollArea>
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminDashboardLayout;
