"use client";

import ProfileTab from "./Tabs/ProfileTab";
import { useAdminStore } from "../../store";
import { settingsTabs } from "../constants/tabs";
import SecurityTab from "@/app/common/components/SecurityTab";
import ClientTabs from "@/app/common/components/ClientTabs";
import { ProfileInfoFormProps } from "./Tabs/ProfileTab/PersonalInfoForm";

type SettingsContentProps = {
  groupedCountries: ProfileInfoFormProps["groupedCountries"];
};

const SettingsContent = ({ groupedCountries }: SettingsContentProps) => {
  const user = useAdminStore(s => s.profile)!;

  return (
    <ClientTabs tabs={settingsTabs} defaultTab='profile'>
      {activeTab => {
        switch (activeTab) {
          case "profile":
            return (
              <ProfileTab
                serverProfile={user}
                groupedCountries={groupedCountries}
              />
            );
          case "security":
            return <SecurityTab />;
          default:
            return null;
        }
      }}
    </ClientTabs>
  );
};

export default SettingsContent;
