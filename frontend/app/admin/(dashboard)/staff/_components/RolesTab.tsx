"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import { Badge } from "@/app/common/components/ui/badge";
import PermissionGuard from "../../components/PermissionGuard";
import { StaffRoleDetail, deleteStaffRole, getStaffRoles } from "@/app/common/services/staff";
import RoleEditorDialog from "./RoleEditorDialog";

const RolesTab = ({ initialRoles }: { initialRoles: StaffRoleDetail[] }) => {
  const [roles, setRoles] = useState(initialRoles);
  const [editorRole, setEditorRole] = useState<StaffRoleDetail | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const res = await getStaffRoles();
      setRoles(res);
    });
  };

  const openCreate = () => {
    setEditorRole(null);
    setEditorOpen(true);
  };

  const openEdit = (role: StaffRoleDetail) => {
    setEditorRole(role);
    setEditorOpen(true);
  };

  const handleDelete = (role: StaffRoleDetail) => {
    startTransition(async () => {
      const result = await deleteStaffRole(role.id);
      if (!result.success) {
        toast.error("Could not delete role", { description: result.error });
        return;
      }
      toast.success(`${role.name} deleted`);
      refresh();
    });
  };

  const columns: DataTableColumn<StaffRoleDetail>[] = [
    {
      key: "name",
      header: "Role name",
      className: "text-left",
      render: row => (
        <div className='flex items-center gap-2'>
          <span className='font-medium'>{row.name}</span>
          {row.is_system_role && <Badge variant='outline'>System</Badge>}
        </div>
      ),
    },
    { key: "slug", header: "Slug", render: row => <code className='text-xs'>{row.slug}</code> },
    { key: "description", header: "Description", className: "text-left", render: row => row.description || "—" },
    { key: "member_count", header: "Staff", render: row => row.member_count },
    { key: "permission_count", header: "Permissions", render: row => row.permission_count },
    {
      key: "actions",
      header: "Actions",
      render: row => (
        <PermissionGuard permission='staff.roles.manage'>
          <div className='flex justify-center gap-1'>
            <button className='btn btn-ghost btn-xs' onClick={() => openEdit(row)} disabled={isPending}>
              <Pencil className='w-3.5 h-3.5' />
            </button>
            <button
              className='btn btn-ghost btn-xs text-destructive'
              onClick={() => handleDelete(row)}
              disabled={isPending || row.is_system_role}
              title={row.is_system_role ? "System roles cannot be deleted" : undefined}
            >
              <Trash2 className='w-3.5 h-3.5' />
            </button>
          </div>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <div>
      <div className='flex justify-end mb-4'>
        <PermissionGuard permission='staff.roles.manage'>
          <button className='btn btn-primary text-white btn-sm' onClick={openCreate}>
            Create Role
          </button>
        </PermissionGuard>
      </div>

      <DataTable columns={columns} data={roles} rowKey={row => row.id} emptyText='No roles yet' />

      <RoleEditorDialog open={editorOpen} onOpenChange={setEditorOpen} role={editorRole} onSuccess={refresh} />
    </div>
  );
};

export default RolesTab;
