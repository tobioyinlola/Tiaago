"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict, format } from "date-fns";
import { toast } from "sonner";

import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import { setSystemTagActive } from "@/app/common/services/tags";
import { Tag } from "@/app/common/types/tags.type";
import PermissionGuard from "../../components/PermissionGuard";

const CATEGORY_LABELS: Record<string, string> = {
  LIFECYCLE: "Lifecycle",
  WALLET: "Wallet & spend",
  SCREENING: "Screening usage",
  ASSESSMENT: "Assessment usage",
  PIPELINE: "Pipeline",
  TEAM: "Team",
  ENGAGEMENT: "Engagement",
};

const SystemTagsTable = ({ tags, lastRuleRun }: { tags: Tag[]; lastRuleRun: string | null }) => {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggleActive = async (tag: Tag) => {
    setPendingId(tag.id);
    const result = await setSystemTagActive(tag.id, !tag.is_active);
    setPendingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${tag.name} ${tag.is_active ? "deactivated" : "activated"}.`);
    router.refresh();
  };

  const columns: DataTableColumn<Tag>[] = [
    {
      key: "name",
      header: "Tag",
      className: "text-left",
      render: row => (
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: row.colour }} />
          <span className="font-medium">{row.name}</span>
        </span>
      ),
    },
    { key: "category", header: "Category", render: row => CATEGORY_LABELS[row.category] ?? row.category },
    { key: "description", header: "Rule", className: "text-left max-w-xs", render: row => row.description },
    {
      key: "tagged_organisation_count",
      header: "Tagged orgs",
      render: row => (
        <Link href={`/admin/organisations?tags=${row.slug}`} className="text-primary hover:underline font-medium">
          {row.tagged_organisation_count}
        </Link>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: row => (
        <span className={`badge ${row.is_active ? "badge-success" : "badge-ghost"}`}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: row => (
        <PermissionGuard permission="tags.manage">
          <button
            type="button"
            className="btn btn-xs btn-outline"
            disabled={pendingId === row.id}
            onClick={() => toggleActive(row)}
          >
            {row.is_active ? "Deactivate" : "Activate"}
          </button>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 text-sm text-muted-foreground">
        {lastRuleRun ? (
          <>Rule engine last ran {formatDistanceToNowStrict(new Date(lastRuleRun), { addSuffix: true })} ({format(new Date(lastRuleRun), "MMM dd, yyyy HH:mm")}). Runs hourly.</>
        ) : (
          "Rule engine hasn't run yet — it runs hourly, on the hour."
        )}
      </div>
      <DataTable
        columns={columns}
        data={tags}
        rowKey={row => row.id}
        emptyText="No system tags found"
      />
    </>
  );
};

export default SystemTagsTable;
