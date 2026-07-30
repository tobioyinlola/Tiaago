"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/app/common/components/ui/switch";
import {
  CompanyInterviewSettingsData,
  getCompanyInterviewSettings,
  updateCompanyInterviewSettings,
} from "@/app/common/services/interview-settings";

const SettingRow = ({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className='flex items-center justify-between py-3 border-b border-[#EAECF0] last:border-none'>
    <div className='pr-4'>
      <p className='text-sm font-medium text-primaryBlack'>{label}</p>
      {description && <p className='text-xs text-secondary-black mt-0.5'>{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

const InterviewSettingsTab = () => {
  const [settings, setSettings] = useState<CompanyInterviewSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyInterviewSettings().then(res => {
      setLoading(false);
      if (res.success) setSettings(res.data);
      else toast.error(res.error);
    });
  }, []);

  const patch = async (payload: Partial<CompanyInterviewSettingsData>) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, ...payload });
    const res = await updateCompanyInterviewSettings(payload);
    if (!res.success) {
      setSettings(previous);
      toast.error(res.error);
      return;
    }
    setSettings(res.data);
  };

  if (loading) {
    return <p className='text-sm text-secondary-black'>Loading settings...</p>;
  }
  if (!settings) {
    return <p className='text-sm text-secondary-black'>Couldn&apos;t load interview settings.</p>;
  }

  return (
    <div className='max-w-2xl flex flex-col gap-8'>
      <section>
        <h3 className='text-sm font-semibold text-primaryBlack mb-1'>Recording</h3>
        <div className='bg-white border border-[#EAECF0] rounded-2lg px-4'>
          <SettingRow
            label='Enable recording by default'
            description='Pre-selects recording when a recruiter starts a new interview.'
            checked={settings.recording_enabled_default}
            onChange={v => patch({ recording_enabled_default: v })}
          />
          <div className='flex items-center justify-between py-3'>
            <div>
              <p className='text-sm font-medium text-primaryBlack'>Retention period</p>
              <p className='text-xs text-secondary-black mt-0.5'>How long recordings stay available.</p>
            </div>
            <select
              value={settings.recording_retention_days}
              onChange={e => patch({ recording_retention_days: Number(e.target.value) })}
              className='select select-sm select-bordered'
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h3 className='text-sm font-semibold text-primaryBlack mb-1'>AI Copilot</h3>
        <div className='bg-white border border-[#EAECF0] rounded-2lg px-4'>
          <SettingRow
            label='Enable AI Copilot'
            description='Turns the whole live-interview AI experience on or off for this organisation.'
            checked={settings.ai_copilot_enabled}
            onChange={v => patch({ ai_copilot_enabled: v })}
          />
          <SettingRow
            label='Live transcription'
            checked={settings.copilot_live_transcription_enabled}
            onChange={v => patch({ copilot_live_transcription_enabled: v })}
            disabled={!settings.ai_copilot_enabled}
          />
          <SettingRow
            label='Live suggestions'
            checked={settings.copilot_suggestions_enabled}
            onChange={v => patch({ copilot_suggestions_enabled: v })}
            disabled={!settings.ai_copilot_enabled}
          />
          <SettingRow
            label='Evidence capture'
            checked={settings.copilot_evidence_capture_enabled}
            onChange={v => patch({ copilot_evidence_capture_enabled: v })}
            disabled={!settings.ai_copilot_enabled}
          />
          <SettingRow
            label='Post-interview AI summary'
            checked={settings.copilot_post_interview_summary_enabled}
            onChange={v => patch({ copilot_post_interview_summary_enabled: v })}
            disabled={!settings.ai_copilot_enabled}
          />
        </div>
      </section>

      <section>
        <h3 className='text-sm font-semibold text-primaryBlack mb-1'>Defaults</h3>
        <div className='bg-white border border-[#EAECF0] rounded-2lg px-4'>
          <div className='flex items-center justify-between py-3'>
            <p className='text-sm font-medium text-primaryBlack'>Default interview duration</p>
            <select
              value={settings.default_duration_minutes}
              onChange={e => patch({ default_duration_minutes: Number(e.target.value) })}
              className='select select-sm select-bordered'
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h3 className='text-sm font-semibold text-primaryBlack mb-1'>Notifications</h3>
        <div className='bg-white border border-[#EAECF0] rounded-2lg px-4'>
          <SettingRow
            label='Interview reminders'
            checked={settings.notify_recruiter_reminder}
            onChange={v => patch({ notify_recruiter_reminder: v })}
          />
          <SettingRow
            label='Summary ready'
            checked={settings.notify_recruiter_summary_ready}
            onChange={v => patch({ notify_recruiter_summary_ready: v })}
          />
          <SettingRow
            label='Candidate feedback sent'
            checked={settings.notify_candidate_feedback_sent}
            onChange={v => patch({ notify_candidate_feedback_sent: v })}
          />
        </div>
      </section>
    </div>
  );
};

export default InterviewSettingsTab;
