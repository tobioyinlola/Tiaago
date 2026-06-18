"use client";

import { useState } from "react";
import { Loader2, X, UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";
import { inviteTeamMembers } from "@/app/common/services/team";
import { TeamMemberRole } from "@/app/common/types";

interface InviteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ROLE_DESCRIPTIONS: Record<TeamMemberRole, string> = {
  admin: "Full access, can invite and manage members",
  recruiter: "Can post jobs, screen, and manage candidates",
  viewer: "Read-only access to dashboard and candidates",
};

export default function InviteTeamDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteTeamDialogProps) {
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState<TeamMemberRole>("viewer");
  const [sending, setSending] = useState(false);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      toast.error("Invalid email address");
      return;
    }
    if (emails.includes(trimmed)) {
      toast.error("Email already added");
      return;
    }
    setEmails(prev => [...prev, trimmed]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setEmails(prev => prev.filter(e => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSubmit = async () => {
    if (emails.length === 0) {
      toast.error("Add at least one email address");
      return;
    }

    setSending(true);
    const result = await inviteTeamMembers(emails, role);
    setSending(false);

    if (!result.success) {
      toast.error("Failed to send invites", { description: result.error });
      return;
    }

    const { created, errors } = result.data;

    if (created.length > 0) {
      toast.success(
        `Invite${created.length > 1 ? "s" : ""} sent to ${created.length} member${created.length > 1 ? "s" : ""}`
      );
    }

    if (errors.length > 0) {
      errors.forEach(err => {
        toast.error(`${err.email}`, { description: err.error });
      });
    }

    setEmails([]);
    setEmailInput("");
    setRole("viewer");
    onOpenChange(false);
    onSuccess();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmails([]);
      setEmailInput("");
      setRole("viewer");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[calc(100vw-2rem)] sm:!max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Team Members
          </DialogTitle>
          <DialogDescription>
            Send invitations to join your team. They will receive an email with a
            link to accept.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="email-input">Email addresses</Label>
            <div className="flex gap-2">
              <Input
                id="email-input"
                type="email"
                placeholder="colleague@company.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmail}
                disabled={sending || !emailInput.trim()}
                className="shrink-0 h-10"
              >
                Add
              </Button>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {emails.map(email => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                      disabled={sending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={v => setRole(v as TeamMemberRole)}
              disabled={sending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="recruiter">Recruiter</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sending || emails.length === 0}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send Invite{emails.length > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
