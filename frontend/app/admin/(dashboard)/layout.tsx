import { PropsWithChildren } from "react";

import {
  getAllStartups,
  getAllTalents,
  getCurrentUser,
} from "@/app/common/services/profile";
import { useAdminStore } from "./store";
import Nav from "@/app/common/components/dashboard/Nav";
import ScrollArea from "@/app/common/components/ScrollArea";
import SideNavV3 from "@/app/common/components/dashboard/Nav/SideNavV3";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import BackendWarmupPing from "@/app/common/components/Layout/BackendWarmupPing";

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
      <BackendWarmupPing />
      <DisplayErrorMessages errors={errors} />
      <div className='bg-white min-h-[100svh]'>
        <Nav
          as={as}
          // subscribedPlan={user.subscribed_plan}
          firstName={user.first_name || user.email}
          lastName={user.last_name}
          profilePic={user.profile_pic}
          email={user.email}
          className='bg-sidebar border-b border-sidebar-border'
        />
        <div className='lg:flex'>
          <div className='max-lg:drawer'>
            <input
              id='mobile-drawer'
              type='checkbox'
              className='drawer-toggle'
            />
            <div className='max-lg:drawer-side top-[5rem] z-10 h-[calc(100svh-5rem)]'>
              <label
                htmlFor='mobile-drawer'
                aria-label='close sidebar'
                className='drawer-overlay'
              />
              <SideNavV3
                as={as}
                badges={{
                  Talents: noOfUnverifiedTalents,
                  Startups: noOfUnverifiedStartups,
                }}
              />
            </div>
          </div>
          <ScrollArea className='h-[calc(100svh-5rem)] max-lg:drawer-content bg-[#F8F9FA] px-3 md:px-8 flex-1'>
            <div className='h-8' />
            {children}
            <div className='h-8' />
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

export default AdminDashboardLayout;
