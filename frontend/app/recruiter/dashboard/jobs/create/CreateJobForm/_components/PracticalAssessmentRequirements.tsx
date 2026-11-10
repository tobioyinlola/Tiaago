"use client";

import { Plus, Trash2 } from "lucide-react";

import { DEFAULT_PRACTICAL_POLICY, PracticalAssessmentConfiguration, WorkSampleRubricCriterion } from "@/app/common/types";

const distributeWeights = (criteria: WorkSampleRubricCriterion[]) => {
  if (!criteria.length) return criteria;
  const base = Math.floor(100 / criteria.length);
  const remainder = 100 % criteria.length;
  return criteria.map((criterion, index) => ({ ...criterion, weight: base + (index < remainder ? 1 : 0) }));
};

const PracticalAssessmentRequirements = ({ configuration, onChange }: {
  configuration: PracticalAssessmentConfiguration;
  onChange: (configuration: PracticalAssessmentConfiguration) => void;
}) => {
  const rubric = configuration.rubric || { version: 1 as const, passing_score: 60, criteria: [] };
  const updateRubric = (next: typeof rubric) => onChange({ ...configuration, rubric: next });
  const policy = { ...DEFAULT_PRACTICAL_POLICY, ...(configuration.policy || {}) };
  const updatePolicy = (change: Partial<typeof policy>) => onChange({ ...configuration, policy: { ...policy, ...change } });
  const totalWeight = rubric.criteria.reduce((sum, criterion) => sum + (Number(criterion.weight) || 0), 0);

  return <section className='rounded-xl border border-[#D0D5DD] bg-white p-4'>
    <div className='mb-4'>
      <h2 className='text-base font-semibold text-primary-black'>Observed practical assessment</h2>
      <p className='mt-1 text-sm text-secondary-black'>Use this for real-world capability that needs a human observation, such as driving, equipment operation, field safety, or shift work. Tiaago records the assessor’s decision; it does not certify a licence or qualification.</p>
    </div>
    <div className='flex flex-col gap-4 rounded-lg border border-[#EAECF0] p-3'>
      <div className='flex flex-wrap items-center gap-5'>
        <label className='flex cursor-pointer items-center gap-2 text-sm text-primary-black'><input type='checkbox' checked={configuration.enabled} onChange={event => onChange({ ...configuration, enabled: event.target.checked, required: event.target.checked ? configuration.required : false })} className='h-4 w-4 rounded border-gray-300 accent-primary' /> Require an observed assessment</label>
        <label className='flex cursor-pointer items-center gap-2 text-sm text-primary-black'><input type='checkbox' checked={configuration.required} disabled={!configuration.enabled} onChange={event => onChange({ ...configuration, required: event.target.checked })} className='h-4 w-4 rounded border-gray-300 accent-primary disabled:cursor-not-allowed disabled:opacity-50' /> Required before progression</label>
      </div>
      {configuration.enabled && <>
        <div className='grid gap-3 md:grid-cols-2'>
          <label className='flex flex-col gap-1.5 text-sm font-medium text-primary-black'>Assessment title<input value={configuration.title} maxLength={120} onChange={event => onChange({ ...configuration, title: event.target.value })} placeholder='e.g. Safe road assessment' className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label>
          <label className='flex flex-col gap-1.5 text-sm font-medium text-primary-black'>Instructions <span className='font-normal text-secondary-black'>(optional)</span><input value={configuration.instructions} maxLength={1200} onChange={event => onChange({ ...configuration, instructions: event.target.value })} placeholder='State what the candidate should bring or prepare.' className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label>
        </div>
        <div className='rounded-lg border border-[#EAECF0] bg-[#FCFCFD] p-3'>
          <h3 className='text-sm font-semibold text-primary-black'>Booking, attempts and no-shows</h3>
          <p className='mt-1 text-xs text-secondary-black'>These rules apply to everyone who books, whether the candidate books online or your team does. Your team can exceed the attempt or retest limit only by recording a reason.</p>
          <div className='mt-3 grid gap-3 md:grid-cols-3'>
            <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Maximum attempts<input type='number' min={1} max={5} value={policy.max_attempts} onChange={event => updatePolicy({ max_attempts: Number(event.target.value) })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label>
            <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Wait before a retest (days)<input type='number' min={0} max={90} value={policy.retest_wait_days} onChange={event => updatePolicy({ retest_wait_days: Number(event.target.value) })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label>
            <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Candidate can cancel until (hours before)<input type='number' min={0} max={168} value={policy.cancellation_cutoff_hours} onChange={event => updatePolicy({ cancellation_cutoff_hours: Number(event.target.value) })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label>
          </div>
          <div className='mt-3 flex flex-wrap gap-5'>
            <label className='flex cursor-pointer items-center gap-2 text-sm text-primary-black'><input type='checkbox' checked={policy.self_booking} onChange={event => updatePolicy({ self_booking: event.target.checked })} className='h-4 w-4 rounded border-gray-300 accent-primary' /> Let candidates book their own slot</label>
            <label className='flex cursor-pointer items-center gap-2 text-sm text-primary-black'><input type='checkbox' checked={policy.no_show_counts_as_attempt} onChange={event => updatePolicy({ no_show_counts_as_attempt: event.target.checked })} className='h-4 w-4 rounded border-gray-300 accent-primary' /> A no-show uses up an attempt</label>
          </div>
        </div>
        <div className='rounded-lg border border-[#EAECF0] bg-[#FCFCFD] p-3'>
          <div className='flex flex-wrap items-start justify-between gap-3'><div><h3 className='text-sm font-semibold text-primary-black'>Assessor scorecard</h3><p className='mt-1 text-xs text-secondary-black'>Add at least one clear, observable criterion. Assessors can record a critical failure that always results in a fail.</p></div><button type='button' disabled={rubric.criteria.length >= 6} onClick={() => updateRubric({ ...rubric, criteria: distributeWeights([...rubric.criteria, { label: "", description: "", weight: 100 }]) })} className='inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary disabled:opacity-50'><Plus className='h-4 w-4' /> Add criterion</button></div>
          {!!rubric.criteria.length && <><label className='mt-3 flex max-w-xs flex-col gap-1 text-sm font-medium text-primary-black'>Passing score (%)<input type='number' min={0} max={100} value={rubric.passing_score} onChange={event => updateRubric({ ...rubric, passing_score: Number(event.target.value) })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label><div className='mt-3 flex flex-col gap-2'>{rubric.criteria.map((criterion, index) => <div key={criterion.code || index} className='grid gap-2 rounded-lg border border-[#EAECF0] bg-white p-3 md:grid-cols-[1fr_1.4fr_100px_auto] md:items-end'><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Criterion<input value={criterion.label} maxLength={120} onChange={event => { const criteria = [...rubric.criteria]; criteria[index] = { ...criterion, label: event.target.value }; updateRubric({ ...rubric, criteria }); }} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>What good looks like<input value={criterion.description} maxLength={360} onChange={event => { const criteria = [...rubric.criteria]; criteria[index] = { ...criterion, description: event.target.value }; updateRubric({ ...rubric, criteria }); }} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Weight (%)<input type='number' min={1} max={100} value={criterion.weight} onChange={event => { const criteria = [...rubric.criteria]; criteria[index] = { ...criterion, weight: Number(event.target.value) }; updateRubric({ ...rubric, criteria }); }} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label><button type='button' aria-label={`Remove ${criterion.label || "criterion"}`} onClick={() => updateRubric({ ...rubric, criteria: distributeWeights(rubric.criteria.filter((_, itemIndex) => itemIndex !== index)) })} className='inline-flex h-10 items-center justify-center rounded-lg p-2 text-[#B42318] hover:bg-[#FEF3F2]'><Trash2 className='h-4 w-4' /></button></div>)}</div><p className={`mt-2 text-xs ${totalWeight === 100 ? "text-[#027A48]" : "text-[#B42318]"}`}>Criterion weights: {totalWeight}% {totalWeight === 100 ? "— ready to save" : "— must add up to 100%"}</p></>}
        </div>
      </>}
    </div>
  </section>;
};

export default PracticalAssessmentRequirements;
