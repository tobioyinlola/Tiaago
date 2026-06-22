"use client";

import { settingsTabs } from "../constants";
import ProfileTab from "./Tabs/ProfileTab";
import TeamMembersTab from "./Tabs/Team";
import EmailIntegrationTab from "./Tabs/EmailIntegrationTab";
import NotificationsTab from "./Tabs/NotificationsTab";
import SecurityTab from "@/app/common/components/SecurityTab";
import ClientTabs from "@/app/common/components/ClientTabs";
import { useStartupStore } from "../../store";
import { TalentRole as StartupRole } from "@/app/common/types";
import type { StartupRepFormProps } from "./Tabs/ProfileTab/StartupRepForm";

type SettingsContentProps = {
  groupedCountries: StartupRepFormProps["groupedCountries"];
  startupRoles: StartupRole[];
};

const SettingsContent = ({
  groupedCountries,
  startupRoles,
}: SettingsContentProps) => {
  const profile = useStartupStore(s => s.profile)!;

  return (
    <ClientTabs tabs={settingsTabs} defaultTab='profile'>
      {activeTab => {
        switch (activeTab) {
          case "profile":
            return (
              <ProfileTab
                serverProfile={profile}
                groupedCountries={groupedCountries}
                startupRoles={startupRoles}
              />
            );
          case "security":
            return <SecurityTab />;
          case "email":
            return <EmailIntegrationTab />;
          case "notifications":
            return <NotificationsTab />;
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
