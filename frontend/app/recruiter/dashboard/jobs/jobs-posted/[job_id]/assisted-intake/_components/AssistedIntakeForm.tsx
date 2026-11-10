"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Job } from "@/app/common/types";
import { resolveApplicationConfiguration, resolveScenarioConfiguration } from "@/app/common/utils/jobConfiguration";
import { submitAssistedApplication } from "@/app/common/services/jobs";

const inputClass = "h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal";

const AssistedIntakeForm = ({ job }: { job: Job }) => {
  const configuration = resolveApplicationConfiguration(job.application_configuration);
  const requirements = job.eligibility_requirements || [];
  const scenario = resolveScenarioConfiguration(job);
  const [values, setValues] = useState({
    full_name: "", phone_number: "", email: "", channel: "PHONE" as "PHONE" | "IN_PERSON" | "AGENT",
    additional_info: "", cover_letter: "", linkedin_url: "", scenario_response: "", intake_notes: "",
  });
  const [declarations, setDeclarations] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  // One key per entry: a double click or retry replays the first result instead of creating a second record.
  const idempotencyKey = useRef(crypto.randomUUID());
  const set = (key: keyof typeof values, value: string) => setValues(current => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consent) return toast.error("Confirm that the candidate agreed to this application");
    setSaving(true);
    const result = await submitAssistedApplication(job.public_id, {
      ...values,
      email: values.email.trim() || undefined,
      consent_confirmed: consent,
      eligibility_declarations: declarations,
    }, idempotencyKey.current);
    setSaving(false);
    if (!result.success) return toast.error(result.error || "Could not save the application");
    toast.success("Application entered");
    idempotencyKey.current = crypto.randomUUID();
    setValues({ full_name: "", phone_number: "", email: "", channel: values.channel, additional_info: "", cover_letter: "", linkedin_url: "", scenario_response: "", intake_notes: "" });
    setDeclarations({});
    setConsent(false);
  };

  return <form onSubmit={submit} className='flex max-w-2xl flex-col gap-4 rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-sm'>
    <div className='grid gap-3 md:grid-cols-2'>
      <label className='flex flex-col gap-1 text-sm font-medium'>Full name<input required value={values.full_name} onChange={event => set("full_name", event.target.value)} className={inputClass} /></label>
      <label className='flex flex-col gap-1 text-sm font-medium'>Phone number<input required value={values.phone_number} onChange={event => set("phone_number", event.target.value)} placeholder='+2348012345678' className={inputClass} /></label>
      <label className='flex flex-col gap-1 text-sm font-medium'>Email <span className='font-normal text-secondary-black'>(optional)</span><input type='email' value={values.email} onChange={event => set("email", event.target.value)} className={inputClass} /></label>
      <label className='flex flex-col gap-1 text-sm font-medium'>How did you take this application?<select value={values.channel} onChange={event => set("channel", event.target.value)} className={inputClass}><option value='PHONE'>Phone call</option><option value='IN_PERSON'>In person</option><option value='AGENT'>Recruiting agent</option></select></label>
    </div>
    {!values.email && <p className='rounded-lg bg-[#FFFAEB] p-3 text-xs text-[#B54708]'>Without an email address, emailed invitations (assessment, interview times) cannot reach this candidate. They will appear under &ldquo;Needs attention&rdquo; so you can phone them.</p>}
    {configuration.linkedin.enabled && <label className='flex flex-col gap-1 text-sm font-medium'>LinkedIn profile{configuration.linkedin.required ? "" : " (optional)"}<input type='url' required={configuration.linkedin.required} value={values.linkedin_url} onChange={event => set("linkedin_url", event.target.value)} className={inputClass} /></label>}
    {configuration.cover_letter.enabled && <label className='flex flex-col gap-1 text-sm font-medium'>Cover letter{configuration.cover_letter.required ? "" : " (optional)"}<textarea required={configuration.cover_letter.required} value={values.cover_letter} onChange={event => set("cover_letter", event.target.value)} className='min-h-20 rounded-lg border border-[#D0D5DD] p-3 text-sm font-normal' /></label>}
    {configuration.additional_info.enabled && <label className='flex flex-col gap-1 text-sm font-medium'>{configuration.additional_info.label}{configuration.additional_info.required ? "" : " (optional)"}<textarea required={configuration.additional_info.required} value={values.additional_info} onChange={event => set("additional_info", event.target.value)} className='min-h-20 rounded-lg border border-[#D0D5DD] p-3 text-sm font-normal' /></label>}
    {scenario.enabled && <label className='flex flex-col gap-1 text-sm font-medium'>{scenario.prompt}{scenario.required ? "" : " (optional)"}<textarea required={scenario.required} value={values.scenario_response} onChange={event => set("scenario_response", event.target.value)} className='min-h-24 rounded-lg border border-[#D0D5DD] p-3 text-sm font-normal' /></label>}
    {!!requirements.length && <fieldset className='flex flex-col gap-2 rounded-lg border border-[#EAECF0] p-3'><legend className='px-1 text-sm font-medium'>What the candidate told you</legend>{requirements.map(requirement => <label key={requirement.code} className='flex cursor-pointer items-start gap-2 text-sm'><input type='checkbox' checked={!!declarations[requirement.code]} onChange={event => setDeclarations(current => ({ ...current, [requirement.code]: event.target.checked }))} className='mt-0.5 h-4 w-4 accent-primary' /><span>{requirement.description}<span className='block text-xs text-secondary-black'>{requirement.required ? "Required – " : ""}A declaration is reviewed by your team; it is not verification.</span></span></label>)}</fieldset>}
    <label className='flex flex-col gap-1 text-sm font-medium'>Internal notes <span className='font-normal text-secondary-black'>(optional, not shown to the candidate)</span><textarea value={values.intake_notes} maxLength={1000} onChange={event => set("intake_notes", event.target.value)} className='min-h-16 rounded-lg border border-[#D0D5DD] p-3 text-sm font-normal' /></label>
    <label className='flex cursor-pointer items-start gap-2 rounded-lg bg-[#F9FAFB] p-3 text-sm'><input type='checkbox' checked={consent} onChange={event => setConsent(event.target.checked)} className='mt-0.5 h-4 w-4 accent-primary' /><span>I confirm this candidate asked me to apply for them, and agreed to be contacted about this job. My name is recorded against this entry.</span></label>
    <button type='submit' disabled={saving} className='inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60'>{saving ? <Loader2 className='h-4 w-4 animate-spin' /> : "Save application"}</button>
  </form>;
};

export default AssistedIntakeForm;
