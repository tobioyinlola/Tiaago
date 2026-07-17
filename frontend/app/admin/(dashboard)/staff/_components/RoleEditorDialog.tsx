"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/common/components/ui/dialog";
import { Button } from "@/app/common/components/ui/button";
import { Input } from "@/app/common/components/ui/input";
import { Label } from "@/app/common/components/ui/label";
import { Textarea } from "@/app/common/components/ui/textarea";
import { Checkbox } from "@/app/common/components/ui/checkbox";
import {
  StaffPermissionDef,
  StaffRoleDetail,
  createStaffRole,
  getStaffPermissions,
  updateStaffRole,
} from "@/app/common/services/staff";

const RoleEditorDialog = ({
  open,
  onOpenChange,
  role,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: StaffRoleDetail | null;
  onSuccess: () => void;
}) => {
  const isEdit = !!role;
  const isLocked = role?.slug === "super_admin";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<StaffPermissionDef[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);

  // Resync form fields whenever the dialog (re)opens or a different role is
  // passed in, without an effect
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [syncedOpen, setSyncedOpen] = useState(false);
  const [syncedRole, setSyncedRole] = useState(role);
  if (open !== syncedOpen || role !== syncedRole) {
    const shouldReset = open && (!syncedOpen || role !== syncedRole);
    setSyncedOpen(open);
    setSyncedRole(role);
    if (shouldReset) {
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setSelected(new Set(role?.permissions.map(p => p.slug) ?? []));
      setLoadingPermissions(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    getStaffPermissions()
      .then(setPermissions)
      .catch(() => toast.error("Could not load permissions"))
      .finally(() => setLoadingPermissions(false));
  }, [open, role]);

  const grouped = useMemo(() => {
    const map = new Map<string, StaffPermissionDef[]>();
    permissions.forEach(p => {
      const list = map.get(p.group) ?? [];
      list.push(p);
      map.set(p.group, list);
    });
    return Array.from(map.entries());
  }, [permissions]);

  const toggle = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleGroup = (groupPerms: StaffPermissionDef[]) => {
    const allSelected = groupPerms.every(p => selected.has(p.slug));
    setSelected(prev => {
      const next = new Set(prev);
      groupPerms.forEach(p => (allSelected ? next.delete(p.slug) : next.add(p.slug)));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }
    setSaving(true);
    const payload = { name: name.trim(), description: description.trim(), permission_slugs: Array.from(selected) };
    const result = isEdit ? await updateStaffRole(role!.id, payload) : await createStaffRole(payload);
    setSaving(false);

    if (!result.success) {
      toast.error(isEdit ? "Could not update role" : "Could not create role", { description: result.error });
      return;
    }

    toast.success(isEdit ? "Role updated" : "Role created");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='!max-w-[calc(100vw-2rem)] sm:!max-w-2xl max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit role" : "Create role"}</DialogTitle>
        </DialogHeader>

        {isLocked && (
          <p className='text-xs text-muted-foreground bg-muted rounded px-3 py-2'>
            The Super Admin role&apos;s permissions cannot be edited. It always has full access.
          </p>
        )}

        <div className='space-y-4 py-2'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='role-name'>Role name</Label>
              <Input id='role-name' value={name} onChange={e => setName(e.target.value)} disabled={saving || isLocked} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='role-description'>Description</Label>
              <Input
                id='role-description'
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={saving || isLocked}
              />
            </div>
          </div>

          <div className='space-y-3'>
            <Label>Permissions</Label>
            {loadingPermissions ? (
              <p className='text-sm text-muted-foreground'>Loading permissions…</p>
            ) : (
              <div className='space-y-4 max-h-[40vh] overflow-y-auto pr-1'>
                {grouped.map(([group, groupPerms]) => {
                  const allSelected = groupPerms.every(p => selected.has(p.slug));
                  return (
                    <div key={group} className='border rounded-lg p-3'>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-sm font-semibold'>{group}</span>
                        <label className='flex items-center gap-2 text-xs text-muted-foreground cursor-pointer'>
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleGroup(groupPerms)}
                            disabled={isLocked}
                          />
                          Select all
                        </label>
                      </div>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                        {groupPerms.map(perm => (
                          <label key={perm.slug} className='flex items-start gap-2 text-sm cursor-pointer'>
                            <Checkbox
                              checked={selected.has(perm.slug)}
                              onCheckedChange={() => toggle(perm.slug)}
                              disabled={isLocked}
                              className='mt-0.5'
                            />
                            <span>
                              {perm.name}
                              <span className='block text-xs text-muted-foreground'>{perm.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className='text-xs text-muted-foreground bg-muted rounded px-3 py-2'>
            This role grants {selected.size} permission{selected.size !== 1 ? "s" : ""}
            {grouped.length ? ` across ${grouped.filter(([, perms]) => perms.some(p => selected.has(p.slug))).length} of ${grouped.length} groups.` : "."}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || isLocked || !name.trim()}>
            {saving && <Loader2 className='h-4 w-4 animate-spin' />}
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoleEditorDialog;
