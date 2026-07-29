"use client";

import * as Yup from "yup";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { Formik, FormikProps } from "formik";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

import Modal from "@/app/common/components/Modal";
import Button from "@/app/common/components/DaisyButton";
import FormikField from "@/app/common/components/Forms/FormikField";
import { AtsJob } from "@/app/common/types";
import {
  jobTypeEnumToLabel,
  handleFormSubmissionError,
} from "@/app/common/utils";
import { useAlert } from "@/app/common/store/useAlert";
import {
  JOB_LEVEL_OPTIONS,
  JOB_LEVEL_VALUES,
} from "@/app/common/constants/jobs";
import { convertAtsJob } from "@/app/common/services/ats-server";
import CriteriaAvailabilityStep from "../create/CreateJobForm/_components/CriteriaAvailabilityStep";
import AssessmentGenerationStep from "../create/CreateJobForm/_components/AssessmentGenerationStep";
import { expandAvailabilityToSlots } from "../create/CreateJobForm/_components/availability";
import {
  criteriaAvailabilityValidationSchema,
  assessmentGenerationValidationSchema,
  criteriaAvailabilityInitialValues,
  assessmentGenerationInitialValues,
} from "../create/CreateJobForm/wizard.constants";

// Only the fields a synced AtsJob genuinely doesn't have -- role/description/
// location come from the ATS sync itself and are shown read-only below.
const gapFillValidationSchema = Yup.object().shape({
  job_type: Yup.string()
    .required()
    .label("Job type")
    .oneOf(["FT", "PT", "CW", "IN"], "Please select a valid job type"),
  job_level: Yup.string()
    .required()
    .label("Job level")
    .oneOf(JOB_LEVEL_VALUES, "Please select a valid job level"),
  experience: Yup.number().required().min(0).max(10).label("Experience"),
  payment_currency: Yup.string().required().label("Currency"),
  payment_range: Yup.string().required().label("Payment range"),
  hiring_type: Yup.string()
    .required()
    .oneOf(["With AI", "Manually"], "Please select a valid hiring type")
    .label("Hiring type"),
});

const steps = [
  {
    key: "job-details",
    title: "Job Details",
    validationSchema: gapFillValidationSchema,
  },
  {
    key: "criteria-availability",
    title: "Criteria & Availability",
    validationSchema: criteriaAvailabilityValidationSchema,
  },
  {
    key: "assessment-generation",
    title: "Assessment Generation",
    validationSchema: assessmentGenerationValidationSchema,
  },
] as const;

const gapFillInitialValues = {
  job_type: "",
  job_level: "JUNIOR",
  experience: 0,
  payment_currency: "USD",
  payment_range: "",
  hiring_type: "With AI",
};

const paymentRangeOptionsByCurrency: Record<
  string,
  { label: string; value: string }[]
> = {
  USD: [
    { label: "$50 - $200", value: "50-200" },
    { label: "$200 - $500", value: "200-500" },
    { label: "$600 - $1000", value: "600-1000" },
    { label: "$1100 - $1500", value: "1100-1500" },
    { label: "$1600 and above", value: "1600-above" },
  ],
  NGN: [
    { label: "₦50,000 - ₦100,000", value: "50000-100000" },
    { label: "₦150,000 - ₦250,000", value: "150000-250000" },
    { label: "₦300,000 - ₦500,000", value: "300000-500000" },
    { label: "₦500,000 and above", value: "500000-above" },
  ],
};

