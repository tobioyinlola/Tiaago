"use client";

import { Formik, FormikProps } from "formik";
import { useRef, useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import type { GroupBase } from "react-select";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { useRouter } from "next/navigation";

import { initialValues, formSections } from "../../create/CreateJobForm/form.constants";
import {
  editWizardSteps,
  criteriaAvailabilityInitialValues,
  assessmentGenerationInitialValues,
  CriteriaAvailabilityFormValues,
  AssessmentGenerationFormValues,
} from "../../create/CreateJobForm/wizard.constants";

import Modal from "@/app/common/components/Modal";
import { updateJob } from "@/app/common/services/jobs";
import { useAlert } from "@/app/common/store/useAlert";
import InfoTooltip from "@/app/common/components/InfoTooltip";
import { CountryField, TalentRole, Job } from "@/app/common/types";
import { useScrollToTop } from "@/app/common/hooks/useScrollToTop";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import CopyToClipboard from "@/app/common/components/CopyToClipboard";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";
import { SuccessIconWithConfetti } from "@/app/common/icons/SuccessIcon";
import StepIndicator from "../../create/CreateJobForm/_components/StepIndicator";
import RoleTitleField from "../../create/CreateJobForm/_components/RoleTitleField";
import CriteriaAvailabilityStep from "../../create/CreateJobForm/_components/CriteriaAvailabilityStep";
import AssessmentGenerationStep from "../../create/CreateJobForm/_components/AssessmentGenerationStep";
import { expandAvailabilityToSlots } from "../../create/CreateJobForm/_components/availability";

const totalSteps = editWizardSteps.length;

type EditFormValues = typeof initialValues &
  CriteriaAvailabilityFormValues &
  AssessmentGenerationFormValues;

// Pre-fills every field the create wizard collects -- existing_assessment_questions
// (job.assessment_template's current contents) and existing_interview_slots feed
// the exact same AssessmentGenerationStep/CriteriaAvailabilityStep components
// used at creation, so editing follows the identical flow. A top-level function
// (not a component-scoped closure) so its return type can drive formikRef's
// generic below without needing to call it first.
const buildInitialValues = (job: Job): EditFormValues => {
  const paymentRange =
    job.payment_currency === "USD" ? job.payment_range_usd : job.payment_range_ngn;
  const currency = job.payment_currency || "USD";

  return {
    ...initialValues,
    ...criteriaAvailabilityInitialValues,
    ...assessmentGenerationInitialValues,
    role: job.role,
    job_type: job.job_type,
    job_level: job.job_level,
    country: job.country || "",
    work_mode: job.work_mode || "",
    salary_duration: job.salary_duration,
    payment_range: paymentRange || "",
    payment_currency: currency,
    experience: job.experience,
    description: job.description,
    about_company: job.about_company,
    job_requirement: job.job_requirement,
    hiring_type: job.hiring_type,
    screening_threshold: job.screening_threshold ?? "",
    passing_grade: job.passing_grade ?? "",
    assessment_time_limit: job.assessment_time_limit ?? "",
    ai_interview_enabled: job.ai_interview_enabled ?? false,
    ai_interview_duration_minutes: (job.ai_interview_duration_minutes ?? 10) as 5 | 8 | 10,
    ai_interview_questions_count: (job.ai_interview_questions_count ?? 6) as 4 | 5 | 6,
    ai_interview_window_hours: (job.ai_interview_window_hours ?? 72) as 48 | 72,
    // "" (not 0) when unset, so the field renders empty rather than showing a
    // pass mark the recruiter never chose.
    ai_interview_pass_mark: job.ai_interview_pass_mark ?? "",
    interview_type: job.interview_type ?? "IN_HOUSE",
    interview_duration_minutes: job.interview_duration_minutes ?? 45,
    interview_meeting_url: job.interview_meeting_url ?? "",
    assessment_questions: job.existing_assessment_questions ?? [],
    proctoring_enabled: job.proctoring_enabled ?? true,
    require_fullscreen: job.require_fullscreen ?? true,
    require_webcam: job.require_webcam ?? true,
    webcam_snapshots_enabled: job.webcam_snapshots_enabled ?? true,
    snapshot_interval_seconds: job.snapshot_interval_seconds ?? 60,
    max_tab_switches_before_warning: job.max_tab_switches_before_warning ?? 2,
    max_tab_switches_before_termination: job.max_tab_switches_before_termination ?? 5,
    copy_paste_blocked: job.copy_paste_blocked ?? true,
    right_click_blocked: job.right_click_blocked ?? true,
    devtools_detection_enabled: job.devtools_detection_enabled ?? true,
    force_submit_on_critical_violation: job.force_submit_on_critical_violation ?? false,
  };
};

const EditJobForm = ({
  job,
  groupedCountries,
  talentRoles,
}: {
  job: Job;
  groupedCountries: GroupBase<CountryField>[];
  talentRoles: TalentRole[];
  hasAddedPaymentCard: boolean;
  usePaystack: boolean;
  paystackPublicKey: string;
  paystackEmail: string;
}) => {
  const [step, setStep] = useState(0);
  const setAlert = useAlert(state => state.setAlert);
  const scrollToTop = useScrollToTop("recruiter-dashboard-scroll-area");
  const currentStep = editWizardSteps[step];
  const isLastStep = step === totalSteps - 1;
  const jobEditSuccessModalRef = useRef<HTMLDialogElement>(null);
  const formikRef = useRef<FormikProps<EditFormValues>>(null);

  return (
    <>
      <div className='flex flex-col'>
        <div className='bg-[#EBECEE] w-full rounded-t-[12px] py-[18px] px-6 h-[64px]'>
          <h1 className='text-[#101828] text-[18px] leading-[28px] font-semibold'>
            Edit Job
          </h1>
        </div>
      </div>
      <Formik
        innerRef={formikRef}
        initialValues={buildInitialValues(job)}
        onSubmit={(
          {
            payment_range,
            payment_currency,
            screening_threshold,
            passing_grade,
            assessment_time_limit,
            interview_availability,
            assessment_questions,
            hiring_type,
            snapshot_interval_seconds,
            max_tab_switches_before_warning,
            max_tab_switches_before_termination,
            ai_interview_pass_mark,
            ...values
          },
          { setSubmitting, setFieldError }
        ) => {
          if (!isLastStep) {
            setStep(current => Math.min(current + 1, totalSteps - 1));
            scrollToTop();
            setSubmitting(false);
            return;
          }

          // interview_slots is only included when the recruiter actually picked
          // new availability days -- omitting it entirely (rather than sending [])
          // tells the backend to leave the job's existing slots untouched (see
          // jobs.serializers.JobUpdateSerializer.update).
          const newSlots = expandAvailabilityToSlots(interview_availability);

          updateJob(job.public_id, {
            ...values,
            payment_currency,
            ...(payment_currency === "USD"
              ? { payment_range_usd: payment_range }
              : { payment_range_ngn: payment_range }),
            screening_threshold: Number(screening_threshold),
            passing_grade: Number(passing_grade),
            assessment_time_limit: Number(assessment_time_limit),
            snapshot_interval_seconds: Number(snapshot_interval_seconds),
            max_tab_switches_before_warning: Number(max_tab_switches_before_warning),
            max_tab_switches_before_termination: Number(max_tab_switches_before_termination),
            ...(newSlots.length ? { interview_slots: newSlots } : {}),
            assessment_questions,
            // Mirrors CreateJobForm -- nullable server-side, and "" is not a
            // valid integer, so an AI-interview-off job clears it explicitly.
            ai_interview_pass_mark: values.ai_interview_enabled
              ? Number(ai_interview_pass_mark)
              : null,
          })
            .then(res => {
              if (res.success) {
                jobEditSuccessModalRef.current?.showModal();
              } else {
                handleFormSubmissionError(res.error, setFieldError, setAlert);
              }
            })
            .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
            .finally(() => setSubmitting(false));
        }}
        validationSchema={currentStep.validationSchema}
      >
        {({
          handleSubmit,
          errors,
          touched,
          isSubmitting,
          values,
          setFieldValue,
        }) => (
          <form
            onSubmit={handleSubmit}
            className='p-5 pb-10 rounded-b-lg md:border border-gray-200 flex flex-col gap-10 mb-3'
          >
            <StepIndicator
              step={step}
              totalSteps={totalSteps}
              title={currentStep.title}
              description={currentStep.description}
            />

            {step === 0 && (
              <div className='flex flex-col gap-14'>
                {formSections.map(({ title, description, fields }, i) => (
                  <div key={title} className='flex flex-col md:gap-2'>
                    <div className='flex items-center gap-2'>
                      <h2
                        className={cn(
                          "text-sm font-normal text-[#344054]",
                          !i &&
                            "text-base font-semibold text-primary-black pb-3 border-b border-[#EAECF0] w-full mb-6"
                        )}
                      >
                        {title}
                      </h2>
                      <InfoTooltip description={description} />
                    </div>

                    <div className='flex-wrap md:flex justify-between'>
                      {fields.map(({ name, ...props }) => {
                        const value = values[name];
                        const err = errors[name];
                        const error =
                          typeof err === "string"
                            ? err
                            : Array.isArray(err)
                            ? err[0]
                            : undefined;
                        const paymentRangeOptions =
                          values.payment_currency === "NGN"
                            ? [
                                {
                                  label: "50,000 - 100,000",
                                  value: "50000-100000",
                                },
                                {
                                  label: "150,000 - 250,000",
                                  value: "150000-250000",
                                },
                                {
                                  label: "300,000 - 500,000",
                                  value: "300000-500000",
                                },
                                {
                                  label: "500,000 and above",
                                  value: "500000-above",
                                },
                                {
                                  label: "1,000,000 and above",
                                  value: "1000000-above",
                                },
                              ]
                            : [
                                { label: "50 - 200", value: "50-200" },
                                { label: "200 - 500", value: "200-500" },
                                { label: "600 - 1000", value: "600-1000" },
                                { label: "1100 - 1500", value: "1100-1500" },
                                {
                                  label: "1600 and above",
                                  value: "1600-above",
                                },
                              ];

                        if (name === "role")
                          return (
                            <RoleTitleField
                              key={name}
                              value={String(value ?? "")}
                              onChange={val => setFieldValue("role", val)}
                              talentRoles={talentRoles}
                              error={error}
                              touched={!!touched[name]}
                              className={props.className}
                            />
                          );

                        if (name === "country")
                          return (
                            <CountrySelect
                              key={name}
                              {...{ name, value, ...props }}
                              options={groupedCountries}
                              error={error}
                              touched={touched[name]}
                              placeholder='Select Country'
                            />
                          );

                        if (name === "payment_range")
                          return (
                            <div
                              className={cn(
                                "relative isolate",
                                props.className
                              )}
                              key={name}
                            >
                              <select
                                className='absolute pl-3.5 bottom-1/2 z-[1] h-12 bg-transparent border-0 rounded-lg translate-y-1/2 left-0 focus:outline-none'
                                value={values.payment_currency}
                                onChange={e => {
                                  setFieldValue(
                                    "payment_currency",
                                    e.target.value
                                  );
                                  setFieldValue("payment_range", "");
                                }}
                              >
                                <option value='USD'>USD</option>
                                <option value='NGN'>NGN</option>
                              </select>
                              <FormikField
                                {...{ name, value, ...props }}
                                error={error || errors.payment_currency}
                                touched={
                                  touched[name] || touched.payment_currency
                                }
                                className='w-full'
                                type='select'
                                selectFieldProps={{
                                  options: paymentRangeOptions,
                                  styles: {
                                    control: {
                                      paddingLeft: 65,
                                      minHeight: "3rem",
                                      borderRadius: "0.5rem",
                                    },
                                  },
                                  value:
                                    paymentRangeOptions.find(
                                      option => option.value === value
                                    ) || null,
                                }}
                              />
                            </div>
                          );

                        return (
                          <FormikField
                            key={name}
                            {...{ name, value, ...props }}
                            error={error}
                            touched={touched[name]}
                            richtextProps={{
                              // Matches jobRequirementValidationSchema/jobDescriptionValidationSchema/
                              // companyDescriptionValidationSchema in form.constants.ts.
                              maxChars: name === "about_company" ? 1000 : 3000,
                              minHeight: 180,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
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
                onClick={() => {
                  setStep(current => Math.max(0, current - 1));
                  setTimeout(() => {
                    scrollToTop();
                  }, 100);
                }}
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
                    Update Job <Send className='h-4 w-4' />
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
      <JobEditSuccessModal
        jobDetailUrl={job.detail_url}
        modalRef={jobEditSuccessModalRef}
        onExit={() => {
          setStep(0);
          scrollToTop();
        }}
      />
    </>
  );
};

export default EditJobForm;

type JobEditSuccessModalProps = {
  modalRef: React.RefObject<HTMLDialogElement>;
  jobDetailUrl?: string;
  onExit: () => void;
};

const JobEditSuccessModal = ({
  modalRef,
  jobDetailUrl,
  onExit,
}: JobEditSuccessModalProps) => {
  const link = jobDetailUrl || "#";
  const router = useRouter();
  const handleViewJob = () => {
    onExit();
    // `link` is a full absolute URL (detail_url), not an internal route --
    // router.push() only handles in-app paths, so navigate directly.
    window.location.href = link;
    modalRef.current?.close();
  };

  const handleGoToDashboard = () => {
    onExit();
    router.push("/recruiter/dashboard/jobs/jobs-posted");
    modalRef.current?.close();
  };

  return (
    <Modal id='job-edit-success-modal' modalRef={modalRef} autoHeight>
      <div>
        <div className='flex w-full justify-center'>
          <SuccessIconWithConfetti />
        </div>
        <h3 className='text-3xl font-semibold mb-2 font-space-grotesk text-center'>
          Job updated successfully
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px] text-center'>
          Your job listing has been updated and is now live
        </p>
        <div className='mt-6 border-t py-8'>
          <div className='form-control w-full'>
            <label className='label label-text text-gray-700 font-medium'>
              Get job public url link
            </label>
            <div className='flex'>
              <input
                className='input input-bordered w-full input-primary bg-white'
                type='url'
                disabled
                value={link}
              />
              <CopyToClipboard text={link} />
            </div>
          </div>
        </div>
        <div className='modal-action'>
          <button onClick={handleGoToDashboard} className='btn flex-1'>
            Back to Jobs
          </button>
          <button onClick={handleViewJob} className='btn btn-primary flex-1'>
            View Job
          </button>
        </div>
      </div>
    </Modal>
  );
};
