import "react-quill-new/dist/quill.snow.css";
import "react-phone-input-2/lib/style.css";

import Tools from "./Tools";
import BioEdit from "./BioEdit";
import PortfolioEdit from "./PortfolioEdit";
import Certifications from "./Certifications";
import ProfilePicEdit from "./ProfilePicEdit";
import TalentProjects from "./TalentProjects";
import TalentEducation from "./TalentEducation";
import TalentWorkExperiences from "./TalentWorkExperiences";
import TalentPaymentAccounts from "./TalentPaymentAccounts";
import TalentResume, { type TalentResumeProps } from "./TalentResume";
import { AssessmentCert2, TalentPortfolioTool } from "@/app/common/types";
import PersonalInfoForm, { ProfileInfoFormProps } from "./PersonalInfoForm";

type ProfileTabProps = ProfileInfoFormProps & {
  resumeDetails: TalentResumeProps;
  tools: TalentPortfolioTool[];
  certificates: AssessmentCert2[];
};

const ProfileTab = ({
  serverProfile,
  groupedCountries,
  resumeDetails,
  tools,
  certificates,
}: ProfileTabProps) => {
  return (
    <div className='space-y-10'>
      <div className='p-5 pb-10 rounded-lg md:border border-gray-200 bg-white dashboard-content-constraint'>
        <PersonalInfoForm {...{ serverProfile, groupedCountries }} />
      </div>
      <div className='p-5 pb-10 rounded-lg md:border border-gray-200 bg-white grid lg:grid-cols-2 gap-8 lg:gap-6 lg:justify-between dashboard-content-constraint'>
        <ProfilePicEdit serverProfile={serverProfile} />
        <BioEdit serverProfile={serverProfile} />
      </div>
      <div className='p-5 pb-10 rounded-lg md:border border-gray-200 bg-white grid lg:grid-cols-2 gap-8 lg:gap-6 lg:justify-between dashboard-content-constraint'>
        <PortfolioEdit serverProfile={serverProfile} />
        <TalentResume {...resumeDetails} refresh />
      </div>
      <div className='p-5 pb-10 rounded-lg md:border border-gray-200 bg-white grid lg:grid-cols-2 gap-8 lg:gap-6 lg:justify-between dashboard-content-constraint'>
        <TalentWorkExperiences />
        <TalentEducation />
      </div>
      <div className='p-5 pb-10 rounded-lg md:border border-gray-200 bg-white grid lg:grid-cols-2 gap-8 lg:gap-6 lg:justify-between dashboard-content-constraint'>
        <TalentProjects />
        <Tools tools={tools} />
      </div>
      <div className='p-5 pb-10 rounded-lg md:border border-gray-200 bg-white grid lg:grid-cols-2 gap-8 lg:gap-6 lg:justify-between dashboard-content-constraint'>
        <Certifications certifications={certificates} />
        <TalentPaymentAccounts serverProfile={serverProfile} />
      </div>
    </div>
  );
};

export default ProfileTab;
