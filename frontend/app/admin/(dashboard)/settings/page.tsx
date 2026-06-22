import { Metadata } from "next";

import SettingsContent from "./components/SettingsContent";
import { useAdminStore } from "../store";
import { getCountries } from "@/app/common/services";
import { getCurrentUser } from "@/app/common/services/profile";

export const metadata: Metadata = {
  title: "Admin Settings",
};

const AdminSettings = async () => {
  let currentUser = useAdminStore.getState().profile;
  const groupedCountries = await getCountries();
  if (!currentUser) {
    currentUser = (await getCurrentUser("staff")).currentUser;
    useAdminStore.setState({ profile: currentUser });
  }

  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Settings</h1>
        <h4 className='text-gray-900 text-base'>Manage your preferences</h4>
      </div>
      <SettingsContent groupedCountries={groupedCountries} />
    </>
  );
};

export default AdminSettings;
