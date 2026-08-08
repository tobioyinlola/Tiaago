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
import FreeCreditsBanner from "./components/FreeCreditsBanner";
import { getCompanyOnboarding } from "@/app/common/services/company-onboarding";
import { getWalletBalance } from "@/app/common/services/subscription";
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
  const [teamRoleData, onboarding, unreadMessageCounts, walletBalance] = await Promise.all([
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
    getWalletBalance().catch(e => {
      console.log("Get wallet balance error (recruiter dashboard layout): ", e?.message);
      return null;
    }),
  ]);
  const teamRole = teamRoleData?.role ?? null;
  // Every company rep -- including the founding/solo recruiter -- gets a
  // CompanyTeamMember row (backend/create_user/views.py auto-creates one
  // with role=admin the first time this is requested), so `!!teamRole` is
  // true for everyone and can't be used to mean "is an invited team member".
  // Billing/onboarding are admin-only actions (see the billing page's own
  // "Billing can only be managed by team admins" gate), so admin-only
  // banners below are gated on the role itself instead.
  const isAdmin = teamRole === "admin";
  // Google signups never fill in a signup form -- company name/country only
  // ever get collected here, so onboarding isn't skippable for them (unlike
  // email signups, who already gave this info at signup). Ignoring
  // has_skipped_onboarding for a Google user also retroactively catches
  // anyone who skipped before this was enforced, next time they load the
  // dashboard.
  const isGoogleSignup = recruiter.auth_provider === "google";
  if (
    isAdmin &&
    onboarding &&
    !onboarding.has_completed_onboarding &&
    (!onboarding.has_skipped_onboarding || isGoogleSignup)
  )
    redirect("/recruiter/onboarding");
  const showFinishOnboardingBanner =
    isAdmin && !!onboarding && !onboarding.has_completed_onboarding;
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
          {isAdmin && (
            <FreeCreditsBanner
              freeCreditsRemaining={walletBalance?.free_credits_remaining ?? null}
              freeTierLimit={walletBalance?.pricing?.free_tier_limit ?? 20}
              walletBalance={walletBalance?.balance ?? null}
              lowBalanceThreshold={
                walletBalance?.low_balance_threshold ?? walletBalance?.pricing?.minimum_topup ?? null
              }
            />
          )}
          {children}
          <div className='h-8' />
        </ScrollArea>
      </div>
    </div>
  );
};

export default RecruiterDashboardLayout;
