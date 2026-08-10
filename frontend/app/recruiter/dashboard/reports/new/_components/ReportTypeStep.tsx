"use client";

import { cn } from "@/app/common/utils";
import { ReportType } from "@/app/common/types/reports.type";
import DateRangePicker, { Preset } from "../../_components/DateRangePicker";

const REPORT_TYPE_OPTIONS: { value: ReportType; label: string; description: string }[] = [
  { value: "SINGLE_ROLE", label: "Single role", description: "Performance data for one specific role" },
  { value: "MULTI_ROLE", label: "Multiple roles", description: "Compare selected roles side by side" },
  { value: "FULL_ACCOUNT", label: "Full account", description: "All roles in the selected period" },
];

const ReportTypeStep = ({
  reportType,
  onReportTypeChange,
  dateFrom,
  dateTo,
  onDateChange,
  preset,
  onPresetChange,
}: {
  reportType: ReportType | null;
  onReportTypeChange: (type: ReportType) => void;
  dateFrom: Date | null;
  dateTo: Date | null;
  onDateChange: (from: Date | null, to: Date | null) => void;
  preset: Preset;
  onPresetChange: (preset: Preset) => void;
}) => {
  return (
    <div className='flex flex-col gap-8'>
      <div role='radiogroup' aria-label='Report type' className='grid sm:grid-cols-3 gap-3'>
        {REPORT_TYPE_OPTIONS.map(option => (
          <label
            key={option.value}
            className={cn(
              "flex flex-col gap-1 rounded-xl border-2 p-4 cursor-pointer transition-colors duration-200 hover:border-primary/40",
              reportType === option.value ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='font-medium'>{option.label}</span>
              <input
                type='radio'
                name='report_type'
                value={option.value}
                checked={reportType === option.value}
                onChange={() => onReportTypeChange(option.value)}
                className='radio radio-primary radio-sm'
              />
            </div>
            <span className='text-xs text-muted-foreground'>{option.description}</span>
          </label>
        ))}
      </div>

      <div>
        <h3 className='font-medium mb-3'>Date range</h3>
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={onDateChange}
          activePreset={preset}
          onPresetChange={onPresetChange}
        />
      </div>
    </div>
  );
};

export default ReportTypeStep;
