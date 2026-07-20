import TeamMembersTab from "./Team";
import ProfileTab from "./ProfileTab";
import EmailIntegrationTab from "./EmailIntegrationTab";
import { settingsTabs } from "../../constants";
import { useRecruiterStore } from "../../../store";
import SecurityTab from "@/app/common/components/SecurityTab";
import { TalentRole as RecruiterRole } from "@/app/common/types";
import type { RecruiterRepFormProps } from "./ProfileTab/RecruiterRepForm";

export type TabKey = (typeof settingsTabs)[number]["name"];

type TabProps = {
  tab: TabKey;
  groupedCountries: RecruiterRepFormProps["groupedCountries"];
  recruiterRoles: RecruiterRole[];
};

const Tab = ({ tab, groupedCountries, recruiterRoles }: TabProps) => {
  const profile = useRecruiterStore.getState().profile!;
  const tabMap: Record<TabKey, JSX.Element> = {
    profile: (
      <ProfileTab
        serverProfile={profile}
        groupedCountries={groupedCountries}
        recruiterRoles={recruiterRoles}
      />
    ),
    security: <SecurityTab />,
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
