"use client";

import { Formik, FormikProps } from "formik";
import { useEffect, useRef, useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import type { GroupBase } from "react-select";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

import { initialValues, formSections } from "./form.constants";
import {
  wizardSteps,
  criteriaAvailabilityInitialValues,
  assessmentGenerationInitialValues,
} from "./wizard.constants";

import { useRouter } from "next/navigation";
import Modal from "@/app/common/components/Modal";
import { createJob, getJobDraft, saveJobDraft, deleteJobDraft } from "@/app/common/services/jobs";
import { useAlert } from "@/app/common/store/useAlert";
import InfoTooltip from "@/app/common/components/InfoTooltip";
import { CountryField, TalentRole } from "@/app/common/types";
import { useScrollToTop } from "@/app/common/hooks/useScrollToTop";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import CopyToClipboard from "@/app/common/components/CopyToClipboard";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";
import { SuccessIconWithConfetti } from "@/app/common/icons/SuccessIcon";
import StepIndicator from "./_components/StepIndicator";
import RoleTitleField from "./_components/RoleTitleField";
import CriteriaAvailabilityStep from "./_components/CriteriaAvailabilityStep";
import AssessmentGenerationStep from "./_components/AssessmentGenerationStep";
import { expandAvailabilityToSlots } from "./_components/availability";

const totalSteps = wizardSteps.length;

const JOB_DRAFT_STORAGE_KEY = "tiaago_job_create_draft_v1";

type JobWizardDraft = { step: number; values: Record<string, unknown> };

/** Rendered inside Formik's render-prop children so its hooks attach to the
 * right fiber (Formik's <Formik> is a class component internally -- a hook
 * called directly in the children callback attaches to the wrong fiber and
 * throws), mirroring the pattern already used in admin/blog's BlogPostForm.
 *
 * beforeunload can only reliably do a *synchronous* localStorage write --
 * browsers do not wait for an in-flight network request (our DB draft-save
 * is a server action / fetch) to finish once the tab is actually closing, so
 * that path is best-effort only via the 30s interval + unmount save below,
 * not attempted directly in the beforeunload handler itself. */
const DraftAutosave = ({
  step,
  values,
  onSaved,
}: {
  step: number;
  values: Record<string, unknown>;
  onSaved: (date: Date) => void;
}) => {
  const latestRef = useRef<JobWizardDraft>({ step, values });
  latestRef.current = { step, values };

  // Debounced localStorage write, instant-ish, always reliable.
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.localStorage.setItem(JOB_DRAFT_STORAGE_KEY, JSON.stringify(latestRef.current));
    }, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, values]);

  // Periodic DB save every 30s while the form stays open.
  useEffect(() => {
    const interval = setInterval(() => {
      saveJobDraft(latestRef.current).then(res => {
        if (res.success) onSaved(new Date());
      });
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab close/refresh: synchronous localStorage flush only (see comment above).
  // Unmount (in-app navigation away from this page): also flush to the DB --
  // the request has time to complete since the page isn't being torn down.
  useEffect(() => {
    const handleBeforeUnload = () => {
      window.localStorage.setItem(JOB_DRAFT_STORAGE_KEY, JSON.stringify(latestRef.current));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.localStorage.setItem(JOB_DRAFT_STORAGE_KEY, JSON.stringify(latestRef.current));
      saveJobDraft(latestRef.current.values);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

const CreateJobForm = ({
  groupedCountries,
  talentRoles,
}: {
  groupedCountries: GroupBase<CountryField>[];
  talentRoles: TalentRole[];
}) => {
  const [jobDetailUrl, setJobDetailUrl] = useState<string>();
  const [step, setStep] = useState(0);
  const setAlert = useAlert(state => state.setAlert);
  const scrollToTop = useScrollToTop("recruiter-dashboard-scroll-area");
  const currentStep = wizardSteps[step];
  const isLastStep = step === totalSteps - 1;
  const jobCreateSuccessModalRef = useRef<HTMLDialogElement>(null);
  const formikRef = useRef<
    FormikProps<
      typeof initialValues & typeof criteriaAvailabilityInitialValues & typeof assessmentGenerationInitialValues
    >
  >(null);
  const [foundDraft, setFoundDraft] = useState<JobWizardDraft | null>(null);
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);

  // Check for a recoverable draft on mount -- localStorage first (instant,
  // same-browser), falling back to the DB copy (works across devices/tabs).
  // Runs after mount, not during initial render, to avoid an SSR hydration
  // mismatch between the server-rendered blank form and localStorage content.
  useEffect(() => {
    const local = window.localStorage.getItem(JOB_DRAFT_STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local) as JobWizardDraft;
        if (parsed?.values && Object.keys(parsed.values).length) {
          setFoundDraft(parsed);
          return;
        }
      } catch {
        // ignore corrupt local draft, fall through to the DB copy
      }
    }
    getJobDraft().then(draft => {
      if (draft?.draft_data && Object.keys(draft.draft_data).length) {
        setFoundDraft({
          step: Number(draft.draft_data.step) || 0,
          values: (draft.draft_data.values as Record<string, unknown>) || {},
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinueDraft = () => {
    if (!foundDraft) return;
    formikRef.current?.setValues({
      ...initialValues,
      ...criteriaAvailabilityInitialValues,
      ...assessmentGenerationInitialValues,
      ...foundDraft.values,
    });
    setStep(Math.min(foundDraft.step, totalSteps - 1));
    setDraftBannerDismissed(true);
  };

  const handleStartFresh = () => {
    window.localStorage.removeItem(JOB_DRAFT_STORAGE_KEY);
    deleteJobDraft();
    setFoundDraft(null);
    setDraftBannerDismissed(true);
  };

  return (
    <>
      <div className='flex flex-col'>
        <div className='bg-[#EBECEE] w-full rounded-t-[12px] py-[18px] px-6 h-[64px]'>
          <h1 className='text-[#101828] text-[18px] leading-[28px] font-semibold'>
            Hire Talent
          </h1>
        </div>
      </div>
      {foundDraft && !draftBannerDismissed && (
        <div className='flex items-center justify-between gap-4 bg-[#FFFAEB] border border-[#FEDF89] px-6 py-3 flex-wrap'>
          <p className='text-sm text-[#7A5B00]'>
            You have an unfinished job draft. Continue where you left off?
          </p>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              color='primary'
              variant='outline'
              className='btn-sm'
              onClick={handleStartFresh}
            >
              Start fresh
            </Button>
            <Button
              type='button'
              color='primary'
              className='btn-sm text-white'
              onClick={handleContinueDraft}
            >
              Continue draft
            </Button>
          </div>
        </div>
      )}
      <Formik
        innerRef={formikRef}
        initialValues={{
          ...initialValues,
          ...criteriaAvailabilityInitialValues,
          ...assessmentGenerationInitialValues,
        }}
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
          { setSubmitting, resetForm, setFieldError }
        ) => {
          if (!isLastStep) {
            setStep(current => Math.min(current + 1, totalSteps - 1));
            scrollToTop();
            setSubmitting(false);
            return;
          }

          createJob({
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
            interview_slots: expandAvailabilityToSlots(interview_availability),
            assessment_questions,
            // Only meaningful with the AI interview on. Sent as null rather
            // than "" when it is off -- the backend field is nullable, and an
            // empty string is not a valid integer.
            ai_interview_pass_mark: values.ai_interview_enabled
              ? Number(ai_interview_pass_mark)
              : null,
          })
            .then(res => {
              if (res.success) {
                // The draft row was converted to the published job in place
                // (see JobListCreateView.create), not deleted -- only the
                // local/browser copy needs clearing here.
                window.localStorage.removeItem(JOB_DRAFT_STORAGE_KEY);
                setFoundDraft(null);
                resetForm();
                setStep(0);
                scrollToTop();
                setJobDetailUrl(res?.data?.detail_url);
                jobCreateSuccessModalRef.current?.showModal();
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
            <DraftAutosave step={step} values={values} onSaved={setDraftSavedAt} />
            {draftSavedAt && (
              <span className='text-xs text-gray-400 text-right -mb-6'>Draft saved</span>
            )}
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
      <JobCreateSuccessModal
        jobDetailUrl={jobDetailUrl}
        modalRef={jobCreateSuccessModalRef}
        onExit={() => {
          setStep(0);
          scrollToTop();
        }}
      />
    </>
  );
};

export default CreateJobForm;

type JobCreateSuccessModalProps = {
  modalRef: React.RefObject<HTMLDialogElement>;
  jobDetailUrl?: string;
  onExit: () => void;
};

const JobCreateSuccessModal = ({
  modalRef,
  jobDetailUrl,
  onExit,
}: JobCreateSuccessModalProps) => {
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
    router.push("/recruiter/dashboard");
    modalRef.current?.close();
  };

  return (
    <Modal id='job-create-success-modal' modalRef={modalRef} autoHeight>
      <div>
        <div className='flex w-full justify-center'>
          <SuccessIconWithConfetti />
        </div>
        <h3 className='text-3xl font-semibold mb-2 font-space-grotesk text-center'>
          Job created successfully
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px] text-center'>
          Your job listing is now live and open to applicants
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
            Go to Dashboard
          </button>
          <button onClick={handleViewJob} className='btn btn-primary flex-1'>
            View Job
          </button>
        </div>
      </div>
    </Modal>
  );
};
