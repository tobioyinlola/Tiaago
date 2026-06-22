import Link from "next/link";
import { Metadata } from "next";
import { Fragment } from "react";
import { capitalize } from "@/app/common/utils";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import Tab from "./components/Tabs";
import { settingsTabs } from "./constants";
import { getPortfolio } from "@/app/common/services/talents";
import { getCurrentUser } from "@/app/common/services/profile";
import { getCountries, getTools } from "@/app/common/services";
import { cn, handleServerApiCallError } from "@/app/common/utils";
import SetTalentProfile from "@/app/talents/(dashboard)/components/SetTalentProfile";
import { getAssessmentCerts } from "@/app/common/services/assessment";

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
  return { title: `Talent ${capitalize(tab)} Settings` };
};

type Props = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

const TalentSettings = async ({ searchParams }: Props) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { currentUser } = await getCurrentUser("talent");
  const [
    resolvedSearchParams,
    groupedCountries,
    portfolioRes,
    tools,
    certificatesRes,
  ] = await Promise.all([
    searchParams,
    getCountries(),
    getPortfolio().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get portfolio error (Talent Settings): ", error);
      errors.push({
        message: error,
        title: "Error getting portfolio",
      });
      return undefined;
    }),
    getTools().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get tools error (Talent Settings): ", error);
      errors.push({
        message: error,
        title: "Error getting tool list",
      });
      return [];
    }),
    getAssessmentCerts().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get certificates error (talent settings): ", error);
      errors.push({
        message: error,
        title: "Error getting certificates",
      });
      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
    }),
  ]);
  const tab = getTab(resolvedSearchParams.tab);
  const certificates = certificatesRes.results;
  const portfolio = portfolioRes?.data;

  return (
    <>
      <SetTalentProfile profile={currentUser} portfolio={portfolio} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-semibold mb-1 font-switzer'>Settings</h1>
        <h4 className='text-[#636568] text-base'>Manage your preferences</h4>
      </div>

      {/* Tabs */}
      <div role='tablist' className='tabs tabs-bordered pb-8'>
        {settingsTabs.map(({ label, name }) => (
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
              currentUser={currentUser}
              groupedCountries={groupedCountries}
              certificates={certificates}
              tools={tools}
            />
          </Fragment>
        ))}
      </div>
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default TalentSettings;
