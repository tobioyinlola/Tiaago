"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Formik } from "formik";
import { useRef, useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import type { GroupBase } from "react-select";

import {
  validationSchema,
  initialValues,
  formSections,
  hireWithAiBooleanFields,
  qualificationCriteriaStages,
} from "../../create/CreateJobForm/form.constants";

import Modal from "@/app/common/components/Modal";
import { updateJob } from "@/app/common/services/jobs";
import { useAlert } from "@/app/common/store/useAlert";
import HiringProcess from "../../_components/HiringProcess";
import RoleTitleField from "../../create/CreateJobForm/_components/RoleTitleField";
import InfoCircleIcon from "@/app/common/icons/InfoCircleIcon";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import { CountryField, TalentRole, Job } from "@/app/common/types";
import { cn, handleFormSubmissionError, openModal } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import CopyToClipboard from "@/app/common/components/CopyToClipboard";
import JobDetails from "@/app/common/components/dashboard/JobDetails";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";
import { SuccessIconWithConfetti } from "@/app/common/icons/SuccessIcon";
import info_direct from "../../../../../../public/assets/images/companies/Polygon 20.png";
import { useScrollToTop } from "@/app/common/hooks/useScrollToTop";
import { useRouter } from "next/navigation";

const AddPaystackCard = dynamic(
  () => import("../../../payment/_components/AddPaystackCard"),
  { ssr: false }
);
const AddStripeCard = dynamic(
  () => import("../../../payment/_components/AddStripeCard"),
  { ssr: false }
);

const maxStep = 2;

const EditJobForm = ({
  job,
  groupedCountries,
  talentRoles,
  recruiterCountry,
  hasAddedPaymentCard,
  usePaystack,
  // stripeClientSecret,
  paystackPublicKey,
  paystackEmail,
}: {
  job: Job;
  groupedCountries: GroupBase<CountryField>[];
  talentRoles: TalentRole[];
  recruiterCountry?: string;
  hasAddedPaymentCard: boolean;
  usePaystack: boolean;
  // stripeClientSecret: string;
  paystackPublicKey: string;
  paystackEmail: string;
}) => {
  const jobDetailUrl = job.detail_url;
  const [_hasAddedPaymentCard, setHasAddedPaymentCard] =
    useState(hasAddedPaymentCard);
  const setAlert = useAlert(state => state.setAlert);
  const scrollToTop = useScrollToTop("recruiter-dashboard-scroll-area");
  const {
    step: activeStepIndex,
    setStep: setActiveStep,
    prevStep,
  } = useMultiStep();
  const isAtLastStep = activeStepIndex === maxStep;
  const jobEditSuccessModalRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  // Transform job data to form initial values
  const getInitialValues = () => {
    const paymentRange =
      job.payment_currency === "USD"
        ? job.payment_range_usd
        : job.payment_range_ngn;
    const currency = job.payment_currency || "USD";

    return {
      ...initialValues,
      role: job.role,
      job_type: job.job_type,
      job_level: job.job_level,
      salary_duration: job.salary_duration,
      payment_range: paymentRange,
      payment_currency: currency,
      experience: job.experience,
      location: job.location,
      description: job.description,
      about_company: job.about_company,
      job_requirement: job.job_requirement,
      hiring_type: job.hiring_type,
    };
  };

  const onAddPaymentCardSuccess = () => {
    setHasAddedPaymentCard(true);
  };

  return (
    <>
      <div className='flex flex-col'>
        <div className='bg-[#EBECEE] w-full rounded-t-[12px] py-[18px] px-6 h-[64px]'>
          <h1 className='text-[#101828] text-[18px] leading-[28px] font-semibold'>
            {isAtLastStep ? "Job Edit Summary" : "Edit Job"}
          </h1>
        </div>
      </div>
      <Formik
        initialValues={getInitialValues()}
        onSubmit={(
          { payment_range, payment_currency, ...values },
          { setSubmitting, setFieldError }
        ) => {
          if (!isAtLastStep) {
            const nextStep = activeStepIndex
              ? maxStep
              : values.hiring_type === "With AI"
                ? activeStepIndex + 1
                : maxStep;
            setActiveStep(nextStep);
            scrollToTop();
            setSubmitting(false);
          }
          // else if (!hasAddedPaymentCard) {
          //   openModal(
          //     usePaystack ? "add-paystack-card-modal" : "add-stripe-card-modal"
          //   );
          //   setSubmitting(false);
          // }
          else {
            updateJob(job.public_id, {
              ...values,
              payment_currency,
              ...(payment_currency === "USD"
                ? { payment_range_usd: payment_range }
                : { payment_range_ngn: payment_range }),
            })
              .then(res => {
                if (res.success) {
                  jobEditSuccessModalRef.current?.showModal();
                } else {
                  handleFormSubmissionError(res.error, setFieldError, setAlert);
                }
              })
              .catch(err =>
                handleFormSubmissionError(err, setFieldError, setAlert)
              )
              .finally(() => setSubmitting(false));
          }
        }}
        validationSchema={validationSchema}
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
            className='p-5 pb-10 rounded-b-lg md:border border-gray-200 flex flex-col gap-14 mb-3'
          >
            {formSections.map(({ title, description, fields }, i) => (
              <div
                key={title}
                className={cn(
                  "flex flex-col md:gap-2",
                  activeStepIndex && "hidden"
                )}
              >
                <div className='flex items-center gap-2'>
                  <h2
                    className={cn(
                      "text-sm text-[#344054]",
                      !i
                        ? "text-base font-semibold text-primary-black pb-3 border-b border-[#EAECF0] w-full mb-6"
                        : "font-normal"
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

                    // Helper function to find option by value
                    const findOptionByValue = (
                      options: any[],
                      fieldValue: any
                    ) => {
                      return options?.find(
                        option => option.value === fieldValue
                      );
                    };
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
                          className={cn("relative isolate", props.className)}
                          key={name}
                        >
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
                            {...{ name, value, ...props }}
                            error={error || errors.payment_currency}
                            touched={touched[name] || touched.payment_currency}
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
                                findOptionByValue(paymentRangeOptions, value) ||
                                null,
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
                        {...(props.type === "select" && {
                          selectFieldProps: {
                            options: props.selectFieldProps?.options,
                            value: props.selectFieldProps?.options
                              ? findOptionByValue(
                                  props.selectFieldProps.options,
                                  value
                                )
                              : undefined,
                            ...props.selectFieldProps,
                          },
                        })}
                        richtextProps={{
                          maxChars: 1000,
                          minHeight: 180,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Step 2 */}
            <div className={cn(activeStepIndex !== 1 && "hidden")}>
              <div>
                <h2 className='text-base font-bold text-primary-black pb-3 border-b border-[#EAECF0] mb-5'>
                  Hire with AI
                </h2>
                <div className='flex-wrap md:flex justify-between'>
                  {hireWithAiBooleanFields.map(field => (
                    <div key={field.name} className='md:w-[48%]'>
                      <label className='label text-sm text-[#343A40] justify-start gap-3'>
                        <input
                          type='checkbox'
                          defaultChecked={field.defaultValue}
                          className='checkbox checkbox-primary w-[18px] h-[18px] rounded-[4px] disabled:opacity-100 border-0'
                          disabled={field.disabled}
                        />
                        {field.label}
                      </label>
                      <p className='text-xs text-secondary-black mt-1'>
                        {field.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className='mt-11'>
                <div className='border-b border-[#EAECF0] pb-3 mb-5'>
                  <h2 className='text-base font-bold text-primary-black'>
                    Set qualification criteria
                  </h2>
                  <p className='text-sm text-secondary-black mt-1'>
                    Set a passing grade for each section of the hiring process
                  </p>
                </div>
                <div className='flex flex-col gap-8'>
                  {qualificationCriteriaStages.map((stage, i) => (
                    <div
                      key={stage.stage}
                      className={cn("md:w-1/2", stage.tip && "mb-[120px]")}
                    >
                      <div className='flex items-center gap-3'>
                        <Image
                          src={`/assets/images/job-form/${i + 1}.png`}
                          alt='stage'
                          width={24}
                          height={24}
                          className='object-cover'
                        />
                        <span className='text-sm text-[#343A40]'>
                          {stage.stage}
                        </span>
                      </div>
                      <div className='flex items-center gap-2 mt-3'>
                        <p className='text-sm text-[#101828]'>{stage.name}</p>
                        <div className='relative'>
                          <InfoCircleIcon className='text-secondary-black text-base' />
                          {!!stage.tip && (
                            <ToolTip
                              text={stage.tip}
                              className='absolute top-4 -left-4'
                            />
                          )}
                        </div>
                        <div className='border border-primary-black p-2 rounded-[3px] flex items-center justify-center text-primary-black text-sm ml-auto min-w-[52px] cursor-not-allowed'>
                          {stage.criteria}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={cn(!isAtLastStep && "hidden")}>
              <JobDetails
                job={{
                  ...values,
                  role: values.role,
                }}
              />
            </div>

            <div className={cn(activeStepIndex === 1 && "hidden")}>
              <div className='pb-3 border-b border-[#EAECF0] mb-6'>
                <h2 className='text-base font-bold text-primary-black mb-1'>
                  {isAtLastStep ? "Hire with AI" : "Hiring Process"}
                </h2>
                <p
                  className={cn(
                    "text-sm text-secondary-black",
                    isAtLastStep && "hidden"
                  )}
                >
                  Choose how you want to hire for your open role
                </p>
              </div>
              <HiringProcess
                hiringProcess={values.hiring_type}
                setHiringProcess={value => setFieldValue("hiring_type", value)}
                isAtLastStep={isAtLastStep}
              />
              <p
                className={cn(
                  "text-xs text-error mt-1 transition-opacity opacity-0",
                  errors.hiring_type && touched.hiring_type && "opacity-100"
                )}
              >
                {errors.hiring_type || "error"}
              </p>
            </div>

            <div className='flex items-center justify-between w-full'>
              <Button
                onClick={() => {
                  prevStep();
                  setTimeout(() => {
                    scrollToTop();
                  }, 100);
                }}
                disabled={!activeStepIndex}
                color='primary'
                variant='outline'
                className='text-white w-full max-w-[105px]'
                type='button'
              >
                Previous
              </Button>
              <Button
                loading={isSubmitting}
                color='primary'
                className='text-white w-full max-w-[105px]'
                type='submit'
                disabled={!values.hiring_type}
              >
                {isSubmitting ? "" : isAtLastStep ? "Update Job" : "Continue"}
              </Button>
            </div>
          </form>
        )}
      </Formik>
      <JobEditSuccessModal
        jobDetailUrl={jobDetailUrl}
        modalRef={jobEditSuccessModalRef}
        onExit={() => {
          setActiveStep(0);
          scrollToTop();
        }}
      />
      {/* {!hasAddedPaymentCard && (
        <>
          {usePaystack ? (
            <AddPaystackCard
              publickey={paystackPublicKey ?? ""}
              email={paystackEmail ?? ""}
              btnClassName='hidden'
              onSuccess={onAddPaymentCardSuccess}
              refresh={false}
            />
          ) : (
            <AddStripeCard
              clientSecret={stripeClientSecret}
              publishableKey={process.env.STRIPE_PUBLISHABLE_KEY ?? ""}
              btnClassName='hidden'
              onSuccess={onAddPaymentCardSuccess}
              refresh={false}
            />
          )}
        </>
      )} */}
    </>
  );
};

export default EditJobForm;

const ToolTip = ({
  text,
  className,
  arrowClassName,
}: {
  text: string;
  className?: string;
  arrowClassName?: string;
}) => {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='42'
        height='36'
        viewBox='0 0 42 36'
        fill='none'
        className={arrowClassName}
      >
        <path
          d='M16.0015 3.52807C18.3751 -0.0467303 23.6249 -0.0467303 25.9985 3.52807L40.7932 25.8099C43.4412 29.798 40.5818 35.1288 35.7947 35.1288H6.20529C1.41818 35.1288 -1.44119 29.798 1.2068 25.8099L16.0015 3.52807Z'
          fill='#9DA3A8'
        />
      </svg>

      <div className='bg-[#9DA3A8] rounded-lg py-3 px-4 w-[340px] flex flex-col'>
        <p
          className='text-white text-sm font-medium text-left'
          //   @ts-ignore
          style={{ textWrap: "wrap" }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};

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
