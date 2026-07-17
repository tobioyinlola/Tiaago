"use client";

import { useState } from "react";
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
import { Label } from "@/app/common/components/ui/label";
import SelectInput from "@/app/common/components/dashboard/SelectInput";
import { StaffMember, StaffRoleDetail, changeStaffMemberRole } from "@/app/common/services/staff";

const ChangeStaffRoleDialog = ({
  member,
  roles,
  onOpenChange,
  onSuccess,
}: {
  member: StaffMember | null;
  roles: StaffRoleDetail[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const [roleSlug, setRoleSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Resync roleSlug whenever a new member is passed in, without an effect
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [syncedMember, setSyncedMember] = useState<StaffMember | null>(null);
  if (member !== syncedMember) {
    setSyncedMember(member);
    setRoleSlug(member?.staff_role?.slug ?? null);
  }

  if (!member) return null;

  const handleSubmit = async () => {
    if (!roleSlug) return;
    setSaving(true);
    const result = await changeStaffMemberRole(member.id, roleSlug);
    setSaving(false);

    if (!result.success) {
      toast.error("Could not change role", { description: result.error });
      return;
    }

    toast.success(`Role updated for ${member.email}`);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className='!max-w-[calc(100vw-2rem)] sm:!max-w-sm'>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
        </DialogHeader>

        <div className='space-y-2 py-2'>
          <Label>{member.email}</Label>
          <SelectInput
            options={roles.map(r => ({ label: r.name, value: r.slug }))}
            value={roleSlug}
            onChange={setRoleSlug}
            isSearchable={false}
          />
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !roleSlug}>
            {saving && <Loader2 className='h-4 w-4 animate-spin' />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeStaffRoleDialog;
