"use client";

import ProfileTab from "./Tabs/ProfileTab";
import { useAdminStore } from "../../store";
import { settingsTabs } from "../constants/tabs";
import SecurityTab from "@/app/common/components/SecurityTab";
import ClientTabs from "@/app/common/components/ClientTabs";
import { Staff } from "@/app/common/types";
import { ProfileInfoFormProps } from "./Tabs/ProfileTab/PersonalInfoForm";

type SettingsContentProps = {
  groupedCountries: ProfileInfoFormProps["groupedCountries"];
  serverProfile: Staff;
};

const SettingsContent = ({ groupedCountries, serverProfile }: SettingsContentProps) => {
  const storeProfile = useAdminStore(s => s.profile);
  const user = storeProfile ?? serverProfile;

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
