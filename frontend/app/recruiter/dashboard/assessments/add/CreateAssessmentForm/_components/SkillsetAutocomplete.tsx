"use client";

import { useMemo, useRef, useState } from "react";
import { LuX, LuSearch } from "react-icons/lu";

import { cn } from "@/app/common/utils";
import { TalentRole } from "@/app/common/types";

type Props = {
  roles: TalentRole[];
  /** Array of role ids as strings -- the exact shape the create-assessment
   * payload expects, unchanged from the old pill-button picker. */
  value: string[];
  onChange: (next: string[]) => void;
  onTouched: () => void;
  hasError?: boolean;
  placeholder?: string;
};

const SkillsetAutocomplete = ({
  roles,
  value,
  onChange,
  onTouched,
  hasError,
  placeholder = "Search roles, e.g. Frontend Engineer",
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedRoles = useMemo(
    () =>
      value
        .map(id => roles.find(role => String(role.id) === id))
        .filter((role): role is TalentRole => !!role),
    [value, roles]
  );

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roles.filter(
      role =>
        !value.includes(String(role.id)) &&
        (!needle || role.title.toLowerCase().includes(needle))
    );
  }, [roles, value, query]);

  const select = (role: TalentRole) => {
    const roleId = String(role.id);
    if (!value.includes(roleId)) onChange([...value, roleId]);
    onTouched();
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  const deselect = (roleId: string) => {
    onChange(value.filter(id => id !== roleId));
    onTouched();
  };

  return (
    <div className='relative'>
      <div
        className={cn(
          "bg-white input input-bordered border-[#D0D5DD] h-auto min-h-12 py-2 flex flex-wrap items-center gap-2 focus-within:shadow-none",
          hasError && "border-error"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedRoles.map(role => (
          <span
            key={role.id}
            className='flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium'
          >
            {role.title}
            <button
              type='button'
              aria-label={`Remove ${role.title}`}
              className='rounded-full p-0.5 hover:bg-primary/20'
              onClick={event => {
                event.stopPropagation();
                deselect(String(role.id));
              }}
            >
              <LuX className='w-3 h-3' />
            </button>
          </span>
        ))}
        <LuSearch className='text-[#98A2B3] shrink-0' />
        <input
          ref={inputRef}
          type='text'
          className='grow min-w-[8rem] bg-transparent outline-none text-sm placeholder:text-[#7E8285]'
          value={query}
          placeholder={selectedRoles.length ? "Add another role" : placeholder}
          autoComplete='off'
          onChange={event => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Blur fires before a suggestion's click would, so the dropdown
          // items call preventDefault on mousedown to keep focus here --
          // this only has to handle tabbing/clicking truly away.
          onBlur={() => {
            setOpen(false);
            onTouched();
          }}
          onKeyDown={event => {
            if (event.key === "Enter") {
              // The wizard's own <form> would otherwise submit and skip a step.
              event.preventDefault();
              if (suggestions.length) select(suggestions[0]);
              return;
            }
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key === "Backspace" && !query && value.length) {
              deselect(value[value.length - 1]);
            }
          }}
        />
      </div>

      {open && (
        <div className='absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[#EAECF0] rounded-lg shadow-lg max-h-56 overflow-y-auto'>
          {suggestions.length === 0 ? (
            <p className='px-3 py-3 text-sm text-[#9DA3A8]'>
              {query.trim() ? `No roles match "${query.trim()}"` : "Every role is already selected"}
            </p>
          ) : (
            suggestions.map(role => (
              <button
                key={role.id}
                type='button'
                className='w-full text-left px-3 py-2 text-sm text-[#344054] hover:bg-primary/5 hover:text-primary'
                onMouseDown={event => event.preventDefault()}
                onClick={() => select(role)}
              >
                {role.title}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SkillsetAutocomplete;
