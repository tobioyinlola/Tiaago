"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/common/components/ui/table";
import { Badge } from "@/app/common/components/ui/badge";
import { Button } from "@/app/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/common/components/ui/dialog";
import { removeMember } from "@/app/common/services/team";
import { TeamMember, ID } from "@/app/common/types";
import { cn } from "@/app/common/utils";

const ROLE_BADGE_VARIANT = {
  admin: "purple" as const,
  recruiter: "info" as const,
  viewer: "secondary" as const,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface TeamMembersTableProps {
  members: TeamMember[];
  companyId: number;
  currentUserId: ID;
  isAdmin: boolean;
  onRefetch: () => void;
}

export default function TeamMembersTable({
  members,
  companyId,
  currentUserId,
  isAdmin,
  onRefetch,
}: TeamMembersTableProps) {
  const [removingId, setRemovingId] = useState<ID | null>(null);
  const [confirmMember, setConfirmMember] = useState<TeamMember | null>(null);

  const handleRemove = async () => {
    if (!confirmMember) return;
    setRemovingId(confirmMember.id);
    const result = await removeMember(companyId, confirmMember.id);
    setRemovingId(null);
    setConfirmMember(null);

    if (result.success) {
      toast.success("Member removed successfully");
      onRefetch();
    } else {
      toast.error("Failed to remove member", { description: result.error });
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead className="max-sm:hidden">Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="max-sm:hidden">Joined</TableHead>
            {isAdmin && <TableHead className="w-[60px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map(member => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {member.user_profile_pic ? (
                    <img
                      src={member.user_profile_pic}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(member.user_full_name || "?")}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {member.user_full_name}
                      {member.user === currentUserId && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      {member.user_email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-sm:hidden text-muted-foreground text-sm">
                {member.user_email}
              </TableCell>
              <TableCell>
                <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
                  {member.role}
                </Badge>
              </TableCell>
              <TableCell className="max-sm:hidden text-muted-foreground text-sm">
                {formatDate(member.created_at)}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  {member.user !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 text-muted-foreground hover:text-destructive",
                        removingId === member.id && "pointer-events-none"
                      )}
                      onClick={() => setConfirmMember(member)}
                      disabled={removingId === member.id}
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={!!confirmMember}
        onOpenChange={open => !open && setConfirmMember(null)}
      >
        <DialogContent className="!max-w-[calc(100vw-2rem)] sm:!max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {confirmMember?.user_full_name}
              </span>{" "}
              from the team? They will lose access to the dashboard immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmMember(null)}
              disabled={!!removingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={!!removingId}
            >
              {removingId && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
