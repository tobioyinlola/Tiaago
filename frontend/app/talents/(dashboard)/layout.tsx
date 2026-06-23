import { PropsWithChildren } from "react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import Nav from "@/app/common/components/dashboard/Nav";
import ScrollArea from "@/app/common/components/ScrollArea";
import SetTalentProfile from "./components/SetTalentProfile";
import { getSchedule } from "@/app/common/services/schedule";
import { getTalenProfileStatus } from "@/app/common/services";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import { getUnreadMessageCounts } from "@/app/common/services/chat";
import SideNavV3 from "@/app/common/components/dashboard/Nav/SideNavV3";
import SetUserProfile from "@/app/common/components/Layout/SetUserProfile";
import { VerifiedBadgeIndicator } from "@/app/common/components/UserAvatar";
import HideOnPathnames from "@/app/common/components/Layout/HideOnPathnames";
import BackendWarmupPing from "@/app/common/components/Layout/BackendWarmupPing";
import MaintenancePage from "@/app/common/components/MaintenancePage";
import { IS_CHAT_HIDDEN } from "@/app/common/constants";

const TalentDashboardLayout = async ({ children }: PropsWithChildren) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const result = await getCurrentUser("talent");
  if (result.backendDown) return <MaintenancePage />;
  const { currentUser: user, removeAuthCookies } = result;
  // if (!user.is_verified)
  //   return redirect(`/verify-email?email=${user.email}&as=talent`);
  const profileStatus = await getTalenProfileStatus().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get talent profile status error (talent dashboard layout): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting talent profile status",
    });
    return {};
  });
  const isProfileComplete = Object.values(profileStatus).every(Boolean);

  const [schedule, unreadMessageCounts] = isProfileComplete
    ? await Promise.all([
        getSchedule().catch(async e => {
          const error = await handleServerApiCallError(e);
          console.log("Get schedule error (talent dashboard layout): ", error);
          errors.push({ message: error, title: "Error getting schedule" });
          return [];
        }),
        !IS_CHAT_HIDDEN
          ? getUnreadMessageCounts().catch(async e => {
              const error = await handleServerApiCallError(e);
              console.log("Get unread message counts error (talent dashboard layout): ", error);
              errors.push({ message: error, title: "Error getting unread message counts" });
              return [];
            })
          : ([] as any[]),
      ])
    : [[], []];
  const noOfScheduleRequests = schedule.filter(
    (meeting: any) => typeof meeting.accepted !== "boolean"
  ).length;
  const unreadMessageCount = unreadMessageCounts.reduce(
    (acc: number, curr: any) => acc + curr.unread_messages,
    0
  );
  return (
    <div className='bg-white min-h-[100svh]'>
      <BackendWarmupPing />
      <DisplayErrorMessages errors={errors} />
      <SetTalentProfile profile={user} isVerified={isProfileComplete} />
      <SetUserProfile profile={user} removeAuthCookies={removeAuthCookies} />
      <Nav
        // subscribedPlan={user.subscribed_plan}
        firstName={user.first_name}
        lastName={user.last_name}
        profilePic={user.profile_pic}
        indicator={
          user.has_passed_assessment ? (
            <VerifiedBadgeIndicator size={18} />
          ) : undefined
        }
        email={user.email}
        className='bg-sidebar border-b border-sidebar-border'
      />
      <div className='lg:flex'>
        <div className='max-lg:drawer'>
          <input id='mobile-drawer' type='checkbox' className='drawer-toggle' />
          <div className='max-lg:drawer-side top-[5rem] z-10 h-[calc(100svh-5rem)]'>
            <label
              htmlFor='mobile-drawer'
              aria-label='close sidebar'
              className='drawer-overlay'
            />
            <SideNavV3
              as='talent'
              badges={{
                Schedule: noOfScheduleRequests,
                Inbox: unreadMessageCount,
              }}
              isProfileComplete={isProfileComplete}
            />
          </div>
        </div>
        <ScrollArea className='h-[calc(100svh-5rem)] max-lg:drawer-content bg-[#F8F9FA] px-3 md:px-8 flex-1'>
          <div className='h-8' />
          {children}
          <HideOnPathnames
            pathnames={["/talents/messages", "/startups/dashboard/messages"]}
            exact={false}
          >
            <div className='h-8' />
          </HideOnPathnames>
        </ScrollArea>
      </div>

      {/* <div className='grid grid-cols-1 lg:grid-cols-6 h-[calc(100svh-5rem)]'>
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
                navItems={navItems}
                as='talent'
                badges={{ Schedule: noOfScheduleRequests }}
                className='bg-[#FDFDFD]'
              />
            </div>
          </div>
        </div>

        <main className='col-span-5'>
          <ScrollArea className='h-[calc(100svh-5rem)] p-3 md:p-8 pt-8 pb-0 md:pb-0 bg-[#F8F9FA]'>
            {children}
            <div className='h-8' />
          </ScrollArea>
        </main>
      </div> */}
    </div>
  );
};

export default TalentDashboardLayout;
