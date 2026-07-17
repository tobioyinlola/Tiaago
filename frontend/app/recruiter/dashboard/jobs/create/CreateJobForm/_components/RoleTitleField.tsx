"use client";

import { useMemo } from "react";

import { cn } from "@/app/common/utils";
import { TalentRole } from "@/app/common/types";

const FALLBACK_SUGGESTIONS = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full-stack Engineer",
  "Product Manager",
  "UI/UX Designer",
  "Data Scientist",
  "DevOps Engineer",
  "QA Engineer",
];

const RoleTitleField = ({
  value,
  onChange,
  talentRoles,
  error,
  touched,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  talentRoles: TalentRole[];
  error?: string;
  touched?: boolean;
  className?: string;
}) => {
  const suggestions = useMemo(() => {
    const titles = talentRoles.length
      ? talentRoles.map(role => role.title)
      : FALLBACK_SUGGESTIONS;
    const query = value.trim().toLowerCase();
    const filtered = query
      ? titles.filter(
          title => title.toLowerCase().includes(query) && title.toLowerCase() !== query
        )
      : titles;
    return filtered.slice(0, 6);
  }, [talentRoles, value]);

  return (
    <div className={className}>
      <label className='label-text text-black font-medium font-onest mb-1 block'>
        Title/ Position
      </label>
      <input
        type='text'
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='e.g. Frontend Engineer'
        className={cn(
          "w-full bg-white input input-bordered border-[#D0D5DD] placeholder:text-[#7E8285]",
          error && touched && "border-error"
        )}
      />
      {!!suggestions.length && (
        <div className='flex flex-wrap gap-2 mt-2'>
          {suggestions.map(title => (
            <button
              key={title}
              type='button'
              onClick={() => onChange(title)}
              className='text-xs px-3 py-1 rounded-full border border-[#D0D5DD] text-secondary-black hover:border-primary hover:text-primary transition-colors'
            >
              {title}
            </button>
          ))}
        </div>
      )}
      <p
        className={cn(
          "text-xs text-error m-0.5 mb-2 transition-opacity opacity-0",
          error && touched && "opacity-100"
        )}
      >
        {error || "error"}
      </p>
    </div>
  );
};

export default RoleTitleField;
