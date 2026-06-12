import { PropsWithChildren } from "react";
import { redirect } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import Nav from "@/app/common/components/dashboard/Nav";
import { IS_CHAT_HIDDEN } from "@/app/common/constants";
import ScrollArea from "@/app/common/components/ScrollArea";
import { handleServerApiCallError } from "@/app/common/utils";
import SetStartupProfile from "./components/SetStartupProfile";
import { getCurrentUser } from "@/app/common/services/profile";
import { getUnreadMessageCounts } from "@/app/common/services/chat";
import SideNavV3 from "@/app/common/components/dashboard/Nav/SideNavV3";
import SetUserProfile from "@/app/common/components/Layout/SetUserProfile";
import { getCompanyOnboarding } from "@/app/common/services/company-onboarding";

const StartupDashboardLayout = async ({ children }: PropsWithChildren) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { currentUser: startup } = await getCurrentUser("startup");
  // if (!user.is_verified)
  //   return redirect(`/verify-email?email=${user.email}&as=talent`);

  // New signups must finish (or skip) the onboarding cards before the
  // dashboard; fail open if the status call errors so a backend hiccup
  // never locks users out.
  const onboarding = await getCompanyOnboarding().catch(e => {
    console.log(
      "Get company onboarding error (startup dashboard layout): ",
      e?.message
    );
    return null;
  });
  if (onboarding && !onboarding.has_completed_onboarding)
    redirect("/startups/onboarding");
  const splitCompanyName = startup.company_name.split(" ");
  const unreadMessageCounts = !IS_CHAT_HIDDEN
    ? await getUnreadMessageCounts().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log(
          "Get unread message counts error (startup dashboard layout): ",
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
      <SetStartupProfile profile={startup} />
      <SetUserProfile profile={startup} removeAuthCookies={false} />
      <Nav
        as='startup'
        // subscribedPlan={startup.subscribed_plan}
        firstName={splitCompanyName[0]}
        lastName={splitCompanyName[1] || ""}
        profilePic={startup.profile_pic}
        email={startup.email}
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
              as='startup'
              badges={{
                Inbox: unreadMessageCount,
              }}
            />
          </div>
        </div>
        <ScrollArea
          id='startup-dashboard-scroll-area'
          className='h-[calc(100svh-5rem)] max-lg:drawer-content bg-[#F8F9FA] px-3 md:px-8 flex-1'
        >
          <div className='h-8' />
          {children}
          <div className='h-8' />
        </ScrollArea>
      </div>
    </div>
  );
};

export default StartupDashboardLayout;
