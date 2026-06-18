"use client";

import { useState } from "react";
import { Loader2, RotateCcw, XCircle } from "lucide-react";
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
import { resendInvite, revokeInvite } from "@/app/common/services/team";
import { TeamInvite, ID } from "@/app/common/types";

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

interface PendingInvitesTableProps {
  invites: TeamInvite[];
  isAdmin: boolean;
  onRefetch: () => void;
}

export default function PendingInvitesTable({
  invites,
  isAdmin,
  onRefetch,
}: PendingInvitesTableProps) {
  const [loadingId, setLoadingId] = useState<{ id: ID; action: string } | null>(
    null
  );

  const handleResend = async (invite: TeamInvite) => {
    setLoadingId({ id: invite.id, action: "resend" });
    const result = await resendInvite(invite.id);
    setLoadingId(null);

    if (result.success) {
      toast.success("Invite resent", {
        description: `A new invitation was sent to ${invite.email}`,
      });
      onRefetch();
    } else {
      toast.error("Failed to resend invite", { description: result.error });
    }
  };

  const handleRevoke = async (invite: TeamInvite) => {
    setLoadingId({ id: invite.id, action: "revoke" });
    const result = await revokeInvite(invite.id);
    setLoadingId(null);

    if (result.success) {
      toast.success("Invite revoked", {
        description: `Invitation to ${invite.email} has been cancelled`,
      });
      onRefetch();
    } else {
      toast.error("Failed to revoke invite", { description: result.error });
    }
  };

  const isLoading = (id: ID, action: string) =>
    loadingId?.id === id && loadingId?.action === action;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="max-sm:hidden">Status</TableHead>
          <TableHead className="max-sm:hidden">Sent</TableHead>
          {isAdmin && <TableHead className="w-[100px]" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map(invite => (
          <TableRow key={invite.id}>
            <TableCell>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {invite.email}
                </p>
                <p className="text-xs text-muted-foreground sm:hidden">
                  {invite.is_expired ? "Expired" : "Pending"} &middot;{" "}
                  {formatDate(invite.created_at)}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={ROLE_BADGE_VARIANT[invite.role]}>
                {invite.role}
              </Badge>
            </TableCell>
            <TableCell className="max-sm:hidden">
              <Badge variant={invite.is_expired ? "destructive" : "outline"}>
                {invite.is_expired ? "Expired" : "Pending"}
              </Badge>
            </TableCell>
            <TableCell className="max-sm:hidden text-muted-foreground text-sm">
              {formatDate(invite.created_at)}
            </TableCell>
            {isAdmin && (
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => handleResend(invite)}
                    disabled={!!loadingId}
                    title="Resend invite"
                  >
                    {isLoading(invite.id, "resend") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevoke(invite)}
                    disabled={!!loadingId}
                    title="Revoke invite"
                  >
                    {isLoading(invite.id, "revoke") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
