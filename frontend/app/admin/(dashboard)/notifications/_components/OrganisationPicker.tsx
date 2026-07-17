"use client";

import { useEffect, useRef, useState } from "react";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { OrganisationOption } from "@/app/common/types/notifications.type";

const OrganisationPicker = ({
  value,
  onChange,
}: {
  value: OrganisationOption | null;
  onChange: (org: OrganisationOption | null) => void;
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

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        placeholder="Search organisations..."
        className="input input-bordered w-full"
        value={value ? value.company_name : query}
        onChange={e => {
          onChange(null);
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
                onClick={() => {
                  onChange(org);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
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

export default OrganisationPicker;
