"use client";

import ProfileTab from "./ProfileTab";
import { useAdminStore } from "../../../store";
import { settingsTabs } from "../../constants/tabs";
import SecurityTab from "@/app/common/components/SecurityTab";
import { ProfileInfoFormProps } from "./ProfileTab/PersonalInfoForm";
import EmailIntegrationTab from "./EmailIntegrationTab";
import { Staff } from "@/app/common/types";

export type TabKey = (typeof settingsTabs)[number]["name"];

type TabProps = {
  tab: TabKey;
  groupedCountries: ProfileInfoFormProps["groupedCountries"];
  serverProfile: Staff;
};

const Tab = ({ tab, groupedCountries, serverProfile }: TabProps) => {
  const user = useAdminStore(state => state.profile) ?? serverProfile;
  const tabMap: Record<TabKey, JSX.Element> = {
    profile: (
      <ProfileTab serverProfile={user} groupedCountries={groupedCountries} />
    ),
    security: <SecurityTab />,
    email: <EmailIntegrationTab />,
  };
  return (
    <div
      role='tabpanel'
      className='tab-content py-8 pr-0 border-0 border-t-2 border-gray-200 w-full max-w-[1500px] mr-auto'
    >
      {tabMap[tab]}
    </div>
  );
};

export default Tab;
