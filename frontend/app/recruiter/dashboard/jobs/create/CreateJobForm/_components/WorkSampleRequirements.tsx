"use client";

import { WorkSampleConfiguration } from "@/app/common/types";

const WorkSampleRequirements = ({
  configuration,
  onChange,
}: {
  configuration: WorkSampleConfiguration;
  onChange: (configuration: WorkSampleConfiguration) => void;
}) => (
  <section className='rounded-xl border border-[#D0D5DD] bg-white p-4'>
    <div className='mb-4'>
      <h2 className='text-base font-semibold text-primary-black'>Work sample</h2>
      <p className='mt-1 text-sm text-secondary-black'>
        Request a short role-relevant sample. Candidates can upload a PDF, DOCX, XLSX, or CSV file up to 10MB; a recruiter must review it before the candidate progresses.
      </p>
    </div>
    <div className='flex flex-col gap-4 rounded-lg border border-[#EAECF0] p-3'>
      <div className='flex flex-wrap items-center gap-5'>
        <label className='flex cursor-pointer items-center gap-2 text-sm text-primary-black'>
          <input
            type='checkbox'
            checked={configuration.enabled}
            onChange={event => onChange({
              ...configuration,
              enabled: event.target.checked,
              required: event.target.checked ? configuration.required : false,
            })}
            className='h-4 w-4 rounded border-gray-300 accent-primary'
          />
          Request a work sample
        </label>
        <label className='flex cursor-pointer items-center gap-2 text-sm text-primary-black'>
          <input
            type='checkbox'
            checked={configuration.required}
            disabled={!configuration.enabled}
            onChange={event => onChange({ ...configuration, required: event.target.checked })}
            className='h-4 w-4 rounded border-gray-300 accent-primary disabled:cursor-not-allowed disabled:opacity-50'
          />
          Required before progression
        </label>
      </div>
      {configuration.enabled && <>
        <label className='flex flex-col gap-1.5 text-sm font-medium text-primary-black'>
          Candidate prompt
          <textarea
            value={configuration.prompt}
            maxLength={800}
            onChange={event => onChange({ ...configuration, prompt: event.target.value })}
            placeholder='For example: upload a redacted inventory-reconciliation worksheet or a short operational improvement proposal.'
            className='min-h-20 rounded-lg border border-[#D0D5DD] p-3 text-sm font-normal outline-none focus:border-primary'
          />
        </label>
        <label className='flex flex-col gap-1.5 text-sm font-medium text-primary-black'>
          Instructions <span className='font-normal text-secondary-black'>(optional)</span>
          <textarea
            value={configuration.instructions}
            maxLength={1200}
            onChange={event => onChange({ ...configuration, instructions: event.target.value })}
            placeholder='Explain the scope, expected format, and what must not be included.'
            className='min-h-20 rounded-lg border border-[#D0D5DD] p-3 text-sm font-normal outline-none focus:border-primary'
          />
        </label>
      </>}
    </div>
  </section>
);

export default WorkSampleRequirements;
