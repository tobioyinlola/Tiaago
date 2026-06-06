import { PropsWithChildren } from "react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import Nav from "@/app/common/components/dashboard/Nav";
import ScrollArea from "@/app/common/components/ScrollArea";
import { getSchedule } from "@/app/common/services/schedule";
import { getTalenProfileStatus } from "@/app/common/services";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import { getUnreadMessageCounts } from "@/app/common/services/chat";
import SideNavV3 from "@/app/common/components/dashboard/Nav/SideNavV3";
import SetUserProfile from "@/app/common/components/Layout/SetUserProfile";
import { VerifiedBadgeIndicator } from "@/app/common/components/UserAvatar";
import SetTalentProfile from "@/app/talents/(dashboard)/components/SetTalentProfile";

const AssessmentDashboardLayout = async ({ children }: PropsWithChildren) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { currentUser: user, removeAuthCookies } = await getCurrentUser(
    "talent"
  );
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

  const schedule = isProfileComplete
    ? await getSchedule().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get schedule error (talent dashboard layout): ", error);
        errors.push({
          message: error,
          title: "Error getting schedule",
        });
        return [];
      })
    : [];
  const noOfScheduleRequests = schedule.filter(
    meeting => typeof meeting.accepted !== "boolean"
  ).length;
  const unreadMessageCounts = isProfileComplete
    ? await getUnreadMessageCounts().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log(
          "Get unread message counts error (talent dashboard layout): ",
          error
        );
        errors.push({
          message: error,
          title: "Error getting unread message counts",
        });
        return [];
      })
    : [];
  const unreadMessageCount = unreadMessageCounts.reduce(
    (acc, curr) => acc + curr.unread_messages,
    0
  );
  return (
    <div className='bg-white min-h-[100svh]'>
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
        className='bg-[#FDFDFD] border-[#F0F2F5]'
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
          <div className='h-8' />
        </ScrollArea>
      </div>
    </div>
  );
};

export default AssessmentDashboardLayout;
