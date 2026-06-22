import TeamMembersTab from "./Team";
import ProfileTab from "./ProfileTab";
import EmailIntegrationTab from "./EmailIntegrationTab";
import { settingsTabs } from "../../constants";
import { useStartupStore } from "../../../store";
import SecurityTab from "@/app/common/components/SecurityTab";
import { TalentRole as StartupRole } from "@/app/common/types";
import type { StartupRepFormProps } from "./ProfileTab/StartupRepForm";
// import SubscriptionTab from "@/app/common/components/dashboard/subscription/SubscriptionTab";

export type TabKey = (typeof settingsTabs)[number]["name"];

type TabProps = {
  tab: TabKey;
  groupedCountries: StartupRepFormProps["groupedCountries"];
  startupRoles: StartupRole[];
};

const Tab = ({ tab, groupedCountries, startupRoles }: TabProps) => {
  const profile = useStartupStore.getState().profile!;
  const tabMap: Record<TabKey, JSX.Element> = {
    profile: (
      <ProfileTab
        serverProfile={profile}
        groupedCountries={groupedCountries}
        startupRoles={startupRoles}
      />
    ),
    security: <SecurityTab />,
    // subscription: (
    //   <SubscriptionTab
    //     subscribedPlan={profile.subscribed_plan}
    //     userType={profile.user_type}
    //     email={profile.email}
    //   />
    // ),
    email: <EmailIntegrationTab />,
    team: <TeamMembersTab />,
  };
  return (
    <div
      role='tabpanel'
      className='tab-content py-8 md:px-5 lg:px-8 pr-0 border-0 border-t-2 border-gray-200 w-full max-w-[90svw]'
    >
      {tabMap[tab]}
    </div>
  );
};

export default Tab;
