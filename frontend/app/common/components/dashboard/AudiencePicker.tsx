"use client";

import { useEffect, useState } from "react";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { OrganisationOption } from "@/app/common/types/notifications.type";
import { AudienceSegment } from "@/app/common/types/segments.type";
import { Tag } from "@/app/common/types/tags.type";
import OrganisationPicker from "@/app/admin/(dashboard)/notifications/_components/OrganisationPicker";
import OrganisationMultiPicker from "@/app/admin/(dashboard)/tags/_components/OrganisationMultiPicker";
import { SelectInput } from "./SelectInput";

export type AudienceType = "ALL_USERS" | "SEGMENT" | "TAG" | "ORGANISATION" | "MANUAL";

export type AudienceValue =
  | { type: "ALL_USERS" }
  | { type: "SEGMENT"; segment_id: string | null }
  | { type: "TAG"; tag_id: string | null }
  | { type: "ORGANISATION"; organisation: OrganisationOption | null }
  | { type: "MANUAL"; organisations: OrganisationOption[] };

const TYPE_LABELS: Record<AudienceType, string> = {
  ALL_USERS: "All users",
  SEGMENT: "By segment",
  TAG: "By tag",
  ORGANISATION: "Specific organisation",
  MANUAL: "Manual selection",
};

const AudiencePicker = ({
  options,
  value,
  onChange,
}: {
  options: AudienceType[];
  value: AudienceValue;
  onChange: (value: AudienceValue) => void;
}) => {
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (options.includes("SEGMENT")) {
          const data = await clientKyInstance.get("segments/admin/").json<AudienceSegment[]>();
          setSegments(data);
        }
        if (options.includes("TAG")) {
          const [systemRes, customTags] = await Promise.all([
            clientKyInstance.get("tags/admin/system/").json<{ results: Tag[] }>(),
            clientKyInstance.get("tags/admin/custom/").json<Tag[]>(),
          ]);
          setTags([...systemRes.results, ...customTags]);
        }
      } catch {
        // Non-fatal -- pickers just show empty options.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTag = (tags.find(t => t.id === (value.type === "TAG" ? value.tag_id : null))) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map(type => (
          <button
            key={type}
            type="button"
            className={`btn btn-sm ${value.type === type ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              if (type === "ALL_USERS") onChange({ type: "ALL_USERS" });
              else if (type === "SEGMENT") onChange({ type: "SEGMENT", segment_id: null });
              else if (type === "TAG") onChange({ type: "TAG", tag_id: null });
              else if (type === "ORGANISATION") onChange({ type: "ORGANISATION", organisation: null });
              else onChange({ type: "MANUAL", organisations: [] });
            }}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {value.type === "SEGMENT" && (
        <SelectInput
          placeholder="Select a segment..."
          options={segments.map(s => ({ value: s.id, label: `${s.name} (${s.estimated_size} orgs)` }))}
          value={value.segment_id}
          onChange={segment_id => onChange({ type: "SEGMENT", segment_id })}
        />
      )}

      {value.type === "TAG" && (
        <SelectInput
          placeholder="Select a tag..."
          options={tags.map(t => ({ value: t.id, label: `${t.name} (${t.tagged_organisation_count} orgs)`, colour: t.colour }))}
          value={value.tag_id}
          onChange={tag_id => onChange({ type: "TAG", tag_id })}
        />
      )}
      {value.type === "TAG" && selectedTag && (
        <p className="text-xs text-muted-foreground">{selectedTag.tagged_organisation_count} organisations currently hold this tag.</p>
      )}

      {value.type === "ORGANISATION" && (
        <OrganisationPicker value={value.organisation} onChange={org => onChange({ type: "ORGANISATION", organisation: org })} />
      )}

      {value.type === "MANUAL" && (
        <OrganisationMultiPicker value={value.organisations} onChange={orgs => onChange({ type: "MANUAL", organisations: orgs })} />
      )}
    </div>
  );
};

export default AudiencePicker;
