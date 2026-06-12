"use client";

import { toast } from "sonner";
import { useState } from "react";
import { Button } from "react-daisyui";
import { Formik, FormikConfig } from "formik";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Megaphone,
  UserRound,
  Users,
} from "lucide-react";

import {
  companySizeOptions,
  getInitialFormValues,
  getInitialStep,
  accountTypeOptions,
  heardFromOptions,
  industryOptions,
  onboardingSteps,
  OnboardingFormValues,
} from "../constants";
import { cn } from "@/app/common/utils";
import {
  CompanyOnboarding,
  TalentRole as StartupRole,
} from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import {
  CompanyOnboardingInput,
  updateCompanyOnboarding,
} from "@/app/common/services/company-onboarding";

const stepIcons = [Users, Building2, UserRound, Megaphone];

const OnboardingCards = ({
  onboarding,
  startupRoles,
}: {
  onboarding: CompanyOnboarding;
  startupRoles: StartupRole[];
}) => {
  const [step, setStep] = useState(() => getInitialStep(onboarding));
  const [isSkipping, setIsSkipping] = useState(false);
  const setAlert = useAlert(state => state.setAlert);

  const totalSteps = onboardingSteps.length;
  const currentStep = onboardingSteps[step];
  const isLastStep = step === totalSteps - 1;
  const progress = Math.round(((step + 1) / totalSteps) * 100);
  const StepIcon = stepIcons[step];

  const finishAndRedirect = () => {
    toast.success("Welcome aboard! Your workspace is ready.");
    window.location.href = "/startups/dashboard";
  };

  const skipForNow = async () => {
    if (isSkipping) return;
    setIsSkipping(true);
    toast.dismiss();
    const result = await updateCompanyOnboarding({ complete: true });
    if (result.success) {
      finishAndRedirect();
    } else {
      toast.error(result.error);
      setIsSkipping(false);
    }
  };

  const onSubmit: FormikConfig<OnboardingFormValues>["onSubmit"] = async (
    values,
    { setSubmitting, setFieldError }
  ) => {
    toast.dismiss();
    // save only the fields owned by the current card so users can resume
    const payload: CompanyOnboardingInput = {};
    currentStep.fieldNames.forEach(field => {
      const value = values[field];
      if (value !== "") payload[field] = value as never;
    });
    if (isLastStep) payload.complete = true;

    const result = await updateCompanyOnboarding(payload);
    setSubmitting(false);
    if (!result.success) {
      handleFormSubmissionError(result.error, setFieldError, setAlert);
      return;
    }
    if (isLastStep) finishAndRedirect();
    else setStep(current => Math.min(current + 1, totalSteps - 1));
  };

  return (
    <Formik
      initialValues={getInitialFormValues(onboarding)}
      validationSchema={currentStep.validationSchema}
      onSubmit={onSubmit}
    >
      {({
        handleSubmit,
        isSubmitting,
        errors,
        touched,
        values,
        submitCount,
        setFieldValue,
      }) => (
        <form
          onSubmit={handleSubmit}
          className='w-full max-w-2xl rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 md:p-8 space-y-6'
        >
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-xs text-muted-foreground'>
              <span className='font-medium'>
                Step {step + 1} of {totalSteps}
              </span>
              <span>{progress}% complete</span>
            </div>
            <div
              role='progressbar'
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label='Onboarding progress'
              className='h-1.5 w-full rounded-full bg-muted'
            >
              <div
                className='h-full rounded-full bg-primary transition-all duration-300'
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center'>
              <StepIcon className='h-5 w-5 text-primary' aria-hidden />
            </div>
            <div>
              <h1 className='text-xl font-bold'>{currentStep.title}</h1>
              <p className='text-sm text-muted-foreground'>
                {currentStep.description}
              </p>
            </div>
          </div>

          <div className='space-y-4'>
            {step === 0 && (
              <>
                <div role='radiogroup' className='grid sm:grid-cols-2 gap-3'>
                  {accountTypeOptions.map(option => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex flex-col gap-1 rounded-xl border-2 p-4 cursor-pointer transition-colors duration-200 hover:border-primary/40",
                        values.account_type === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='font-medium'>{option.label}</span>
                        <input
                          type='radio'
                          name='account_type'
                          value={option.value}
                          checked={values.account_type === option.value}
                          onChange={() =>
                            setFieldValue("account_type", option.value)
                          }
                          className='radio radio-primary radio-sm'
                        />
                      </div>
                      <span className='text-xs text-muted-foreground'>
                        {option.description}
                      </span>
                    </label>
                  ))}
                </div>
                {submitCount > 0 && errors.account_type && (
                  <p className='text-sm text-destructive'>
                    {errors.account_type}
                  </p>
                )}
              </>
            )}

            {step === 1 && (
              <div className='grid sm:grid-cols-2 gap-x-4'>
                <FormikField
                  name='company_name'
                  label={
                    values.account_type === "agency"
                      ? "Agency name"
                      : "Company name"
                  }
                  placeholder='Acme Inc.'
                  value={values.company_name}
                  error={errors.company_name}
                  touched={touched.company_name}
                  className='sm:col-span-2'
                  autoFocus
                />
                <FormikField
                  name='website'
                  label='Website (optional)'
                  type='url'
                  placeholder='https://acme.com'
                  value={values.website}
                  error={errors.website}
                  touched={touched.website}
                />
                <FormikField
                  name='industry'
                  label='Industry (optional)'
                  type='select'
                  placeholder='Select'
                  value={values.industry}
                  error={errors.industry}
                  touched={touched.industry}
                  selectFieldProps={{ options: industryOptions }}
                />
                <FormikField
                  name='size'
                  label='Company size'
                  type='select'
                  placeholder='Select'
                  value={values.size}
                  error={errors.size}
                  touched={touched.size}
                  className='sm:col-span-2'
                  selectFieldProps={{ options: companySizeOptions }}
                />
              </div>
            )}

            {step === 2 && (
              <div className='grid sm:grid-cols-2 gap-x-4'>
                <FormikField
                  name='role'
                  label='Job title'
                  type='select'
                  placeholder='Hiring Manager'
                  value={values.role}
                  error={errors.role}
                  touched={touched.role}
                  selectFieldProps={{
                    options: startupRoles.map(({ title, slug }) => ({
                      label: title,
                      value: slug,
                    })),
                  }}
                />
                <FormikField
                  name='phone_number'
                  label='Phone (optional)'
                  type='tel'
                  value={values.phone_number}
                  error={errors.phone_number}
                  touched={touched.phone_number}
                />
              </div>
            )}

            {step === 3 && (
              <div className='space-y-4'>
                <FormikField
                  name='heard_from'
                  label='Where did you hear about us?'
                  type='select'
                  placeholder='Select'
                  value={values.heard_from}
                  error={errors.heard_from}
                  touched={touched.heard_from}
                  selectFieldProps={{ options: heardFromOptions }}
                />
                {values.heard_from === "Other" && (
                  <FormikField
                    name='heard_from_other'
                    label='Tell us more'
                    placeholder='Please specify'
                    value={values.heard_from_other}
                    error={errors.heard_from_other}
                    touched={touched.heard_from_other}
                  />
                )}
                <FormikField
                  name='onboarding_notes'
                  label="Anything else you'd like us to know? (optional)"
                  type='textarea'
                  placeholder='Optional'
                  value={values.onboarding_notes}
                  error={errors.onboarding_notes}
                  touched={touched.onboarding_notes}
                />
              </div>
            )}
          </div>

          <div className='flex items-center justify-between gap-3 pt-4 border-t border-border'>
            <Button
              type='button'
              color='ghost'
              size='sm'
              className='gap-2'
              onClick={() => setStep(current => Math.max(0, current - 1))}
              disabled={step === 0 || isSubmitting || isSkipping}
            >
              <ArrowLeft className='h-4 w-4' aria-hidden /> Back
            </Button>
            <button
              type='button'
              onClick={skipForNow}
              disabled={isSubmitting || isSkipping}
              className='text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 py-3'
            >
              {isSkipping ? "Skipping..." : "Skip for now"}
            </button>
            <Button
              type='submit'
              color='primary'
              size='sm'
              className='gap-2 text-white'
              loading={isSubmitting}
              disabled={isSubmitting || isSkipping}
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className='h-4 w-4' aria-hidden /> Finish
                </>
              ) : (
                <>
                  Continue <ArrowRight className='h-4 w-4' aria-hidden />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Formik>
  );
};

export default OnboardingCards;
