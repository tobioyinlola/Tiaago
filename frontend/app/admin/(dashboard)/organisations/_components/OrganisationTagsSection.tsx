"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";

import { addOrganisationTag, removeOrganisationTag } from "@/app/common/services/tags";
import { SelectInput } from "@/app/common/components/dashboard/SelectInput";
import { OrganisationTag, Tag, TagAuditLogEntry } from "@/app/common/types/tags.type";

const formatExact = (value: string) => format(new Date(value), "MMM dd, yyyy hh:mm a");
const formatRelative = (value: string) => formatDistanceToNowStrict(new Date(value), { addSuffix: true });

const OrganisationTagsSection = ({
  companyId,
  currentTags,
  customTags,
  timeline,
}: {
  companyId: number | string;
  currentTags: OrganisationTag[];
  customTags: Tag[];
  timeline: TagAuditLogEntry[];
}) => {
  const router = useRouter();
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const appliedCustomSlugs = new Set(currentTags.filter(t => t.tag.tag_type === "CUSTOM").map(t => t.tag.slug));
  const availableCustomTags = customTags.filter(t => !appliedCustomSlugs.has(t.slug));

  const handleAdd = async () => {
    if (!selectedTagId) return;
    setSubmitting(true);
    const result = await addOrganisationTag(companyId, selectedTagId);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Tag applied.");
    setSelectedTagId("");
    router.refresh();
  };

  const handleRemove = async (tag: Tag) => {
    setSubmitting(true);
    const result = await removeOrganisationTag(companyId, tag.id);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Removed "${tag.name}".`);
    router.refresh();
  };

  return (
    <div className="mb-8">
      <h3 className="text-gray-900 text-lg font-medium mb-4">Tags</h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {currentTags.map(ot => (
          <span
            key={ot.id}
            className="badge badge-lg text-white gap-1.5 py-3"
            style={{ backgroundColor: ot.tag.colour }}
            title={`Applied ${formatExact(ot.applied_at)}${ot.applied_by_admin_name ? ` by ${ot.applied_by_admin_name}` : " automatically"}`}
          >
            {ot.tag.name}
            <span className="opacity-75 text-[10px] uppercase">{ot.tag.tag_type === "SYSTEM" ? "auto" : "manual"}</span>
            {ot.tag.tag_type === "CUSTOM" && (
              <button
                type="button"
                onClick={() => handleRemove(ot.tag)}
                disabled={submitting}
                aria-label={`Remove ${ot.tag.name}`}
                className="ml-1"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!currentTags.length && <span className="text-sm text-muted-foreground">No tags yet.</span>}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-64">
          <SelectInput
            size="sm"
            placeholder="Add a custom tag..."
            options={availableCustomTags.map(tag => ({ value: tag.id, label: tag.name, colour: tag.colour }))}
            value={selectedTagId || null}
            onChange={value => setSelectedTagId(value ?? "")}
          />
        </div>
        <button type="button" className="btn btn-sm btn-primary" disabled={!selectedTagId || submitting} onClick={handleAdd}>
          Add
        </button>
      </div>

      <button type="button" className="text-sm text-primary hover:underline" onClick={() => setShowTimeline(s => !s)}>
        {showTimeline ? "Hide" : "Show"} tag change history ({timeline.length})
      </button>

      {showTimeline && (
        <div className="rounded-lg border divide-y mt-3">
          {timeline.length ? (
            timeline.map(entry => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>
                  <span className={entry.action === "APPLIED" ? "text-badge-green-text" : "text-destructive"}>
                    {entry.action === "APPLIED" ? "Applied" : "Removed"}
                  </span>{" "}
                  <span className="font-medium">{entry.tag_name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {entry.triggered_by === "SYSTEM_CRON" ? "by rule engine" : entry.admin_name ? `by ${entry.admin_name}` : "manually"}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs" title={formatExact(entry.occurred_at)}>
                  {formatRelative(entry.occurred_at)}
                </span>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No tag changes recorded yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganisationTagsSection;
