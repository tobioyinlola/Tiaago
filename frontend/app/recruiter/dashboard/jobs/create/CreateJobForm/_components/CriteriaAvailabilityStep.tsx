"use client";

import { FormikErrors, FormikTouched } from "formik";

import { cn } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { Switch } from "@/app/common/components/ui/switch";
import { CriteriaAvailabilityFormValues } from "../wizard.constants";
import { DAY_LABELS, TIME_OPTIONS } from "./availability";

const AI_INTERVIEW_DURATION_OPTIONS = [5, 8, 10] as const;
const INTERVIEW_DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;
const INTERVIEW_TYPE_OPTIONS = [
  { value: "IN_HOUSE", label: "In-app", hint: "Tiaago hosts the call. Nothing to set up." },
  { value: "GOOGLE_MEET", label: "Google Meet", hint: "You provide the meeting link." },
  { value: "ZOOM", label: "Zoom", hint: "You provide the meeting link." },
  { value: "OTHER", label: "Other", hint: "Any other platform. You provide the link." },
] as const;
const AI_INTERVIEW_QUESTIONS_OPTIONS = [4, 5, 6] as const;
const AI_INTERVIEW_WINDOW_OPTIONS = [48, 72] as const;

const OptionButtonGroup = ({
  options,
  value,
  onSelect,
  formatLabel,
}: {
  options: readonly number[];
  value: number;
  onSelect: (option: number) => void;
  formatLabel: (option: number) => string;
}) => (
  <div className='flex flex-wrap gap-2'>
    {options.map(option => (
      <button
        key={option}
        type='button'
        onClick={() => onSelect(option)}
        className={cn(
          "h-11 px-4 rounded-lg border text-sm font-medium transition-colors",
          value === option
            ? "bg-primary border-primary text-white"
            : "border-[#EAECF0] text-secondary-black hover:border-primary hover:text-primary"
        )}
      >
        {formatLabel(option)}
      </button>
    ))}
  </div>
);

