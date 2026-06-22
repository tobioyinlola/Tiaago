import { Metadata } from "next";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import SettingsContent from "./components/SettingsContent";
import { getPortfolio } from "@/app/common/services/talents";
import { getCurrentUser } from "@/app/common/services/profile";
import { getCountries, getTools } from "@/app/common/services";
import { handleServerApiCallError } from "@/app/common/utils";
import SetTalentProfile from "@/app/talents/(dashboard)/components/SetTalentProfile";
import { getAssessmentCerts } from "@/app/common/services/assessment";

export const metadata: Metadata = {
  title: "Settings",
};

const TalentSettings = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const [
    { currentUser },
    groupedCountries,
    portfolioRes,
    tools,
    certificatesRes,
  ] = await Promise.all([
    getCurrentUser("talent"),
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
  const certificates = certificatesRes.results;
  const portfolio = portfolioRes?.data;

  return (
    <>
      <SetTalentProfile profile={currentUser} portfolio={portfolio} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-semibold mb-1 font-switzer'>Settings</h1>
        <h4 className='text-[#636568] text-base'>Manage your preferences</h4>
      </div>
      <SettingsContent
        currentUser={currentUser}
        groupedCountries={groupedCountries}
        certificates={certificates}
        tools={tools}
      />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default TalentSettings;
