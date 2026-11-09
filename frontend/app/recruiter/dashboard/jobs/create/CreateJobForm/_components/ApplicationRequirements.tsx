"use client";

import { ApplicationConfiguration } from "@/app/common/types";

const FIELD_COPY: Array<{
  key: keyof Pick<ApplicationConfiguration, "resume" | "linkedin" | "cover_letter" | "additional_info">;
  label: string;
  description: string;
}> = [
  {
    key: "resume",
    label: "CV / resume",
    description: "Allow candidates to attach a CV or resume.",
  },
  {
    key: "linkedin",
    label: "LinkedIn profile",
    description: "Ask candidates for a LinkedIn profile URL.",
  },
  {
    key: "cover_letter",
    label: "Cover letter",
    description: "Ask candidates why they are a fit for this role.",
  },
  {
    key: "additional_info",
    label: "Additional question",
    description: "Ask one short role-specific question in the application.",
  },
];

const ApplicationRequirements = ({
  configuration,
  onChange,
}: {
  configuration: ApplicationConfiguration;
  onChange: (configuration: ApplicationConfiguration) => void;
}) => {
  const updateField = (
    key: (typeof FIELD_COPY)[number]["key"],
    changes: Partial<ApplicationConfiguration[typeof key]>
  ) => {
    onChange({
      ...configuration,
      [key]: { ...configuration[key], ...changes },
    });
  };

  return (
    <section aria-labelledby='application-requirements-heading' className='rounded-xl border border-[#D0D5DD] bg-white p-4'>
      <div className='mb-4'>
        <h2 id='application-requirements-heading' className='text-base font-semibold text-primary-black'>
          Candidate application
        </h2>
        <p className='mt-1 text-sm text-secondary-black'>
          Choose the evidence candidates provide when they apply. Required fields are checked by the server.
        </p>
      </div>

      <div className='divide-y divide-[#EAECF0] rounded-lg border border-[#EAECF0]'>
        {FIELD_COPY.map(({ key, label, description }) => {
          const field = configuration[key];
          return (
            <div key={key} className='p-3 sm:flex sm:items-center sm:justify-between sm:gap-4'>
              <div>
                <p className='text-sm font-medium text-primary-black'>{label}</p>
                <p className='mt-0.5 text-xs text-secondary-black'>{description}</p>
              </div>
              <div className='mt-3 flex items-center gap-4 sm:mt-0'>
                <label className='flex cursor-pointer items-center gap-2 text-sm text-primary-black'>
                  <input
                    type='checkbox'
                    checked={field.enabled}
                    onChange={event => updateField(key, {
                      enabled: event.target.checked,
                      required: event.target.checked ? field.required : false,
                    })}
                    className='h-4 w-4 rounded border-gray-300 accent-primary'
                  />
                  Include
                </label>
                <label className='flex cursor-pointer items-center gap-2 text-sm text-primary-black'>
                  <input
                    type='checkbox'
                    checked={field.required}
                    disabled={!field.enabled}
                    onChange={event => updateField(key, { required: event.target.checked })}
                    className='h-4 w-4 rounded border-gray-300 accent-primary disabled:cursor-not-allowed disabled:opacity-50'
                  />
                  Required
                </label>
              </div>
              {key === "additional_info" && configuration.additional_info.enabled && (
                <label className='mt-3 block sm:col-span-2'>
                  <span className='text-xs font-medium text-secondary-black'>Question candidates see</span>
                  <input
                    value={configuration.additional_info.label}
                    maxLength={120}
                    onChange={event => onChange({
                      ...configuration,
                      additional_info: { ...configuration.additional_info, label: event.target.value },
                    })}
                    className='mt-1 h-10 w-full rounded-lg border border-[#D0D5DD] px-3 text-sm text-primary-black outline-none focus:border-primary'
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ApplicationRequirements;
