"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/common/components/ui/dialog";
import { Button } from "@/app/common/components/ui/button";
import { Input } from "@/app/common/components/ui/input";
import { Label } from "@/app/common/components/ui/label";
import SelectInput from "@/app/common/components/dashboard/SelectInput";
import { StaffRoleDetail, inviteStaffMember } from "@/app/common/services/staff";

const InviteStaffDialog = ({
  open,
  onOpenChange,
  roles,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: StaffRoleDetail[];
  onSuccess: () => void;
}) => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleSlug, setRoleSlug] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const reset = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRoleSlug(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !roleSlug) {
      toast.error("Email and role are required");
      return;
    }
    setSending(true);
    const result = await inviteStaffMember({
      email: email.trim(),
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      role_slug: roleSlug,
    });
    setSending(false);

    if (!result.success) {
      toast.error("Could not send invite", { description: result.error });
      return;
    }

    toast.success(`Invite sent to ${email}`);
    reset();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='!max-w-[calc(100vw-2rem)] sm:!max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserPlus className='h-5 w-5 text-primary' />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            They will receive an email with a link to set their password.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='invite-first-name'>First name</Label>
              <Input
                id='invite-first-name'
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='invite-last-name'>Last name</Label>
              <Input
                id='invite-last-name'
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                disabled={sending}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='invite-email'>Email address</Label>
            <Input
              id='invite-email'
              type='email'
              placeholder='colleague@tiaago.com'
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className='space-y-2'>
            <Label>Role</Label>
            <SelectInput
              options={roles.map(r => ({ label: r.name, value: r.slug }))}
              value={roleSlug}
              onChange={setRoleSlug}
              placeholder='Select a role'
              isSearchable={false}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleClose(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sending || !email.trim() || !roleSlug}>
            {sending && <Loader2 className='h-4 w-4 animate-spin' />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteStaffDialog;