const CriteriaAvailabilityStep = ({
  values,
  errors,
  touched,
  setFieldValue,
}: {
  values: CriteriaAvailabilityFormValues;
  errors: FormikErrors<CriteriaAvailabilityFormValues>;
  touched: FormikTouched<CriteriaAvailabilityFormValues>;
  setFieldValue: (field: string, value: any) => void;
}) => {
  const availability = values.interview_availability;
  const selectedDays = availability.days_of_week || [];

  const toggleDay = (day: number) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day].sort();
    setFieldValue("interview_availability.days_of_week", next);
  };

  const availabilityErrors = errors.interview_availability as
    | FormikErrors<CriteriaAvailabilityFormValues["interview_availability"]>
    | undefined;
  const availabilityTouched = touched.interview_availability;
  const daysError =
    typeof availabilityErrors?.days_of_week === "string" ? availabilityErrors.days_of_week : undefined;

  return (
    <div className='space-y-10'>
      <div>
        <h3 className='text-base font-bold text-primary-black pb-3 border-b border-[#EAECF0] mb-1'>
          Screening criteria
        </h3>
        <p className='text-sm text-secondary-black mb-4'>
          Set the minimum resume-screening match percentage a candidate must reach to
          automatically progress to the assessment stage.
        </p>
        <div className='md:w-[48%]'>
          <FormikField
            name='screening_threshold'
            label='Minimum resume match (%)'
            type='number'
            placeholder='e.g. 70'
            value={values.screening_threshold}
            error={errors.screening_threshold}
            touched={touched.screening_threshold}
          />
        </div>
      </div>

      <div>
        <h3 className='text-base font-bold text-primary-black pb-3 border-b border-[#EAECF0] mb-1'>
          Interview invitation criteria
        </h3>
        <p className='text-sm text-secondary-black mb-4'>
          Set the minimum assessment score a candidate must reach to be invited to pick
          a post-assessment interview slot.
        </p>
        <div className='md:w-[48%]'>
          <FormikField
            name='passing_grade'
            label='Minimum assessment score (%)'
            type='number'
            placeholder='e.g. 70'
            value={values.passing_grade}
            error={errors.passing_grade}
            touched={touched.passing_grade}
          />
        </div>
      </div>

      <div>
        <h3 className='text-base font-bold text-primary-black pb-3 border-b border-[#EAECF0] mb-1'>
          AI interview
        </h3>
        <p className='text-sm text-secondary-black mb-4'>
          Let Alex, our AI interviewer, conduct a short voice interview with every candidate who
          passes the assessment -- no scheduling needed. Turn this off to keep sending your own
          post-assessment interview link instead.
        </p>

        <label className='flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-[#EAECF0] p-4'>
          <span className='text-sm font-medium text-primary-black'>Enable AI interview</span>
          <Switch
            checked={values.ai_interview_enabled}
            onCheckedChange={checked => setFieldValue("ai_interview_enabled", checked)}
          />
        </label>

        {values.ai_interview_enabled && (
          <div className='flex flex-col gap-5 rounded-lg border border-[#EAECF0] p-4 mt-4'>
            <div>
              <p className='text-sm font-medium text-primary-black mb-2'>Duration</p>
              <OptionButtonGroup
                options={AI_INTERVIEW_DURATION_OPTIONS}
                value={values.ai_interview_duration_minutes}
                onSelect={option => setFieldValue("ai_interview_duration_minutes", option)}
                formatLabel={option => `${option} min`}
              />
            </div>
            <div>
              <p className='text-sm font-medium text-primary-black mb-2'>Questions</p>
              <OptionButtonGroup
                options={AI_INTERVIEW_QUESTIONS_OPTIONS}
                value={values.ai_interview_questions_count}
                onSelect={option => setFieldValue("ai_interview_questions_count", option)}
                formatLabel={option => `${option} questions`}
              />
            </div>
            <div>
              <p className='text-sm font-medium text-primary-black mb-2'>
                Window to complete the interview
              </p>
              <OptionButtonGroup
                options={AI_INTERVIEW_WINDOW_OPTIONS}
                value={values.ai_interview_window_hours}
                onSelect={option => setFieldValue("ai_interview_window_hours", option)}
                formatLabel={option => `${option} hours`}
              />
            </div>
            <div className='md:w-[48%]'>
              <FormikField
                name='ai_interview_pass_mark'
                label='Minimum AI interview score (%)'
                type='number'
                placeholder='e.g. 70'
                value={values.ai_interview_pass_mark}
                error={errors.ai_interview_pass_mark}
                touched={touched.ai_interview_pass_mark}
              />
              <p className='text-xs text-secondary-black mt-1'>
                Candidates who reach this score are invited to pick a human interview slot.
                Anyone below it waits for your review.
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className='text-base font-bold text-primary-black pb-3 border-b border-[#EAECF0] mb-1'>
          Human interview
        </h3>
        <p className='text-sm text-secondary-black mb-4'>
          {values.ai_interview_enabled
            ? "Candidates who pass the AI interview above pick one of these slots for a real interview with you."
            : "Pick the days and hours you're generally available to interview candidates. These only become visible to candidates once they pass the assessment stage."}
        </p>

        <div className='rounded-lg border border-[#EAECF0] p-4 mb-4'>
          <p className='text-sm font-medium text-primary-black mb-2'>Where the interview happens</p>
          <div className='flex flex-wrap gap-2'>
            {INTERVIEW_TYPE_OPTIONS.map(option => (
              <button
                key={option.value}
                type='button'
                aria-pressed={values.interview_type === option.value}
                onClick={() => {
                  setFieldValue("interview_type", option.value);
                  if (option.value === "IN_HOUSE") setFieldValue("interview_meeting_url", "");
                }}
                className={cn(
                  "h-11 rounded-lg border px-4 text-sm font-medium transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  values.interview_type === option.value
                    ? "bg-primary border-primary text-white"
                    : "border-[#EAECF0] text-secondary-black hover:border-primary hover:text-primary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className='text-xs text-secondary-black mt-2'>
            {INTERVIEW_TYPE_OPTIONS.find(o => o.value === values.interview_type)?.hint}
          </p>

          {values.interview_type !== "IN_HOUSE" && (
            <div className='mt-4 md:w-[70%]'>
              <FormikField
                name='interview_meeting_url'
                label='Meeting link'
                placeholder='https://meet.google.com/... or https://zoom.us/j/...'
                value={values.interview_meeting_url}
                error={errors.interview_meeting_url}
                touched={touched.interview_meeting_url}
              />
            </div>
          )}

          <p className='text-sm font-medium text-primary-black mt-5 mb-2'>Interview length</p>
          <OptionButtonGroup
            options={INTERVIEW_DURATION_OPTIONS}
            value={values.interview_duration_minutes}
            onSelect={option => setFieldValue("interview_duration_minutes", option)}
            formatLabel={option => `${option} min`}
          />
        </div>

        <div className='rounded-lg border border-[#EAECF0] p-4'>
          <p className='text-sm font-medium text-primary-black mb-2'>Available days</p>
          <div className='flex flex-wrap gap-2 mb-5'>
            {DAY_LABELS.map((label, day) => (
              <button
                key={label}
                type='button'
                onClick={() => toggleDay(day)}
                className={cn(
                  "h-11 w-14 rounded-lg border text-sm font-medium transition-colors",
                  selectedDays.includes(day)
                    ? "bg-primary border-primary text-white"
                    : "border-[#EAECF0] text-secondary-black hover:border-primary hover:text-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <p className='text-sm font-medium text-primary-black mb-2'>Available hours</p>
          <div className='flex items-center gap-3'>
            <select
              className='select select-bordered h-11 w-full sm:w-[150px]'
              value={availability.start_time}
              onChange={e => setFieldValue("interview_availability.start_time", e.target.value)}
            >
              {TIME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className='text-secondary-black'>-</span>
            <select
              className='select select-bordered h-11 w-full sm:w-[150px]'
              value={availability.end_time}
              onChange={e => setFieldValue("interview_availability.end_time", e.target.value)}
            >
              {TIME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {daysError && availabilityTouched?.days_of_week && (
          <p className='text-xs text-error mt-2'>{daysError}</p>
        )}
      </div>
    </div>
  );
};

export default CriteriaAvailabilityStep;
