import "react-quill-new/dist/quill.snow.css";
import "react-phone-input-2/lib/style.css";

import LogoEdit from "./LogoEdit";
import StartupBioEdit from "./StartupBioEdit";
import StartupProfileForm from "./StartupProfileForm";
import { useStartupStore } from "@/app/startups/dashboard/store";
import StartupRepForm, { StartupRepFormProps } from "./StartupRepForm";

type ProfileTabProps = StartupRepFormProps;

const ProfileTab = ({ groupedCountries, startupRoles }: ProfileTabProps) => {
  const serverProfile = useStartupStore.getState().profile!;
  return (
    <div className='p-5 pb-10 rounded-lg md:border border-gray-200 flex flex-col gap-14'>
      <StartupProfileForm serverProfile={serverProfile} />
      <StartupRepForm
        groupedCountries={groupedCountries}
        serverProfile={serverProfile}
        startupRoles={startupRoles}
      />
      <LogoEdit serverProfile={serverProfile} />
      <StartupBioEdit serverProfile={serverProfile} />
    </div>
  );
};

export default ProfileTab;
