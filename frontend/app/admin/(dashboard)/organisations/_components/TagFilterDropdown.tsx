"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { MultiSelectInput } from "@/app/common/components/dashboard/SelectInput";
import { Tag } from "@/app/common/types/tags.type";

const TagFilterDropdown = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tags, setTags] = useState<Tag[]>([]);

  const selectedSlugs = (searchParams.get("tags") ?? "").split(",").filter(Boolean);
  const tagMatch = searchParams.get("tag_match") === "all" ? "all" : "any";

  useEffect(() => {
    (async () => {
      try {
        const [systemRes, customTags] = await Promise.all([
          clientKyInstance.get("tags/admin/system/").json<{ results: Tag[] }>(),
          clientKyInstance.get("tags/admin/custom/").json<Tag[]>(),
        ]);
        setTags([...systemRes.results, ...customTags]);
      } catch {
        setTags([]);
      }
    })();
  }, []);

  const applyParams = (slugs: string[], match: string) => {
    const params = new URLSearchParams(searchParams);
    if (slugs.length) {
      params.set("tags", slugs.join(","));
      params.set("tag_match", match);
    } else {
      params.delete("tags");
      params.delete("tag_match");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-64">
        <MultiSelectInput
          placeholder="Filter by tags..."
          options={tags.map(t => ({ value: t.slug, label: t.name, colour: t.colour }))}
          value={selectedSlugs}
          onChange={slugs => applyParams(slugs, tagMatch)}
        />
      </div>
      {selectedSlugs.length > 1 && (
        <div className="join">
          <button
            type="button"
            className={`btn btn-xs join-item ${tagMatch === "any" ? "btn-primary" : "btn-outline"}`}
            onClick={() => applyParams(selectedSlugs, "any")}
          >
            Any
          </button>
          <button
            type="button"
            className={`btn btn-xs join-item ${tagMatch === "all" ? "btn-primary" : "btn-outline"}`}
            onClick={() => applyParams(selectedSlugs, "all")}
          >
            All
          </button>
        </div>
      )}
    </div>
  );
};

export default TagFilterDropdown;
