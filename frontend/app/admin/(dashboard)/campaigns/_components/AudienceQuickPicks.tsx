"use client";

import { useEffect, useState } from "react";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { Tag } from "@/app/common/types/tags.type";
import { AudienceValue } from "@/app/common/components/dashboard/AudiencePicker";

const QUICK_PICKS: { label: string; description: string; match: (a: AudienceValue) => boolean; makeValue: (tagsBySlug: Record<string, Tag>) => AudienceValue | null }[] = [
  {
    label: "All Recruiters",
    description: "Every company on Tiaago",
    match: a => a.type === "ALL_USERS",
    makeValue: () => ({ type: "ALL_USERS" }),
  },
  {
    label: "Active Recruiters",
    description: "Billable activity in the last 30 days",
    match: (a, tagsBySlug?: Record<string, Tag>) => a.type === "TAG" && tagsBySlug?.["active"]?.id === a.tag_id,
    makeValue: tagsBySlug => (tagsBySlug["active"] ? { type: "TAG", tag_id: tagsBySlug["active"].id } : null),
  },
  {
    label: "Inactive Recruiters",
    description: "No login in 14+ days",
    match: () => false,
    makeValue: tagsBySlug => (tagsBySlug["inactive-14-days"] ? { type: "TAG", tag_id: tagsBySlug["inactive-14-days"].id } : null),
  },
  {
    label: "Free Tier Users",
    description: "Never topped up, still has free credits",
    match: () => false,
    makeValue: tagsBySlug => (tagsBySlug["free-tier-user"] ? { type: "TAG", tag_id: tagsBySlug["free-tier-user"].id } : null),
  },
  {
    label: "Paid Users",
    description: "Has topped up the wallet at least once",
    match: () => false,
    makeValue: tagsBySlug => (tagsBySlug["paid-user"] ? { type: "TAG", tag_id: tagsBySlug["paid-user"].id } : null),
  },
];

const AudienceQuickPicks = ({ value, onChange }: { value: AudienceValue; onChange: (value: AudienceValue) => void }) => {
  const [tagsBySlug, setTagsBySlug] = useState<Record<string, Tag>>({});

  useEffect(() => {
    (async () => {
      try {
        const data = await clientKyInstance.get("tags/admin/system/").json<{ results: Tag[] }>();
        setTagsBySlug(Object.fromEntries(data.results.map(t => [t.slug, t])));
      } catch {
        // Non-fatal -- quick picks needing a tag just won't be clickable.
      }
    })();
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {QUICK_PICKS.map(pick => {
        const target = pick.makeValue(tagsBySlug);
        const isSelected =
          value.type === "ALL_USERS" && pick.label === "All Recruiters"
            ? true
            : value.type === "TAG" && target?.type === "TAG" && target.tag_id === value.tag_id;
        return (
          <button
            key={pick.label}
            type="button"
            disabled={!target}
            onClick={() => target && onChange(target)}
            className={`rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isSelected ? "border-[#1A3C5E] bg-[#EAF0F6]" : "border-[#E0E0E0] hover:border-[#1A3C5E]/40"
            }`}
          >
            <div className="text-sm font-medium text-[#1A3C5E]">{pick.label}</div>
            <div className="mt-0.5 text-xs text-[#9E9E9E]">{pick.description}</div>
          </button>
        );
      })}
    </div>
  );
};

export default AudienceQuickPicks;
