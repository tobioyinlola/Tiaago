import { redirect } from "next/navigation";

import { getCurrentUser } from "@/app/common/services/profile";
import { getStaffMembers, getStaffRoles } from "@/app/common/services/staff";
import MaintenancePage from "@/app/common/components/MaintenancePage";
import StaffTabs from "./_components/StaffTabs";

export const metadata = {
  title: "Staff",
};

const StaffPage = async () => {
  // This page navigates independently of the admin layout's own
  // getCurrentUser("staff") call (a soft client-side nav only re-fetches the
  // page segment, not the already-mounted layout), so a transient backend
  // hiccup here isn't caught by the layout's guard -- must handle it here too.
  const result = await getCurrentUser("staff");
  if (result.backendDown) return <MaintenancePage />;
  const { currentUser } = result;
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

      <StaffTabs membersRes={membersRes} roles={roles} />
    </>
  );
};

export default StaffPage;
