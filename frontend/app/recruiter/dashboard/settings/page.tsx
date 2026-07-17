import { Metadata } from "next";

import SettingsContent from "./components/SettingsContent";
import { getCountries, getTalentRoles } from "@/app/common/services";
import { getCurrentUser } from "@/app/common/services/profile";
import { getTeamRole } from "@/app/common/services/team";
import AccessDenied from "@/app/common/components/AccessDenied";

export const metadata: Metadata = {
  title: "Settings",
};

const RecruiterSettingsPage = async () => {
  const teamRoleData = await getTeamRole().catch(() => null);
  if (teamRoleData && teamRoleData.role !== "admin") {
    return (
      <AccessDenied
        title="Admin Access Only"
        message="Settings can only be managed by team admins. Contact your admin if you need changes."
      />
    );
  }

  const [fetchedUser, groupedCountries, recruiterRoles] = await Promise.all([
    getCurrentUser("recruiter"),
    getCountries(),
    getTalentRoles(true),
  ]);
  const currentUser = fetchedUser.currentUser;

  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Settings</h1>
        <h4 className='text-gray-900 text-base'>Manage your preferences</h4>
      </div>
      <SettingsContent
        groupedCountries={groupedCountries}
        recruiterRoles={recruiterRoles}
        serverProfile={currentUser}
      />
    </>
  );
};

export default RecruiterSettingsPage;
