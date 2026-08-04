import { PropsWithChildren } from "react";

import {
  getAllRecruiters,
  getAllTalents,
  getCurrentUser,
} from "@/app/common/services/profile";
import { getAdminTicketsUnreadCount } from "@/app/common/services/support";
import { useAdminStore } from "./store";
import Nav from "@/app/common/components/dashboard/Nav";
import ScrollArea from "@/app/common/components/ScrollArea";
import SideNavV3 from "@/app/common/components/dashboard/Nav/SideNavV3";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import BackendWarmupPing from "@/app/common/components/Layout/BackendWarmupPing";
import MaintenancePage from "@/app/common/components/MaintenancePage";
import SetAdminProfile from "./components/SetAdminProfile";

const AdminDashboardLayout = async ({ children }: PropsWithChildren) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const result = await getCurrentUser("staff");
  if (result.backendDown) return <MaintenancePage />;
  const { currentUser: user } = result;
  useAdminStore.setState({ profile: user });
  const as = "staff";
  const [talentsRes, recruitersRes, unreadTicketsCount] = await Promise.all([
    getAllTalents(1, false).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get talents error (admin dashboard layout): ", error);
      errors.push({ message: error, title: "Error getting talents" });
      return { count: 0 };
    }),
    getAllRecruiters(1, false).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get recruiters error (admin dashboard layout): ", error);
      errors.push({ message: error, title: "Error getting recruiters" });
      return { count: 0 };
    }),
    // Not gated with an error banner like the other two -- staff without
    // support.view (the same permission the Communication nav item itself
    // requires) just see no badge instead of an error, since they can't
    // reach the ticket list anyway.
    getAdminTicketsUnreadCount().catch(() => 0),
  ]);
  const noOfUnverifiedTalents = talentsRes.count;
  const noOfUnverifiedRecruiters = recruitersRes.count;
  return (
    <>
      <BackendWarmupPing />
      <SetAdminProfile profile={user} />
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
                  Recruiters: noOfUnverifiedRecruiters,
                  Support: unreadTicketsCount,
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
