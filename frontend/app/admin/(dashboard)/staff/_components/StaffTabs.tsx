"use client";

import ClientTabs from "@/app/common/components/ClientTabs";
import TeamMembersTab from "./TeamMembersTab";
import RolesTab from "./RolesTab";
import { getStaffMembers, getStaffRoles } from "@/app/common/services/staff";

const STAFF_TABS = [
  { name: "members", label: "Team Members" },
  { name: "roles", label: "Roles" },
] as const;

const StaffTabs = ({
  membersRes,
  roles,
}: {
  membersRes: Awaited<ReturnType<typeof getStaffMembers>>;
  roles: Awaited<ReturnType<typeof getStaffRoles>>;
}) => (
  <ClientTabs tabs={STAFF_TABS} defaultTab="members">
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
);

export default StaffTabs;
