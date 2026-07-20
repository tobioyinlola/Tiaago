"use client";

import { Plus, Copy, Trash2, CalendarClock } from "lucide-react";
import { FormikErrors, FormikTouched } from "formik";

import { InterviewSlotInput } from "@/app/common/types";
import FormikField from "@/app/common/components/Forms/FormikField";
import { CriteriaAvailabilityFormValues } from "../wizard.constants";

const emptySlot: InterviewSlotInput = { date: "", start_time: "", end_time: "" };

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
  const slots = values.interview_slots || [];

  const updateSlot = (index: number, field: keyof InterviewSlotInput, value: string) => {
    const next = slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
    setFieldValue("interview_slots", next);
  };

  const addSlot = () => setFieldValue("interview_slots", [...slots, { ...emptySlot }]);

  const duplicateSlot = (index: number) =>
    setFieldValue("interview_slots", [
      ...slots.slice(0, index + 1),
      { ...slots[index] },
      ...slots.slice(index + 1),
    ]);

  const removeSlot = (index: number) =>
    setFieldValue(
      "interview_slots",
      slots.filter((_, i) => i !== index)
    );

  const slotsError =
    typeof errors.interview_slots === "string" ? errors.interview_slots : undefined;

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
          Add the time slots you&apos;re available to interview candidates. These only
          become visible to candidates once they pass the assessment stage.
        </p>

        <div className='rounded-lg border border-[#EAECF0] overflow-hidden'>
          {slots.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-2 py-10 text-center'>
              <CalendarClock className='h-6 w-6 text-secondary-black' />
              <p className='text-sm text-secondary-black'>No time slots added yet.</p>
            </div>
          ) : (
            slots.map((slot, index) => (
              <div
                key={index}
                className='flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 px-4 py-3 border-b border-[#EAECF0] last:border-b-0'
              >
                <input
                  type='date'
                  className='input input-bordered h-11 w-full sm:w-[150px]'
                  value={slot.date}
                  onChange={e => updateSlot(index, "date", e.target.value)}
                />
                <div className='flex items-center gap-3'>
                  <input
                    type='time'
                    className='input input-bordered h-11 w-full sm:w-[120px]'
                    value={slot.start_time}
                    onChange={e => updateSlot(index, "start_time", e.target.value)}
                  />
                  <span className='text-secondary-black'>-</span>
                  <input
                    type='time'
                    className='input input-bordered h-11 w-full sm:w-[120px]'
                    value={slot.end_time}
                    onChange={e => updateSlot(index, "end_time", e.target.value)}
                  />
                </div>

                <div className='sm:ml-auto flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => duplicateSlot(index)}
                    className='h-11 w-11 flex items-center justify-center rounded-lg border border-[#EAECF0] text-secondary-black hover:border-primary hover:text-primary transition-colors'
                    aria-label='Duplicate slot'
                  >
                    <Copy className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    onClick={() => removeSlot(index)}
                    className='h-11 w-11 flex items-center justify-center rounded-lg border border-[#EAECF0] text-error hover:border-error hover:bg-error/10 transition-colors'
                    aria-label='Remove slot'
                  >
                    <Trash2 className='h-4 w-4' />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {slotsError && touched.interview_slots && (
          <p className='text-xs text-error mt-2'>{slotsError}</p>
        )}

        <button
          type='button'
          onClick={addSlot}
          className='btn btn-outline btn-sm gap-2 mt-3'
        >
          <Plus className='h-4 w-4' /> Add time slot
        </button>
      </div>
    </div>
  );
};

export default CriteriaAvailabilityStep;
