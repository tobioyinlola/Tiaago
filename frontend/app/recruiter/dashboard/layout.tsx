import { PropsWithChildren } from "react";
import { redirect } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import Nav from "@/app/common/components/dashboard/Nav";
import { IS_CHAT_HIDDEN } from "@/app/common/constants";
import ScrollArea from "@/app/common/components/ScrollArea";
import { handleServerApiCallError } from "@/app/common/utils";
import SetRecruiterProfile from "./components/SetRecruiterProfile";
import { getCurrentUser } from "@/app/common/services/profile";
import { getUnreadMessageCounts } from "@/app/common/services/chat";
import { getTeamRole } from "@/app/common/services/team";
import SideNavV3 from "@/app/common/components/dashboard/Nav/SideNavV3";
import SetUserProfile from "@/app/common/components/Layout/SetUserProfile";
import FinishOnboardingBanner from "./components/FinishOnboardingBanner";
import { getCompanyOnboarding } from "@/app/common/services/company-onboarding";
import BackendWarmupPing from "@/app/common/components/Layout/BackendWarmupPing";
import MaintenancePage from "@/app/common/components/MaintenancePage";

const RecruiterDashboardLayout = async ({ children }: PropsWithChildren) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const result = await getCurrentUser("recruiter");
  if (result.backendDown) return <MaintenancePage />;
  const { currentUser: recruiter } = result;
  // if (!user.is_verified)
  //   return redirect(`/verify-email?email=${user.email}&as=talent`);

  const splitCompanyName = (recruiter.company_name ?? "").split(" ");
  const [teamRoleData, onboarding, unreadMessageCounts] = await Promise.all([
    getTeamRole().catch(e => {
      console.log("Get team role error (recruiter dashboard layout): ", e?.message);
      return null;
    }),
    getCompanyOnboarding().catch(e => {
      console.log(
        "Get company onboarding error (recruiter dashboard layout): ",
        e?.message
      );
      return null;
    }),
    !IS_CHAT_HIDDEN
      ? getUnreadMessageCounts().catch(async e => {
          const error = await handleServerApiCallError(e);
          console.log("Get unread message counts error (recruiter dashboard layout): ", error);
          errors.push({ message: error, title: "Error getting unread message counts" });
          return [];
        })
      : ([] as any[]),
  ]);
  const teamRole = teamRoleData?.role ?? null;
  const isTeamMember = !!teamRoleData?.role;
  // Google signups never fill in a signup form -- company name/country only
  // ever get collected here, so onboarding isn't skippable for them (unlike
  // email signups, who already gave this info at signup). Ignoring
  // has_skipped_onboarding for a Google user also retroactively catches
  // anyone who skipped before this was enforced, next time they load the
  // dashboard.
  const isGoogleSignup = recruiter.auth_provider === "google";
  if (
    !isTeamMember &&
    onboarding &&
    !onboarding.has_completed_onboarding &&
    (!onboarding.has_skipped_onboarding || isGoogleSignup)
  )
    redirect("/recruiter/onboarding");
  const showFinishOnboardingBanner =
    !isTeamMember && !!onboarding && !onboarding.has_completed_onboarding;
  const unreadMessageCount = unreadMessageCounts.reduce(
    (acc: number, curr: any) => acc + curr.unread_messages,
    0
  );
  return (
    <div className='bg-white min-h-[100svh]'>
      <BackendWarmupPing />
      <DisplayErrorMessages errors={errors} />
      <SetRecruiterProfile profile={recruiter} />
      <SetUserProfile profile={recruiter} removeAuthCookies={false} />
      <Nav
        as='recruiter'
        // subscribedPlan={recruiter.subscribed_plan}
        firstName={splitCompanyName[0]}
        lastName={splitCompanyName[1] || ""}
        profilePic={recruiter.profile_pic}
        email={recruiter.email}
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
              as='recruiter'
              badges={{
                Inbox: unreadMessageCount,
              }}
              teamRole={teamRole}
            />
          </div>
        </div>
        <ScrollArea
          id='recruiter-dashboard-scroll-area'
          className='h-[calc(100svh-5rem)] max-lg:drawer-content bg-[#F8F9FA] px-3 md:px-8 flex-1'
        >
          <div className='h-8' />
          {showFinishOnboardingBanner && <FinishOnboardingBanner />}
          {children}
          <div className='h-8' />
        </ScrollArea>
      </div>
    </div>
  );
};

export default RecruiterDashboardLayout;
