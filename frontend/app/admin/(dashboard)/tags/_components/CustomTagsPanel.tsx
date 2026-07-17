"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import { createCustomTag } from "@/app/common/services/tags";
import { CUSTOM_TAG_COLOUR_PRESETS, Tag } from "@/app/common/types/tags.type";
import ApplyTagModal from "./ApplyTagModal";

const CustomTagsPanel = ({ tags }: { tags: Tag[] }) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [colour, setColour] = useState(CUSTOM_TAG_COLOUR_PRESETS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Tag name is required.");
      return;
    }
    setSubmitting(true);
    const result = await createCustomTag({ name: name.trim(), description: description.trim(), colour });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Created "${result.data.name}".`);
    setName("");
    setDescription("");
    setColour(CUSTOM_TAG_COLOUR_PRESETS[0]);
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
    { key: "description", header: "Description", className: "text-left max-w-xs", render: row => row.description || "—" },
    { key: "tagged_organisation_count", header: "Tagged orgs", render: row => row.tagged_organisation_count },
    { key: "actions", header: "", render: row => <ApplyTagModal tag={row} /> },
  ];

  return (
    <>
      <div className="border rounded-lg p-4 mb-6 max-w-xl">
        <h3 className="font-semibold mb-3">Create a custom tag</h3>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Tag name"
            className="input input-bordered w-full"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
          />
          <textarea
            placeholder="Description (optional)"
            className="textarea textarea-bordered w-full"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {CUSTOM_TAG_COLOUR_PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                aria-label={`Choose colour ${preset}`}
                onClick={() => setColour(preset)}
                className="w-6 h-6 rounded-full border-2"
                style={{ backgroundColor: preset, borderColor: colour === preset ? "#000" : "transparent" }}
              />
            ))}
          </div>
          <button type="button" className="btn btn-primary self-start" disabled={submitting} onClick={handleCreate}>
            {submitting ? "Creating..." : "Create tag"}
          </button>
        </div>
      </div>

      <DataTable columns={columns} data={tags} rowKey={row => row.id} emptyText="No custom tags yet" />
    </>
  );
};

export default CustomTagsPanel;
