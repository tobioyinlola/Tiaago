"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/common/components/ui/button";
import { Input } from "@/app/common/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/common/components/ui/dialog";
import { deleteOrganisation } from "@/app/common/services/organisations";

const DeleteOrganisationButton = ({
  companyId,
  companyName,
}: {
  companyId: number | string;
  companyName: string;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim() === companyName;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    const res = await deleteOrganisation(companyId);
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(`${companyName} has been permanently deleted`);
    router.push("/admin/organisations");
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-error text-error hover:bg-error/5 gap-2"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" /> Delete organisation
      </Button>

      <Dialog
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (!next) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {companyName}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the organisation&apos;s account -- their login, company
              profile, jobs, applications, wallet, and every candidate/assessment record tied to
              them. This cannot be undone, and no email notification is sent. Their email becomes
              available again immediately if they want to sign up as a new account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Type <span className="font-semibold">{companyName}</span> to confirm
            </label>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={companyName}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canDelete || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteOrganisationButton;
