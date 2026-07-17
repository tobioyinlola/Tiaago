"use client";

import { settingsTabs } from "../constants";
import ProfileTab from "./Tabs/ProfileTab";
import TeamMembersTab from "./Tabs/Team";
import EmailIntegrationTab from "./Tabs/EmailIntegrationTab";
import SecurityTab from "@/app/common/components/SecurityTab";
import ClientTabs from "@/app/common/components/ClientTabs";
import { useRecruiterStore } from "../../store";
import { Recruiter, TalentRole as RecruiterRole } from "@/app/common/types";
import type { RecruiterRepFormProps } from "./Tabs/ProfileTab/RecruiterRepForm";

type SettingsContentProps = {
  groupedCountries: RecruiterRepFormProps["groupedCountries"];
  recruiterRoles: RecruiterRole[];
  serverProfile: Recruiter;
};

const SettingsContent = ({
  groupedCountries,
  recruiterRoles,
  serverProfile,
}: SettingsContentProps) => {
  const storeProfile = useRecruiterStore(s => s.profile);
  const profile = storeProfile ?? serverProfile;

  return (
    <ClientTabs tabs={settingsTabs} defaultTab='profile'>
      {activeTab => {
        switch (activeTab) {
          case "profile":
            return (
              <ProfileTab
                serverProfile={profile}
                groupedCountries={groupedCountries}
                recruiterRoles={recruiterRoles}
              />
            );
          case "security":
            return <SecurityTab />;
          case "email":
            return <EmailIntegrationTab />;
          case "team":
            return <TeamMembersTab />;
          default:
            return null;
        }
      }}
    </ClientTabs>
  );
};

export default SettingsContent;
