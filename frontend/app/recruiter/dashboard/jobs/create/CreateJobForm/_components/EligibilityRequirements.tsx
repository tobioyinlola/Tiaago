"use client";

import { EligibilityRequirement } from "@/app/common/types";

const EligibilityRequirements = ({
  requirements,
  onChange,
}: {
  requirements: EligibilityRequirement[];
  onChange: (requirements: EligibilityRequirement[]) => void;
}) => {
  if (!requirements.length) return null;

  return (
    <section aria-labelledby='eligibility-requirements-heading' className='rounded-xl border border-[#D0D5DD] bg-white p-4'>
      <div className='mb-4'>
        <h2 id='eligibility-requirements-heading' className='text-base font-semibold text-primary-black'>
          Eligibility requirements
        </h2>
        <p className='mt-1 text-sm text-secondary-black'>
          Candidates declare these requirements when applying. A recruiter must still review the evidence before it passes.
        </p>
      </div>
      <div className='divide-y divide-[#EAECF0] rounded-lg border border-[#EAECF0]'>
        {requirements.map((requirement, index) => (
          <div key={requirement.code} className='flex items-center justify-between gap-4 p-3'>
            <div>
              <p className='text-sm font-medium text-primary-black'>{requirement.label}</p>
              <p className='mt-0.5 text-xs text-secondary-black'>{requirement.description}</p>
            </div>
            <label className='flex shrink-0 cursor-pointer items-center gap-2 text-sm text-primary-black'>
              <input
                type='checkbox'
                checked={requirement.required}
                onChange={event => {
                  const next = [...requirements];
                  next[index] = { ...requirement, required: event.target.checked };
                  onChange(next);
                }}
                className='h-4 w-4 rounded border-gray-300 accent-primary'
              />
              Required
            </label>
          </div>
        ))}
      </div>
    </section>
  );
};

export default EligibilityRequirements;
