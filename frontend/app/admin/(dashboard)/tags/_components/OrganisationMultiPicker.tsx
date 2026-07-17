"use client";

import { useEffect, useRef, useState } from "react";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { OrganisationOption } from "@/app/common/types/notifications.type";

const OrganisationMultiPicker = ({
  value,
  onChange,
}: {
  value: OrganisationOption[];
  onChange: (orgs: OrganisationOption[]) => void;
}) => {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<OrganisationOption[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const data = await clientKyInstance
          .get("notifications/admin/organisations/", { searchParams: query ? { q: query } : {} })
          .json<{ results: OrganisationOption[] }>();
        setOptions(data.results);
      } catch {
        setOptions([]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const selectedIds = new Set(value.map(v => v.id));

  const addOrg = (org: OrganisationOption) => {
    if (!selectedIds.has(org.id)) onChange([...value, org]);
    setQuery("");
    setOpen(false);
  };

  const removeOrg = (id: number) => onChange(value.filter(v => v.id !== id));

  return (
    <div className="relative" ref={containerRef}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(org => (
            <span key={org.id} className="badge badge-outline gap-1">
              {org.company_name}
              <button type="button" onClick={() => removeOrg(org.id)} aria-label={`Remove ${org.company_name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        placeholder="Search organisations to add..."
        className="input input-bordered w-full"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && options.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white rounded-lg border border-[#EAECEE] shadow-lg">
          {options.map(org => (
            <li key={org.id}>
              <button
                type="button"
                onClick={() => addOrg(org)}
                disabled={selectedIds.has(org.id)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                {org.company_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OrganisationMultiPicker;
