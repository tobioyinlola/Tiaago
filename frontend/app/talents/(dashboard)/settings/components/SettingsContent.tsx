"use client";

import {
  AssessmentCert2,
  Talent,
  TalentPortfolioTool,
} from "@/app/common/types";
import ProfileTab from "./Tabs/ProfileTab";
import { settingsTabs } from "../constants";
import NotificationsTab from "./Tabs/NotificationsTab";
import SecurityTab from "@/app/common/components/SecurityTab";
import ClientTabs from "@/app/common/components/ClientTabs";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import type { ProfileInfoFormProps } from "./Tabs/ProfileTab/PersonalInfoForm";

type SettingsContentProps = {
  groupedCountries: ProfileInfoFormProps["groupedCountries"];
  currentUser: Talent;
  tools: TalentPortfolioTool[];
  certificates: AssessmentCert2[];
};

const SettingsContent = ({
  groupedCountries,
  currentUser,
  tools,
  certificates,
}: SettingsContentProps) => {
  const _user = useTalentStore(s => s.profile);
  const user = _user ?? currentUser;

  return (
    <ClientTabs tabs={settingsTabs} defaultTab='profile'>
      {activeTab => {
        switch (activeTab) {
          case "profile":
            return (
              <ProfileTab
                serverProfile={user}
                groupedCountries={groupedCountries}
                resumeDetails={{
                  fileName: user.resume
                    ? user.resume.split("/").pop() || ""
                    : `${user.first_name} ${user.last_name} `.toUpperCase() +
                      "RESUME.pdf",
                  url: user?.resume,
                }}
                tools={tools}
                certificates={certificates}
              />
            );
          case "security":
            return <SecurityTab />;
          case "notifications":
            return <NotificationsTab />;
          default:
            return null;
        }
      }}
    </ClientTabs>
  );
};

export default SettingsContent;
