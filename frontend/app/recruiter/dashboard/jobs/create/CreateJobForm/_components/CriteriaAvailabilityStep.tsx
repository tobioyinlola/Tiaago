"use client";

import { FormikErrors, FormikTouched } from "formik";

import { cn } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { CriteriaAvailabilityFormValues } from "../wizard.constants";
import { DAY_LABELS, TIME_OPTIONS } from "./availability";

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
          Your availability for post-assessment interviews
        </h3>
        <p className='text-sm text-secondary-black mb-4'>
          Pick the days and hours you&apos;re generally available to interview candidates.
          These only become visible to candidates once they pass the assessment stage.
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
