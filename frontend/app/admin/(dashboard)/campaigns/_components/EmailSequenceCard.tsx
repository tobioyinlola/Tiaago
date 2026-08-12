"use client";

import { CampaignEmail, CONDITION_LABELS, ConditionType, EmailTemplate, SendDelayType } from "@/app/common/types/campaigns.type";
import TemplateThumbnail from "./TemplateThumbnail";

const DelayConnector = ({
  step,
  disabled,
  onChange,
}: {
  step: CampaignEmail;
  disabled: boolean;
  onChange: (patch: { send_delay_type?: SendDelayType; send_delay_hours?: number; send_delay_days?: number; condition_type?: ConditionType }) => void;
}) => {
  const isDelayed = step.send_delay_type === "DELAY_AFTER_PREVIOUS";
  return (
    <div className="ml-6 flex items-center gap-3 border-l-2 border-dashed border-[#E0E0E0] py-3 pl-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex overflow-hidden rounded-md border border-[#E0E0E0]">
          <button
            type="button"
            disabled={disabled}
            className={`px-2.5 py-1 ${!isDelayed ? "bg-[#1A3C5E] text-white" : "bg-white text-[#444444]"}`}
            onClick={() => onChange({ send_delay_type: "IMMEDIATELY" })}
          >
            Immediately
          </button>
          <button
            type="button"
            disabled={disabled}
            className={`px-2.5 py-1 ${isDelayed ? "bg-[#1A3C5E] text-white" : "bg-white text-[#444444]"}`}
            onClick={() => onChange({ send_delay_type: "DELAY_AFTER_PREVIOUS", send_delay_days: step.send_delay_days ?? 1 })}
          >
            After a delay
          </button>
        </div>
        {isDelayed && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              disabled={disabled}
              className="input input-bordered input-xs w-14 border-[#E0E0E0]"
              value={step.send_delay_days ?? 0}
              onChange={e => onChange({ send_delay_days: Math.max(0, Number(e.target.value)) })}
            />
            <span className="text-[#9E9E9E]">days</span>
            <input
              type="number"
              min={0}
              max={23}
              disabled={disabled}
              className="input input-bordered input-xs w-14 border-[#E0E0E0]"
              value={step.send_delay_hours ?? 0}
              onChange={e => onChange({ send_delay_hours: Math.max(0, Number(e.target.value)) })}
            />
            <span className="text-[#9E9E9E]">hrs</span>
          </div>
        )}
        <select
          disabled={disabled}
          className="select select-bordered select-xs border-[#E0E0E0]"
          value={step.condition_type}
          onChange={e => onChange({ condition_type: e.target.value as ConditionType })}
        >
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const EmailSequenceCard = ({
  step,
  template,
  disabled,
  onEdit,
  onRemove,
  onDelayChange,
}: {
  step: CampaignEmail;
  template: EmailTemplate | null;
  disabled: boolean;
  onEdit: () => void;
  onRemove?: () => void;
  onDelayChange: (patch: { send_delay_type?: SendDelayType; send_delay_hours?: number; send_delay_days?: number; condition_type?: ConditionType }) => void;
}) => (
  <div>
    {step.sequence_number > 1 && <DelayConnector step={step} disabled={disabled} onChange={onDelayChange} />}
    <div className="flex gap-4 rounded-lg border border-[#E0E0E0] p-4">
      <div className="w-28 shrink-0 overflow-hidden rounded-md border border-[#E0E0E0]">
        <TemplateThumbnail html={template?.html_body ?? ""} heightClassName="h-20" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#EAF0F6] px-2 py-0.5 text-[10px] font-semibold text-[#1A3C5E]">
            Email {step.sequence_number}
          </span>
          {step.status === "SENT" && (
            <span className="text-[10px] font-medium text-[#1D9E75]">Sent &middot; {step.total_sent} delivered</span>
          )}
          {step.status === "SENDING" && <span className="text-[10px] font-medium text-[#9E9E9E]">Sending...</span>}
        </div>
        <p className="mt-1 truncate text-sm font-medium text-[#444444]">
          {step.subject || template?.subject_line || "No subject set"}
        </p>
        <p className="truncate text-xs text-[#9E9E9E]">{template?.name ?? "No template selected"}</p>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" className="text-xs font-medium text-[#1A3C5E] hover:underline" disabled={disabled} onClick={onEdit}>
            Edit content
          </button>
          {onRemove && (
            <button type="button" className="text-xs font-medium text-[#9E9E9E] hover:text-[#444444]" disabled={disabled} onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default EmailSequenceCard;
