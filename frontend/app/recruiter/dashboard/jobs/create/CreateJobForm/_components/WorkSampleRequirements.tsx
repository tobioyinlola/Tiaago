"use client";

import { Plus, Trash2 } from "lucide-react";

import { WorkSampleConfiguration, WorkSampleRubricCriterion } from "@/app/common/types";

const defaultRubric = { version: 1 as const, passing_score: 60, criteria: [] };

const distributeWeights = (criteria: WorkSampleRubricCriterion[]) => {
  if (!criteria.length) return criteria;
  const baseWeight = Math.floor(100 / criteria.length);
  const remainder = 100 % criteria.length;
  return criteria.map((criterion, index) => ({
    ...criterion,
    weight: baseWeight + (index < remainder ? 1 : 0),
  }));
};

const WorkSampleRequirements = ({
  configuration,
  onChange,
}: {
  configuration: WorkSampleConfiguration;
  onChange: (configuration: WorkSampleConfiguration) => void;
}) => {
  const rubric = configuration.rubric || defaultRubric;
  const updateRubric = (next: typeof rubric) => onChange({ ...configuration, rubric: next });
  const totalWeight = rubric.criteria.reduce((total, criterion) => total + (Number(criterion.weight) || 0), 0);

  return <section className='rounded-xl border border-[#D0D5DD] bg-white p-4'>
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

        <div className='rounded-lg border border-[#EAECF0] bg-[#FCFCFD] p-3'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h3 className='text-sm font-semibold text-primary-black'>Reviewer scorecard <span className='font-normal text-secondary-black'>(optional)</span></h3>
              <p className='mt-1 text-xs text-secondary-black'>Use up to six weighted criteria. Reviewers score each one from 0 to 5 before they can accept or decline a sample.</p>
            </div>
            <button
              type='button'
              disabled={rubric.criteria.length >= 6}
              onClick={() => updateRubric({ ...rubric, criteria: distributeWeights([...rubric.criteria, { label: "", description: "", weight: 100 }]) })}
              className='inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Plus className='h-4 w-4' /> Add criterion
            </button>
          </div>
          {!!rubric.criteria.length && <>
            <label className='mt-4 flex max-w-xs flex-col gap-1 text-sm font-medium text-primary-black'>
              Passing score (%)
              <input
                type='number'
                min={0}
                max={100}
                value={rubric.passing_score}
                onChange={event => updateRubric({ ...rubric, passing_score: Number(event.target.value) })}
                className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal'
              />
            </label>
            <div className='mt-3 flex flex-col gap-3'>
              {rubric.criteria.map((criterion, index) => <div key={criterion.code || index} className='grid gap-2 rounded-lg border border-[#EAECF0] bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_100px_auto] md:items-end'>
                <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Criterion
                  <input value={criterion.label} maxLength={120} onChange={event => {
                    const criteria = [...rubric.criteria];
                    criteria[index] = { ...criterion, label: event.target.value };
                    updateRubric({ ...rubric, criteria });
                  }} placeholder='e.g. Accuracy' className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' />
                </label>
                <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>What good looks like <span className='font-normal text-secondary-black'>(optional)</span>
                  <input value={criterion.description} maxLength={360} onChange={event => {
                    const criteria = [...rubric.criteria];
                    criteria[index] = { ...criterion, description: event.target.value };
                    updateRubric({ ...rubric, criteria });
                  }} placeholder='Describe what reviewers should look for' className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' />
                </label>
                <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Weight (%)
                  <input type='number' min={1} max={100} value={criterion.weight} onChange={event => {
                    const criteria = [...rubric.criteria];
                    criteria[index] = { ...criterion, weight: Number(event.target.value) };
                    updateRubric({ ...rubric, criteria });
                  }} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' />
                </label>
                <button type='button' aria-label={`Remove ${criterion.label || "criterion"}`} onClick={() => updateRubric({ ...rubric, criteria: distributeWeights(rubric.criteria.filter((_, itemIndex) => itemIndex !== index)) })} className='inline-flex h-10 items-center justify-center rounded-lg p-2 text-[#B42318] hover:bg-[#FEF3F2]'><Trash2 className='h-4 w-4' /></button>
              </div>)}
            </div>
            <p className={`mt-2 text-xs ${totalWeight === 100 ? "text-[#027A48]" : "text-[#B42318]"}`}>Criterion weights: {totalWeight}% {totalWeight === 100 ? "— ready to save" : "— must add up to 100%"}</p>
          </>}
        </div>
      </>}
    </div>
  </section>;
};

export default WorkSampleRequirements;
