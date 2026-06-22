"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { GroupBase } from "react-select";

import {
  allFields,
  initialValues,
  startupSignupformSteps,
} from "../constants/form.contants";
import { CountryField } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import FileInput from "@/app/common/components/Forms/FileInput";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { trackSignup } from "@/app/common/services/mixpanel.services";
import CountrySelect from "../../../common/components/Forms/CountrySelect";

const SignupForm = ({
  groupedCountries,
}: {
  groupedCountries: GroupBase<CountryField>[];
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const setAlert = useAlert(state => state.setAlert);
  const {
    step: activeStepIndex,
    nextStep,
    setStep: setActiveStep,
  } = useMultiStep();
  const activeStep = startupSignupformSteps[activeStepIndex];
  const isAtLastStep = activeStepIndex === startupSignupformSteps.length - 1;
  return (
    <Formik
      initialValues={initialValues}
      onSubmit={(
        input,
        { setSubmitting, setTouched, setFieldError, resetForm }
      ) => {
        toast.dismiss();
        if (!isAtLastStep) {
          nextStep();
          setSubmitting(false);
          setTouched({});
        } else {
          new Promise(async (resolve, reject) => {
            if (!formRef.current) return reject("Can't access form data");
            try {
              const formData = new FormData(formRef.current);
              const companyWebsite = formData.get("website") as string;
              // add https:// to company website if it doesn't exist
              if (companyWebsite && !companyWebsite.startsWith("http"))
                formData.set("website", `https://${companyWebsite}`);
              const data = await clientKyInstance.post(
                "auth/register/",
                { body: formData, searchParams: { user_type: "company" } }
              ).json();
              try {
                await trackSignup({
                  user_type: "startup",
                  country: input.country,
                  email: input.email,
                  first_name: input.first_name,
                  last_name: input.last_name,
                  phone_number: input.phone_number,
                  address: input.address,
                  company_email: input.company_email,
                  company_name: input.company_name,
                  size: input.size,
                  website: input.website,
                });
              } catch (error) {
                if (process.env.NODE_ENV === "development")
                  console.error(error);
              }
              resolve(data);
            } catch (error) {
              reject(error);
            }
          })
            .then(() => {
              resetForm();
              setActiveStep(0);
              setAlert({
                title: "Success",
                message:
                  "Your account was successfully created and now under review. You'll be notified via email once your account is approved.",
                icon: "success",
                buttonText: "Login",
                buttonLink: "/startups/signin",
                secondaryButton: {
                  text: "Close",
                  action: () => setAlert(undefined),
                },
              });
            })
            .catch(err =>
              handleFormSubmissionError(err, setFieldError, setAlert)
            )
            .finally(() => setSubmitting(false));
        }
      }}
      validationSchema={activeStep.validationSchema}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values }) => (
        <form
          onSubmit={handleSubmit}
          noValidate
          ref={formRef}
          className='w-11/12 md:w-2/3 lg:w-1/2'
        >
          <h1 className='font-space-grotesk text-3xl font-bold'>
            {activeStep.title}
          </h1>
          <p className='text-sm mt-2 mb-8'>{activeStep.description}</p>
          <div className='flex-wrap md:flex justify-between'>
            {allFields.map(({ name, className: c, ...props }, i) => {
              // @ts-ignore
              const isActive = activeStep.fieldNames.includes(name);
              const className = cn(c, {
                hidden: !isActive,
              });
              const value = values[name];
              if (name === "country")
                return (
                  <CountrySelect
                    key={name}
                    {...{ name, value, className, ...props }}
                    options={groupedCountries}
                    error={errors[name]}
                    touched={touched[name]}
                  />
                );

              if (name === "profile_pic")
                return (
                  <FileInput
                    key={name}
                    {...{ name, value, className, ...props }}
                    error={errors[name]}
                    touched={touched[name]}
                  />
                );
              return (
                <FormikField
                  key={name}
                  {...{ name, value, className, ...props }}
                  error={errors[name]}
                  touched={touched[name]}
                  autoFocus={i === 0}
                />
              );
            })}
          </div>
          <Button
            loading={isSubmitting}
            color='primary'
            className='text-white w-full mt-5'
            type='submit'
          >
            {isAtLastStep ? "Create Account" : "Next"}
          </Button>
        </form>
      )}
    </Formik>
  );
};

export default SignupForm;
