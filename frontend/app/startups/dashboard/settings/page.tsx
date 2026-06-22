import Link from "next/link";
import { Metadata } from "next";
import { Fragment } from "react";
import { redirect } from "next/navigation";

import Tab from "./components/Tabs";
import { capitalize, cn } from "@/app/common/utils";
import { settingsTabs } from "./constants";
import { useStartupStore } from "../store";
import { getCountries, getTalentRoles } from "@/app/common/services";
import { getCurrentUser } from "@/app/common/services/profile";
import { getTeamRole } from "@/app/common/services/team";

const getTab = (tab: string = "profile") => {
  if (
    // @ts-ignore
    !settingsTabs.map(t => t.name).includes(tab)
  )
    tab = "profile";
  return tab;
};

export const generateMetadata = async ({ searchParams }: Props): Promise<Metadata> => {
  const resolvedSearchParams = await searchParams;
  let tab = getTab(resolvedSearchParams.tab);
  if (tab.endsWith("s")) tab = tab.slice(0, tab.length - 1);
  return { title: `Startup ${capitalize(tab)} Settings` };
};

type Props = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

const StartupSettingsPage = async ({ searchParams }: Props) => {
  // Route guard: only admins can access settings
  const teamRoleData = await getTeamRole().catch(() => null);
  if (teamRoleData && teamRoleData.role !== "admin") {
    redirect("/startups/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const tab = getTab(resolvedSearchParams.tab);

  // Fetch independent data in parallel
  let currentUser = useStartupStore.getState().profile;
  const [fetchedUser, groupedCountries, startupRoles] = await Promise.all([
    currentUser ? Promise.resolve(null) : getCurrentUser("startup"),
    getCountries(),
    getTalentRoles(true),
  ]);
  if (!currentUser) {
    currentUser = fetchedUser!.currentUser;
    useStartupStore.setState({ profile: currentUser });
  }

  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Settings</h1>
        <h4 className='text-gray-900 text-base'>Manage your preferences</h4>
      </div>
      {/* Tabs */}
      <div role='tablist' className='tabs tabs-bordered pb-8'>
        {settingsTabs.map(({ label, name }, i) => (
          <Fragment key={name}>
            <Link
              href={`?tab=${name}`}
              role='tab'
              className={cn(
                "tab !border-gray-200 text-sm font-medium text-gray-500 !w-max",
                name === tab && "tab-active !border-primary text-primary"
              )}
              aria-label={label}
            >
              <span className='md:hidden capitalize'>{name}</span>
              <span className='max-md:hidden'>{label}</span>
            </Link>
            <Tab
              tab={name}
              groupedCountries={groupedCountries}
              startupRoles={startupRoles}
            />
          </Fragment>
        ))}
      </div>
    </>
  );
};

export default StartupSettingsPage;
