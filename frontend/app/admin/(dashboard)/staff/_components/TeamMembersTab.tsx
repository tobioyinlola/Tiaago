"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNowStrict, format } from "date-fns";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";

import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import PermissionGuard from "../../components/PermissionGuard";
import {
  StaffMember,
  StaffRoleDetail,
  activateStaffMember,
  deactivateStaffMember,
  getStaffMembers,
} from "@/app/common/services/staff";
import StaffRoleBadge from "./StaffRoleBadge";
import StaffStatusBadge from "./StaffStatusBadge";
import InviteStaffDialog from "./InviteStaffDialog";
import ChangeStaffRoleDialog from "./ChangeStaffRoleDialog";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const TeamMembersTab = ({
  initialMembers,
  roles,
}: {
  initialMembers: Paginated<StaffMember>;
  roles: StaffRoleDetail[];
}) => {
  const [members, setMembers] = useState(initialMembers.results);
  const [count, setCount] = useState(initialMembers.count);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(!!initialMembers.next);
  const [hasPrevious, setHasPrevious] = useState(!!initialMembers.previous);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<StaffMember | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadPage = (targetPage: number) => {
    startTransition(async () => {
      const res = await getStaffMembers(targetPage);
      setMembers(res.results);
      setCount(res.count);
      setHasNext(!!res.next);
      setHasPrevious(!!res.previous);
      setPage(targetPage);
    });
  };

  // Reloads the current page rather than always resetting to page 1, so an
  // action taken on (e.g.) page 3 doesn't lose the admin's place.
  const refresh = () => loadPage(page);

  const handleDeactivate = (member: StaffMember) => {
    startTransition(async () => {
      const result = await deactivateStaffMember(member.id);
      if (!result.success) {
        toast.error("Could not deactivate staff member", { description: result.error });
        return;
      }
      toast.success(`${member.email} deactivated`);
      refresh();
    });
  };

  const handleActivate = (member: StaffMember) => {
    startTransition(async () => {
      const result = await activateStaffMember(member.id);
      if (!result.success) {
        toast.error("Could not activate staff member", { description: result.error });
        return;
      }
      toast.success(`${member.email} activated`);
      refresh();
    });
  };

  const columns: DataTableColumn<StaffMember>[] = [
    {
      key: "name",
      header: "Name",
      className: "text-left",
      render: row => (
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0'>
            {(row.first_name?.[0] || row.email[0]).toUpperCase()}
          </div>
          <span className={row.status === "INACTIVE" ? "text-muted-foreground" : ""}>
            {row.first_name || row.last_name ? `${row.first_name} ${row.last_name}`.trim() : row.email}
          </span>
        </div>
      ),
    },
    { key: "email", header: "Email", render: row => row.email },
    { key: "role", header: "Role", render: row => <StaffRoleBadge role={row.staff_role} /> },
    { key: "status", header: "Status", render: row => <StaffStatusBadge status={row.status} /> },
    {
      key: "last_login",
      header: "Last login",
      render: row =>
        row.last_login ? (
          formatDistanceToNowStrict(new Date(row.last_login), { addSuffix: true })
        ) : (
          <span className='text-muted-foreground'>Never</span>
        ),
    },
    {
      key: "invited_by",
      header: "Invited by",
      render: row => row.invited_by_admin?.name ?? <span className='text-muted-foreground'>—</span>,
    },
    {
      key: "created",
      header: "Date joined",
      render: row => format(new Date(row.created), "MMM dd, yyyy"),
    },
    {
      key: "actions",
      header: "Actions",
      render: row => (
        <PermissionGuard permission='staff.manage'>
          <div className='dropdown dropdown-end'>
            <button tabIndex={0} className='btn btn-ghost btn-xs' disabled={isPending}>
              <MoreVertical className='w-4 h-4' />
            </button>
            <ul tabIndex={0} className='dropdown-content menu menu-sm bg-base-100 rounded-box shadow z-10 w-44 p-1'>
              <li>
                <button onClick={() => setRoleChangeTarget(row)}>Edit role</button>
              </li>
              {row.status === "INACTIVE" ? (
                <li>
                  <button onClick={() => handleActivate(row)}>Activate</button>
                </li>
              ) : (
                <li>
                  <button className='text-destructive' onClick={() => handleDeactivate(row)}>
                    Deactivate
                  </button>
                </li>
              )}
            </ul>
          </div>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <div>
      <div className='flex justify-end mb-4'>
        <PermissionGuard permission='staff.invite'>
          <button className='btn btn-primary text-white btn-sm' onClick={() => setInviteOpen(true)}>
            Invite Staff
          </button>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={members}
        rowKey={row => row.id}
        emptyText='No staff members yet'
      />
      <div className='flex items-center justify-between mt-2'>
        <p className='text-xs text-muted-foreground'>{count} staff member{count !== 1 ? "s" : ""}</p>
        <div className='flex items-center gap-2'>
          <button
            className='btn btn-ghost btn-xs'
            disabled={!hasPrevious || isPending}
            onClick={() => loadPage(page - 1)}
          >
            Previous
          </button>
          <span className='text-xs text-muted-foreground'>Page {page}</span>
          <button
            className='btn btn-ghost btn-xs'
            disabled={!hasNext || isPending}
            onClick={() => loadPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={roles} onSuccess={refresh} />
      <ChangeStaffRoleDialog
        member={roleChangeTarget}
        roles={roles}
        onOpenChange={open => !open && setRoleChangeTarget(null)}
        onSuccess={refresh}
      />
    </div>
  );
};

export default TeamMembersTab;
