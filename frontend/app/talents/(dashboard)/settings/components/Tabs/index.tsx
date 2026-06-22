import {
  AssessmentCert2,
  Talent,
  TalentPortfolioTool,
} from "@/app/common/types";
import ProfileTab from "./ProfileTab";
import { settingsTabs } from "../../constants";
import SecurityTab from "@/app/common/components/SecurityTab";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import type { ProfileInfoFormProps } from "./ProfileTab/PersonalInfoForm";

export type TabKey = (typeof settingsTabs)[number]["name"];

type TabProps = {
  tab: TabKey;
  groupedCountries: ProfileInfoFormProps["groupedCountries"];
  currentUser: Talent;
  tools: TalentPortfolioTool[];
  certificates: AssessmentCert2[];
};

const Tab = ({
  tab,
  groupedCountries,
  currentUser,
  tools,
  certificates,
}: TabProps) => {
  const _user = useTalentStore.getState().profile;
  const user = _user ?? currentUser;
  const tabMap: Record<TabKey, JSX.Element> = {
    profile: (
      <ProfileTab
        serverProfile={user}
        groupedCountries={groupedCountries}
        resumeDetails={{
          fileName: user.resume
            ? user.resume.split("/").pop() || ""
            : `${user.first_name} ${user.last_name} `.toUpperCase() +
              "RESUME.pdf",
          // dateAdded: format(new Date(), "MMMM dd, yyyy"),
          url: user?.resume,
        }}
        tools={tools}
        certificates={certificates}
      />
    ),
    security: <SecurityTab />,
  };
  return (
    <div
      role='tabpanel'
      className='tab-content py-8 border-0 border-t-2 border-gray-200 w-full md:max-w-[calc(100svw_-_4rem)] lg:max-w-[calc((100svw*(5_/_6))-_12rem)]'
    >
      {tabMap[tab]}
    </div>
  );
};

export default Tab;
