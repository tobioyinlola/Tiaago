"use client";

import Image from "next/image";
import { Formik } from "formik";
import { useRef, useState } from "react";
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
import { BASE_URL } from "@/app/common/constants";
import { createJob } from "@/app/common/services/jobs";
import { useAlert } from "@/app/common/store/useAlert";
import InfoCircleIcon from "@/app/common/icons/InfoCircleIcon";
import { CountryField, TalentRole } from "@/app/common/types";
import { useScrollToTop } from "@/app/common/hooks/useScrollToTop";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import CopyToClipboard from "@/app/common/components/CopyToClipboard";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";
import { SuccessIconWithConfetti } from "@/app/common/icons/SuccessIcon";
import info_direct from "../../../../../../public/assets/images/companies/Polygon 20.png";
import StepIndicator from "./_components/StepIndicator";
import RoleTitleField from "./_components/RoleTitleField";
import CriteriaAvailabilityStep from "./_components/CriteriaAvailabilityStep";
import AssessmentGenerationStep from "./_components/AssessmentGenerationStep";

const totalSteps = wizardSteps.length;

const CreateJobForm = ({
  groupedCountries,
  talentRoles,
  recruiterCountry,
}: {
  groupedCountries: GroupBase<CountryField>[];
  talentRoles: TalentRole[];
  recruiterCountry?: string;
}) => {
  const [jobDetailUrl, setJobDetailUrl] = useState<string>();
  const [step, setStep] = useState(0);
  const setAlert = useAlert(state => state.setAlert);
  const scrollToTop = useScrollToTop("recruiter-dashboard-scroll-area");
  const currentStep = wizardSteps[step];
  const isLastStep = step === totalSteps - 1;
  const jobCreateSuccessModalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <div className='flex flex-col'>
        <div className='bg-[#EBECEE] w-full rounded-t-[12px] py-[18px] px-6 h-[64px]'>
          <h1 className='text-[#101828] text-[18px] leading-[28px] font-semibold'>
            Hire Talent
          </h1>
        </div>
      </div>
      <Formik
        initialValues={{
          ...initialValues,
          ...criteriaAvailabilityInitialValues,
          ...assessmentGenerationInitialValues,
          location: recruiterCountry || "",
        }}
        onSubmit={(
          {
            payment_range,
            payment_currency,
            screening_threshold,
            passing_grade,
            assessment_time_limit,
            interview_slots,
            assessment_questions,
            hiring_type,
            snapshot_interval_seconds,
            max_tab_switches_before_warning,
            max_tab_switches_before_termination,
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
            interview_slots,
            assessment_questions,
          })
            .then(res => {
              if (res.success) {
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
                      {description && (
                        <>
                          <InfoCircleIcon className='text-secondary-black' />
                          <Image
                            src={info_direct}
                            alt=''
                            className='w-[36px] h-[28px]'
                          />
                        </>
                      )}

                      {description && (
                        <div
                          className='bg-[#9DA3A8] shadow-[#00000040] md:max-w-[446px] flex items-center justify-center
                    px-3 py-2 rounded-md'
                        >
                          <p className='text-sm text-white  italic'>
                            {description}
                          </p>
                        </div>
                      )}
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

                        if (name === "location")
                          return (
                            <CountrySelect
                              key={name}
                              {...{ name, value, ...props }}
                              options={[
                                {
                                  label: "Remote",
                                  options: [
                                    {
                                      label: "Remote",
                                      value: "Remote",
                                      region: "Remote",
                                    },
                                  ],
                                },
                                ...groupedCountries,
                              ]}
                              error={error}
                              touched={touched[name]}
                              placeholder='Select Location'
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
                              maxChars: 1000,
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
                value={BASE_URL + link}
              />
              <CopyToClipboard text={BASE_URL + link} />
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
