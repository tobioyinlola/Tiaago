"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus, Users } from "lucide-react";
import Image from "next/image";

import { Button } from "@/app/common/components/ui/button";
import { getTeamList } from "@/app/common/services/team";
import { TeamListResponse } from "@/app/common/types";
import { useStartupStore } from "../../../../store";
import TeamMembersTable from "./TeamMembersTable";
import PendingInvitesTable from "./PendingInvitesTable";
import InviteTeamDialog from "./InviteTeamDialog";

const TeamMembersTab = () => {
  const profile = useStartupStore(s => s.profile);
  const [data, setData] = useState<TeamListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      setError(null);
      const result = await getTeamList();
      setData(result);
    } catch {
      setError("Could not load team data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const isAdmin = data?.user_role === "admin";
  const hasMembers = (data?.members?.length ?? 0) > 0;
  const hasInvites = (data?.invites?.length ?? 0) > 0;
  const isEmpty = !hasMembers && !hasInvites;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchTeam}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="w-full rounded-lg border border-border bg-muted/50 p-5 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Team Members
            </h2>
            <p className="text-muted-foreground text-sm">
              Manage your team and their permissions.
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)} className="max-sm:w-full">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-b-lg border border-t-0 border-border py-16 px-4 text-center">
          <Image
            src="/assets/illustrations/team-members.svg"
            alt="Invite team members"
            width={180}
            height={140}
            className="opacity-80"
          />
          <div>
            <p className="font-medium text-foreground">No team members yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Invite your colleagues to collaborate on hiring and managing
              candidates.
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setInviteOpen(true)}
              variant="outline"
              size="sm"
            >
              <UserPlus className="h-4 w-4" />
              Invite Your First Member
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-b-lg border border-t-0 border-border divide-y divide-border">
          {hasMembers && (
            <div>
              <div className="px-4 py-3 bg-muted/30">
                <h3 className="text-sm font-medium text-foreground">
                  Active Members ({data!.members.length})
                </h3>
              </div>
              <TeamMembersTable
                members={data!.members}
                companyId={data!.company_id}
                currentUserId={profile?.pk ?? profile?.id ?? 0}
                isAdmin={isAdmin}
                onRefetch={fetchTeam}
              />
            </div>
          )}

          {hasInvites && (
            <div>
              <div className="px-4 py-3 bg-muted/30">
                <h3 className="text-sm font-medium text-foreground">
                  Pending Invites ({data!.invites.length})
                </h3>
              </div>
              <PendingInvitesTable
                invites={data!.invites}
                isAdmin={isAdmin}
                onRefetch={fetchTeam}
              />
            </div>
          )}
        </div>
      )}

      <InviteTeamDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={fetchTeam}
      />
    </>
  );
};

export default TeamMembersTab;
