"use client";

import { toast } from "sonner";
import { useRef } from "react";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { GroupBase } from "react-select";

import {
  allFields,
  initialValues,
  startupSignupformSteps,
} from "../constants/form.contants";
import { useAlert } from "@/app/common/store/useAlert";
import axiosInstance from "@/app/common/utils/axios.instance";
import { CountryField, TalentRole } from "@/app/common/types";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import FileInput from "@/app/common/components/Forms/FileInput";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";
import { trackSignup } from "@/app/common/services/mixpanel.services";

const SignupForm = ({
  groupedCountries,
  talentRoles,
}: {
  groupedCountries: GroupBase<CountryField>[];
  talentRoles: TalentRole[];
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
        { bio, ...input },
        { setSubmitting, setTouched, resetForm, setFieldError }
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
              formData.set("bio", bio);
              // console.log(bio);
              const portfolio = formData.get("portfolio") as string;
              // add https:// to portfolio if it doesn't exist
              if (portfolio && !portfolio.startsWith("http"))
                formData.set("portfolio", `https://${portfolio}`);
              const { data } = await axiosInstance.post(
                "/auth/register/",
                formData
              );
              try {
                if (process.env.NODE_ENV === "production")
                  await trackSignup({
                    user_type: "talent",
                    country: input.country,
                    role: input.role,
                    experience_level: input.experience_level,
                    email: input.email,
                    first_name: input.first_name,
                    last_name: input.last_name,
                    phone_number: input.phone_number,
                    gender: input.gender,
                    portfolio: input.portfolio,
                  });
              } catch (error) {
                if (process.env.NODE_ENV === "development")
                  console.error(error);
              }
              resolve(data);
            } catch (err) {
              reject(err);
            }
          })
            .then(() => {
              resetForm();
              setActiveStep(0);
              setAlert({
                title: "Account Created",
                message:
                  "Your account was successfully created and now under review. You'll be notified via email once your account is approved.",
                icon: "success",
                buttonText: "Login",
                buttonLink: "/talents/signin",
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
              const error = errors[name];
              if (name === "country")
                return (
                  <CountrySelect
                    key={name}
                    {...{ name, value, className, error, ...props }}
                    options={groupedCountries}
                    touched={touched[name]}
                  />
                );
              if (name === "resume")
                return (
                  <FileInput
                    key={name}
                    {...{ name, value, className, error, ...props }}
                    touched={touched[name]}
                    accept='.doc, .docx, .pdf'
                    acceptText='Pdf or Doc  (max. 1mb)'
                    maxFileSize={
                      // 1mb to bytes
                      1024 * 1024
                    }
                  />
                );
              return (
                <FormikField
                  key={name}
                  {...{ name, value, className, error, ...props }}
                  touched={touched[name]}
                  autoFocus={i === 0}
                  {...(props.type === "select" && {
                    selectFieldProps: {
                      options:
                        name === "role"
                          ? talentRoles.map(({ title }) => ({
                              label: title,
                              value: title,
                            }))
                          : undefined,
                      ...props.selectFieldProps,
                    },
                  })}
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
