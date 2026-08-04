"use client";

import { FormikErrors, FormikTouched } from "formik";

import { cn } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { Switch } from "@/app/common/components/ui/switch";
import { CriteriaAvailabilityFormValues } from "../wizard.constants";
import { DAY_LABELS, TIME_OPTIONS } from "./availability";

const AI_INTERVIEW_DURATION_OPTIONS = [5, 8, 10] as const;
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
          </div>
        )}
      </div>

      <div className={cn(values.ai_interview_enabled && "opacity-50 pointer-events-none")}>
        <h3 className='text-base font-bold text-primary-black pb-3 border-b border-[#EAECF0] mb-1'>
          Your availability for post-assessment interviews
        </h3>
        <p className='text-sm text-secondary-black mb-4'>
          {values.ai_interview_enabled
            ? "Not used while AI interview is enabled above -- candidates go straight to Alex instead."
            : "Pick the days and hours you're generally available to interview candidates. These only become visible to candidates once they pass the assessment stage."}
        </p>

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
