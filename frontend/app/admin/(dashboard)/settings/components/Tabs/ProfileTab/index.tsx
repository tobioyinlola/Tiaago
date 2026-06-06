import "react-quill-new/dist/quill.snow.css";
import "react-phone-input-2/lib/style.css";

import AdminBioEdit from "./AdminBioEdit";
import ProfilePicEdit from "./ProfilePicEdit";
import PersonalInfoForm, { ProfileInfoFormProps } from "./PersonalInfoForm";

type ProfileTabProps = ProfileInfoFormProps;

const ProfileTab = ({ serverProfile, groupedCountries }: ProfileTabProps) => {
  return (
    <div className='p-5 pb-10 rounded-lg md:border border-gray-200 flex flex-col gap-14'>
      <PersonalInfoForm {...{ serverProfile, groupedCountries }} />
      <ProfilePicEdit serverProfile={serverProfile} />
      <AdminBioEdit serverProfile={serverProfile} />
    </div>
  );
};

export default ProfileTab;
