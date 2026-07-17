import "react-quill-new/dist/quill.snow.css";
import "react-phone-input-2/lib/style.css";

import LogoEdit from "./LogoEdit";
import RecruiterBioEdit from "./RecruiterBioEdit";
import RecruiterProfileForm from "./RecruiterProfileForm";
import RecruiterRepForm, { RecruiterRepFormProps } from "./RecruiterRepForm";

type ProfileTabProps = RecruiterRepFormProps;

const ProfileTab = ({ groupedCountries, serverProfile, recruiterRoles }: ProfileTabProps) => {
  return (
    <div className='p-5 pb-10 rounded-lg md:border border-gray-200 flex flex-col gap-14'>
      <RecruiterProfileForm serverProfile={serverProfile} />
      <RecruiterRepForm
        groupedCountries={groupedCountries}
        serverProfile={serverProfile}
        recruiterRoles={recruiterRoles}
      />
      <LogoEdit serverProfile={serverProfile} />
      <RecruiterBioEdit serverProfile={serverProfile} />
    </div>
  );
};

export default ProfileTab;
