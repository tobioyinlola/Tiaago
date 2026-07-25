"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, UserX, UserCheck, Trash2 } from "lucide-react";

import { cn } from "@/app/common/utils";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import { useAlert } from "@/app/common/store/useAlert";
import { TalentNetworkMember } from "@/app/common/services/talent-network-admin";
import {
  setTalentNetworkMemberStatus,
  deleteTalentNetworkMember,
} from "@/app/common/services/talent-network-admin-client";
import MemberProfilePanel from "./MemberProfilePanel";

type Props = {
  data: TalentNetworkMember[];
};

const MembersTable = ({ data }: Props) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [profileMember, setProfileMember] = useState<TalentNetworkMember | null>(null);

  const toggleStatus = async (member: TalentNetworkMember) => {
    setPendingId(member.id);
    const nextStatus = member.status === "DEACTIVATED" ? "ACTIVE" : "DEACTIVATED";
    const res = await setTalentNetworkMemberStatus(member.id, nextStatus);
    setPendingId(null);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    router.refresh();
  };

  const handleDelete = async (member: TalentNetworkMember) => {
    if (!confirm(`Remove ${member.full_name} from the Talent Network? This can't be undone from here.`)) return;
    setPendingId(member.id);
    const res = await deleteTalentNetworkMember(member.id);
    setPendingId(null);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    router.refresh();
  };

  if (!data.length) {
    return (
      <EmptyStateV3
        text="No signups yet"
        subText="Share the Talent Network landing page to start building your candidate pool."
      />
    );
  }

  return (
    <>
      <ScrollArea className="border rounded-lg dashboard-content-constraint">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Member</th>
              <th className="max-sm:hidden">Country</th>
              <th className="max-md:hidden">Roles</th>
              <th className="max-lg:hidden">Experience</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map(member => (
              <tr key={member.id}>
                <td>
                  <div className="min-w-0">
                    <h6 className="text-[#101828] truncate font-medium">{member.full_name}</h6>
                    <p className="text-[#667085] truncate text-xs">{member.email}</p>
                  </div>
                </td>
                <td className="max-sm:hidden">{member.country || "—"}</td>
                <td className="max-md:hidden capitalize">
                  {member.interested_roles.slice(0, 2).map(r => r.replaceAll("_", " ").toLowerCase()).join(", ") || "—"}
                  {member.interested_roles.length > 2 && ` +${member.interested_roles.length - 2}`}
                </td>
                <td className="max-lg:hidden">{member.years_experience}</td>
                <td>
                  <StatusBadge status={member.status.toLowerCase() as any} />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setProfileMember(member)}
                      className="btn btn-ghost btn-xs"
                      title="View profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(member)}
                      disabled={pendingId === member.id}
                      className={cn("btn btn-ghost btn-xs", pendingId === member.id && "opacity-50")}
                      title={member.status === "DEACTIVATED" ? "Reactivate" : "Deactivate"}
                    >
                      {member.status === "DEACTIVATED" ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(member)}
                      disabled={pendingId === member.id}
                      className={cn("btn btn-ghost btn-xs text-error", pendingId === member.id && "opacity-50")}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {profileMember && <MemberProfilePanel member={profileMember} onClose={() => setProfileMember(null)} />}
    </>
  );
};

export default MembersTable;
