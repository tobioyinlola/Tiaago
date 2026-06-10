"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import { useState } from "react";
import { Button } from "react-daisyui";
import { GroupBase } from "react-select";
import { useRouter } from "next/navigation";

import {
  talentSignUpV3FormFields,
  talentSignUpV3ValidationSchema,
  talentSignUpV3InitialFormValues,
} from "../constants/form.contants";
import { useAlert } from "@/app/common/store/useAlert";
import { CountryField, TalentRole } from "@/app/common/types";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { trackSignup } from "@/app/common/services/mixpanel.services";
import { publicAxiosInstance } from "@/app/common/utils/axios.instance";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";

const SignUpFormV3 = ({
  talentRoles,
  groupedCountries,
  next,
  referral_code,
}: {
  talentRoles: TalentRole[];
  groupedCountries: GroupBase<CountryField>[];
  next?: string;
  referral_code?: string;
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const urlSearchParams = new URLSearchParams();
  if (referral_code) urlSearchParams.set("referral_code", referral_code);
  if (next) urlSearchParams.set("next", next);
  else urlSearchParams.set("next", "/talents/verification");
  return (
    <Formik
      initialValues={talentSignUpV3InitialFormValues}
      onSubmit={(input, { setSubmitting, resetForm, setFieldError }) => {
        toast.dismiss();
        new Promise(async (resolve, reject) => {
          if (!acceptedTerms)
            reject({ message: "Please accept the terms and conditions" });
          try {
            const { data } = await publicAxiosInstance.post("/auth/register/", {
              ...input,
              password2: input.password1,
              referral_code,
            });
            const [first_name = "", last_name = ""] =
              input.full_name.split(" ");
            try {
              if (process.env.NODE_ENV === "production")
                await trackSignup({
                  user_type: "talent",
                  country: input.country,
                  role: input.role,
                  //   experience_level: input.experience_level,
                  email: input.email,
                  first_name,
                  last_name,
                  //   phone_number: input.phone_number,
                  //   gender: input.gender,
                  //   portfolio: input.portfolio,
                });
            } catch (error) {
              if (process.env.NODE_ENV === "development") console.error(error);
            }
            resolve(data);
          } catch (err) {
            reject(err);
          }
        })
          .then(() => {
            toast.success("Account created successfully");
            resetForm();
            router.push(
              `/verify-email?email=${
                input.email
              }&as=talent&${urlSearchParams.toString()}`
            );
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={talentSignUpV3ValidationSchema}
    >
      {({ handleSubmit, isSubmitting, errors, touched, values }) => (
        <form onSubmit={handleSubmit} className='mt-8 mb-3'>
          {talentSignUpV3FormFields.map(({ name, label, ...props }, i) => {
            if (name === "country")
              return (
                <CountrySelect
                  key={name}
                  value={null}
                  {...{ name, label, ...props }}
                  options={groupedCountries}
                  error={errors[name]}
                  touched={touched[name]}
                />
              );
            return (
              <FormikField
                key={name}
                {...{ name, label, ...props }}
                autoFocus={i === 0}
                value={values[name]}
                error={errors[name]}
                touched={touched[name]}
                disablePasswordHelpers
                inputContainerClassName='min-h-10 h-10'
                {...(props.type === "select" && {
                  selectFieldProps: {
                    options:
                      name === "role"
                        ? talentRoles.map(({ title, slug }) => ({
                            label: title,
                            value: slug,
                          }))
                        : undefined,
                    ...props.selectFieldProps,
                  },
                })}
              />
            );
          })}
          <label className='flex gap-3 text-sm w-fit cursor-pointer mx-auto my-6'>
            <input
              type='checkbox'
              name='acceptance'
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className='checkbox border-[#5E6163] checkbox-xs rounded-[2px]'
            />
            <span className='text-[#5E6163] text-sm font-onest'>
              I accept Tiaago&apos;s{" "}
              <Link href='/terms' className='text-primary hover:underline'>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href='/privacy' className='text-primary hover:underline'>
                Privacy Policy.
              </Link>
            </span>
          </label>
          <Button
            loading={isSubmitting}
            color='primary'
            className='text-white w-full mb-6'
            type='submit'
            disabled={!acceptedTerms || isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <p className='font-onest text-sm text-[#5E6163] text-center'>
            Click{" "}
            <Link
              className='text-primary hover:underline font-semibold'
              href={`/startups/signin${
                urlSearchParams.size ? "?" + urlSearchParams.toString() : ""
              }`}
            >
              here
            </Link>{" "}
            to log in as a Recruiter instead
          </p>
        </form>
      )}
    </Formik>
  );
};

export default SignUpFormV3;
