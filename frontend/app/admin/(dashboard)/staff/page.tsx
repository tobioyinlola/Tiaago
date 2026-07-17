import { redirect } from "next/navigation";

import { getCurrentUser } from "@/app/common/services/profile";
import { getStaffMembers, getStaffRoles } from "@/app/common/services/staff";
import ClientTabs from "@/app/common/components/ClientTabs";
import TeamMembersTab from "./_components/TeamMembersTab";
import RolesTab from "./_components/RolesTab";

export const metadata = {
  title: "Staff",
};

const STAFF_TABS = [
  { name: "members", label: "Team Members" },
  { name: "roles", label: "Roles" },
] as const;

const StaffPage = async () => {
  const { currentUser } = await getCurrentUser("staff");
  const canView = currentUser.is_super_admin || currentUser.permissions.includes("staff.view");
  if (!canView) {
    redirect("/admin/unauthorised?permission=staff.view");
  }

  const [membersRes, roles] = await Promise.all([
    getStaffMembers(1),
    getStaffRoles(),
  ]);

  return (
    <>
      <div className='border-b w-full border-border pb-1 mb-6'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Staff</h1>
        <h4 className='text-foreground text-sm md:text-base'>
          Manage admin team members and the roles that control what they can access.
        </h4>
      </div>

      <ClientTabs tabs={STAFF_TABS} defaultTab='members'>
        {activeTab => {
          switch (activeTab) {
            case "members":
              return <TeamMembersTab initialMembers={membersRes} roles={roles} />;
            case "roles":
              return <RolesTab initialRoles={roles} />;
            default:
              return null;
          }
        }}
      </ClientTabs>
    </>
  );
};

export default StaffPage;
