import { Metadata } from "next";

import SettingsContent from "./components/SettingsContent";
import { useStartupStore } from "../store";
import { getCountries, getTalentRoles } from "@/app/common/services";
import { getCurrentUser } from "@/app/common/services/profile";
import { getTeamRole } from "@/app/common/services/team";
import AccessDenied from "@/app/common/components/AccessDenied";

export const metadata: Metadata = {
  title: "Settings",
};

const StartupSettingsPage = async () => {
  const teamRoleData = await getTeamRole().catch(() => null);
  if (teamRoleData && teamRoleData.role !== "admin") {
    return (
      <AccessDenied
        title="Admin Access Only"
        message="Settings can only be managed by team admins. Contact your admin if you need changes."
      />
    );
  }

  let currentUser = useStartupStore.getState().profile;
  const [fetchedUser, groupedCountries, startupRoles] = await Promise.all([
    currentUser ? Promise.resolve(null) : getCurrentUser("startup"),
    getCountries(),
    getTalentRoles(true),
  ]);
  if (!currentUser) {
    currentUser = fetchedUser!.currentUser;
    useStartupStore.setState({ profile: currentUser });
  }

  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Settings</h1>
        <h4 className='text-gray-900 text-base'>Manage your preferences</h4>
      </div>
      <SettingsContent
        groupedCountries={groupedCountries}
        startupRoles={startupRoles}
        serverProfile={currentUser}
      />
    </>
  );
};

export default StartupSettingsPage;