const ConvertAtsJobModal = ({
  atsJob,
  onClose,
}: {
  atsJob: AtsJob;
  onClose: () => void;
}) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const [step, setStep] = useState(0);
  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const formikRef = useRef<FormikProps<any>>(null);
  const modalRef = useRef<HTMLDialogElement>(null);

  // This component is only mounted while a "Convert" click is in progress
  // (see SyncedJobsSection), so open it as soon as it mounts, and treat the
  // dialog's own native "close" event (X button, backdrop click, Escape --
  // Modal's built-in <form method="dialog"> buttons all trigger this) as the
  // single source of truth for unmounting it via onClose.
  useEffect(() => {
    const dialog = modalRef.current;
    dialog?.showModal();
    dialog?.addEventListener("close", onClose);
    return () => dialog?.removeEventListener("close", onClose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialValues = {
    ...gapFillInitialValues,
    ...criteriaAvailabilityInitialValues,
    ...assessmentGenerationInitialValues,
    role: atsJob.title || "Untitled role",
    description: atsJob.description || "",
    job_requirement: "",
  };

  return (
    <Modal id={`convert-ats-job-${atsJob.id}`} modalRef={modalRef}>
      <div className='p-1'>
        <h3 className='text-lg font-bold text-primary-black'>
          Convert &quot;{atsJob.title || "Untitled role"}&quot; to a Job Posting
        </h3>
        <p className='text-sm text-secondary-black mb-6'>
          Synced from {atsJob.provider} -- {atsJob.candidate_count} candidate
          {atsJob.candidate_count !== 1 ? "s" : ""} will be added as
          applications once posted.
        </p>

        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={currentStep.validationSchema}
          onSubmit={(
            {
              role,
              description,
              job_requirement,
              payment_range,
              payment_currency,
              screening_threshold,
              passing_grade,
              assessment_time_limit,
              interview_availability,
              assessment_questions,
              job_type,
              job_level,
              experience,
              hiring_type,
              ...rest
            },
            { setSubmitting, setFieldError }
          ) => {
            if (!isLastStep) {
              setStep(current => Math.min(current + 1, steps.length - 1));
              setSubmitting(false);
              return;
            }

            convertAtsJob(atsJob.id, {
              job_type,
              job_level,
              experience: Number(experience),
              payment_currency,
              ...(payment_currency === "USD"
                ? { payment_range_usd: payment_range }
                : { payment_range_ngn: payment_range }),
              hiring_type,
              screening_threshold: Number(screening_threshold),
              passing_grade: Number(passing_grade),
              assessment_time_limit: Number(assessment_time_limit),
              interview_slots: expandAvailabilityToSlots(
                interview_availability
              ),
              assessment_questions,
              ...rest,
            })
              .then(res => {
                if (res.success) {
                  toast.success(
                    `Job posted -- ${res.data.applications_created} candidate${
                      res.data.applications_created !== 1 ? "s" : ""
                    } added as application${res.data.applications_created !== 1 ? "s" : ""}`
                  );
                  onClose();
                  router.refresh();
                } else {
                  handleFormSubmissionError(res.error, setFieldError, setAlert);
                }
              })
              .catch(err =>
                handleFormSubmissionError(err, setFieldError, setAlert)
              )
              .finally(() => setSubmitting(false));
          }}
        >
          {({
            handleSubmit,
            errors,
            touched,
            isSubmitting,
            values,
            setFieldValue,
          }) => (
            <form onSubmit={handleSubmit} className='flex flex-col gap-8'>
              {step === 0 && (
                <div className='flex flex-col gap-6'>
                  <div className='rounded-lg border border-[#EAECF0] p-4 bg-[#FAFAFA]'>
                    <p className='text-xs font-medium text-[#667085] mb-1'>
                      Role (from synced job)
                    </p>
                    <p className='text-sm font-semibold'>{values.role}</p>
                    <p className='text-xs text-[#667085] mt-2'>
                      {atsJob.location || "Remote"}
                    </p>
                  </div>

                  <div className='flex-wrap md:flex justify-between gap-y-4'>
                    <FormikField
                      name='job_type'
                      label='Job Type'
                      type='select'
                      className='md:w-[48%] [&_input]:w-full'
                      value={values.job_type}
                      error={errors.job_type as string | undefined}
                      touched={touched.job_type as boolean | undefined}
                      selectFieldProps={{
                        options: ["FT", "PT", "CW", "IN"].map(t => ({
                          label: jobTypeEnumToLabel(t as any),
                          value: t,
                        })),
                      }}
                    />
                    <FormikField
                      name='job_level'
                      label='Job Level'
                      type='select'
                      className='md:w-[48%] [&_input]:w-full'
                      value={values.job_level}
                      error={errors.job_level as string | undefined}
                      touched={touched.job_level as boolean | undefined}
                      selectFieldProps={{ options: JOB_LEVEL_OPTIONS }}
                    />
                    <FormikField
                      name='experience'
                      label='Minimum Experience'
                      type='select'
                      className='md:w-[48%] [&_input]:w-full'
                      value={values.experience}
                      error={errors.experience as string | undefined}
                      touched={touched.experience as boolean | undefined}
                      selectFieldProps={{
                        options: Array.from({ length: 11 }, (_, i) => i).map(
                          y => ({
                            label: `${y} year${y !== 1 ? "s" : ""}`,
                            value: y,
                          })
                        ),
                      }}
                    />
                    <FormikField
                      name='hiring_type'
                      label='Hiring Type'
                      type='select'
                      className='md:w-[48%] [&_input]:w-full'
                      value={values.hiring_type}
                      error={errors.hiring_type as string | undefined}
                      touched={touched.hiring_type as boolean | undefined}
                      selectFieldProps={{
                        options: [
                          { label: "With AI", value: "With AI" },
                          { label: "Manually", value: "Manually" },
                        ],
                      }}
                    />
                    <div className='relative isolate md:w-[48%]'>
                      <select
                        className='absolute pl-3.5 bottom-1/2 z-[1] h-12 bg-transparent border-0 rounded-lg translate-y-1/2 left-0 focus:outline-none'
                        value={values.payment_currency}
                        onChange={e => {
                          setFieldValue("payment_currency", e.target.value);
                          setFieldValue("payment_range", "");
                        }}
                      >
                        <option value='USD'>USD</option>
                        <option value='NGN'>NGN</option>
                      </select>
                      <FormikField
                        name='payment_range'
                        label='Payment Range'
                        type='select'
                        value={values.payment_range}
                        error={
                          (errors.payment_range as string | undefined) ||
                          (errors.payment_currency as string | undefined)
                        }
                        touched={
                          (touched.payment_range as boolean | undefined) ||
                          (touched.payment_currency as boolean | undefined)
                        }
                        className='w-full'
                        selectFieldProps={{
                          options:
                            paymentRangeOptionsByCurrency[
                              values.payment_currency
                            ] || [],
                          styles: {
                            control: {
                              paddingLeft: 65,
                              minHeight: "3rem",
                              borderRadius: "0.5rem",
                            },
                          },
                          value:
                            (
                              paymentRangeOptionsByCurrency[
                                values.payment_currency
                              ] || []
                            ).find(o => o.value === values.payment_range) ||
                            null,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <CriteriaAvailabilityStep
                  values={values}
                  errors={errors}
                  touched={touched}
                  setFieldValue={setFieldValue}
                />
              )}

              {step === 2 && (
                <AssessmentGenerationStep
                  values={values}
                  errors={errors}
                  touched={touched}
                  setFieldValue={setFieldValue}
                />
              )}

              <div className='flex items-center justify-between w-full pt-4 border-t border-[#EAECF0]'>
                <Button
                  onClick={() => setStep(current => Math.max(0, current - 1))}
                  disabled={step === 0}
                  color='primary'
                  variant='outline'
                  className='text-white gap-2'
                  type='button'
                >
                  <ArrowLeft className='h-4 w-4' /> Previous
                </Button>
                <Button
                  loading={isSubmitting}
                  color='primary'
                  className='text-white gap-2'
                  type='submit'
                >
                  {isSubmitting ? (
                    ""
                  ) : isLastStep ? (
                    <>
                      Post Job <Send className='h-4 w-4' />
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className='h-4 w-4' />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </Formik>
      </div>
    </Modal>
  );
};

export default ConvertAtsJobModal;
