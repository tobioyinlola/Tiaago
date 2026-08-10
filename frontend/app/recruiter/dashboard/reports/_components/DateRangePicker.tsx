"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { cn } from "@/app/common/utils";

type Preset = "30d" | "90d" | "6m" | "1y" | "custom";

const PRESETS: { key: Preset; label: string; days?: number; months?: number }[] = [
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "6m", label: "Last 6 months", months: 6 },
  { key: "1y", label: "Last year", months: 12 },
  { key: "custom", label: "Custom" },
];

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const subtractDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - days);
  return copy;
};

const subtractMonths = (d: Date, months: number) => {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() - months);
  return copy;
};

// Mirrors the react-datepicker wrapping convention in DateTimePicker.tsx --
// extended here with selectsRange (installed, just not used elsewhere yet)
// plus a quick-select preset row, since no existing component covers that.
const DateRangePicker = ({
  from,
  to,
  onChange,
  activePreset,
  onPresetChange,
}: {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
  activePreset: Preset;
  onPresetChange: (preset: Preset) => void;
}) => {
  const applyPreset = (preset: Preset) => {
    onPresetChange(preset);
    if (preset === "custom") return;
    const today = startOfDay(new Date());
    const presetDef = PRESETS.find(p => p.key === preset);
    const start = presetDef?.days
      ? subtractDays(today, presetDef.days)
      : subtractMonths(today, presetDef?.months ?? 0);
    onChange(start, today);
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap gap-2'>
        {PRESETS.map(preset => (
          <button
            key={preset.key}
            type='button'
            onClick={() => applyPreset(preset.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              activePreset === preset.key
                ? "bg-primary text-white border-primary"
                : "bg-white text-secondary-black border-[#EAECF0] hover:border-primary/40"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <DatePicker
        selectsRange
        startDate={from}
        endDate={to}
        onChange={(dates: [Date | null, Date | null]) => {
          onPresetChange("custom");
          onChange(dates[0], dates[1]);
        }}
        maxDate={new Date()}
        dateFormat='MMM d, yyyy'
        placeholderText='Select a date range'
        className='w-full bg-white input input-bordered border-[#D0D5DD]'
        isClearable
      />
    </div>
  );
};

export default DateRangePicker;
export type { Preset };
