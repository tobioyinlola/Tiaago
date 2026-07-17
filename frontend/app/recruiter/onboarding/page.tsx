import "react-phone-input-2/lib/style.css";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import BrandLink from "@/app/common/components/BrandLink";
import { getTalentRoles } from "@/app/common/services";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import { getCompanyOnboarding } from "@/app/common/services/company-onboarding";
import { getTeamRole } from "@/app/common/services/team";
import OnboardingCards from "./components/OnboardingCards";

export const metadata: Metadata = {
  title: "Set Up Your Workspace",
  description: "A few quick questions to tailor Tiaago to your hiring",
};

const RecruiterOnboardingPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const [{ currentUser }, teamRoleData] = await Promise.all([
    getCurrentUser("recruiter"),
    getTeamRole().catch(() => null),
  ]);

  if (teamRoleData?.role) redirect("/recruiter/dashboard");

  const onboarding = await getCompanyOnboarding().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get company onboarding error (recruiter onboarding): ", error);
    errors.push({
      message: error,
      title: "Error loading your onboarding progress",
    });
    return null;
  });

  if (onboarding?.has_completed_onboarding) redirect("/recruiter/dashboard");

  const recruiterRoles = onboarding
    ? await getTalentRoles(true).catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get recruiter roles error (recruiter onboarding): ", error);
        errors.push({
          message: error,
          title: "Error getting roles",
        });
        return [];
      })
    : [];

  return (
    <main className='min-h-[100svh] bg-background flex flex-col'>
      <DisplayErrorMessages errors={errors} />
      <div className='px-4 py-5'>
        <BrandLink containerClassName='block w-fit' />
      </div>
      <div className='flex-1 flex items-start md:items-center justify-center p-4 pb-10'>
        {onboarding ? (
          <OnboardingCards
            onboarding={onboarding}
            firstName={currentUser.first_name}
            recruiterRoles={recruiterRoles.sort((a, b) => {
              if (a.title === "Other") return 1;
              if (b.title === "Other") return -1;
              return 0;
            })}
          />
        ) : (
          <div className='w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 text-center space-y-4'>
            <h1 className='text-xl font-bold'>
              Couldn&apos;t load your onboarding
            </h1>
            <p className='text-sm text-muted-foreground'>
              Something went wrong while loading your progress. Please try
              again, or skip ahead to your dashboard.
            </p>
            <div className='flex items-center justify-center gap-4'>
              <a
                href='/recruiter/onboarding'
                className='btn btn-primary text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                Try again
              </a>
              <a
                href='/recruiter/dashboard'
                className='text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-md px-2 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                Go to dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default RecruiterOnboardingPage;
