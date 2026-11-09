"use client";

import { HiringProfile } from "@/app/common/types";
import { cn } from "@/app/common/utils";

const HiringProfilePicker = ({
  profiles,
  value,
  onChange,
}: {
  profiles: HiringProfile[];
  value: string;
  onChange: (value: string) => void;
}) => {
  if (!profiles.length) return null;

  return (
    <section aria-labelledby='hiring-profile-heading' className='rounded-xl border border-[#D0D5DD] bg-[#FCFCFD] p-4'>
      <div className='mb-4'>
        <h2 id='hiring-profile-heading' className='text-base font-semibold text-primary-black'>
          Hiring profile <span className='text-secondary-black font-normal'>(optional)</span>
        </h2>
        <p className='mt-1 text-sm text-secondary-black'>
          Choose a starting point that matches the kind of role you are hiring for. Your title and
          job requirements stay fully editable.
        </p>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
        <button
          type='button'
          aria-pressed={!value}
          onClick={() => onChange("")}
          className={cn(
            "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            !value
              ? "border-primary bg-primary/5"
              : "border-[#EAECF0] bg-white hover:border-primary/60"
          )}
        >
          <span className='block text-sm font-semibold text-primary-black'>Standard job setup</span>
          <span className='mt-1 block text-xs text-secondary-black'>Use the existing Tiaago hiring flow.</span>
        </button>
        {profiles.map(profile => {
          const selected = profile.code === value;
          return (
            <button
              key={profile.code}
              type='button'
              aria-pressed={selected}
              onClick={() => onChange(profile.code)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-[#EAECF0] bg-white hover:border-primary/60"
              )}
            >
              <span className='block text-sm font-semibold text-primary-black'>{profile.name}</span>
              <span className='mt-1 block text-xs leading-5 text-secondary-black'>{profile.summary}</span>
              <span className='mt-2 block text-xs font-medium text-primary'>
                {profile.industry_context || profile.role_family}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default HiringProfilePicker;
