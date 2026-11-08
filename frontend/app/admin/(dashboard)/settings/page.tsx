import { Metadata } from "next";

import SettingsContent from "./components/SettingsContent";
import { getCountries } from "@/app/common/services";
import { getCurrentUser } from "@/app/common/services/profile";

export const metadata: Metadata = {
  title: "Admin Settings",
};

const AdminSettings = async () => {
  const [{ currentUser }, groupedCountries] = await Promise.all([
    getCurrentUser("staff"),
    getCountries(),
  ]);

  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Settings</h1>
        <h4 className='text-gray-900 text-base'>Manage your preferences</h4>
      </div>
      <SettingsContent groupedCountries={groupedCountries} serverProfile={currentUser} />
    </>
  );
};

export default AdminSettings;
