"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import { useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import { GroupBase } from "react-select";
import { useRouter } from "next/navigation";

import {
  startupSignUpV3ValidationSchema,
  startupSignUpV3InitialFormValues,
  startupSignUpV3FormFields,
} from "../constants/form.contants";
import { useAlert } from "@/app/common/store/useAlert";
import { CountryField } from "@/app/common/types";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { trackSignup } from "@/app/common/services/mixpanel.services";
import { publicKyInstance } from "@/app/common/utils/client-ky.instance";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";
import GoogleSignInButton from "@/app/common/components/GoogleSignInButton";

const SignUpFormV3 = ({
  groupedCountries,
  next,
  referral_code,
  initialEmail,
  invite_token,
}: {
  groupedCountries: GroupBase<CountryField>[];
  next?: string;
  referral_code?: string;
  initialEmail?: string;
  invite_token?: string;
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const urlSearchParams = new URLSearchParams();
  if (referral_code) urlSearchParams.set("referral_code", referral_code);
  if (next) urlSearchParams.set("next", next);

  const initialValues = {
    ...startupSignUpV3InitialFormValues,
    ...(initialEmail ? { email: initialEmail } : {}),
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={(values, { setSubmitting, resetForm, setFieldError }) => {
        const input = {
          ...values,
          password2: values.password1,
          referral_code,
          ...(invite_token ? { invite_token } : {}),
        };
        toast.dismiss();
        new Promise(async (resolve, reject) => {
          if (!acceptedTerms)
            reject({ message: "Please accept the terms and conditions" });
          try {
            const data = await publicKyInstance.post(
              "auth/register/",
              { json: input, searchParams: { user_type: "company" } }
            ).json();
            const [first_name = "", last_name = ""] =
              input.full_name.split(" ");
            try {
              if (process.env.NODE_ENV === "production")
                await trackSignup({
                  user_type: "startup",
                  email: input.email,
                  first_name,
                  last_name,
                  country: input.country,
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
            const verifyParams = new URLSearchParams({ email: input.email, as: "startup" });
            if (next) verifyParams.set("next", next);
            router.push(`/verify-email?${verifyParams.toString()}`);
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={startupSignUpV3ValidationSchema}
    >
      {({ handleSubmit, isSubmitting, errors, touched, values }) => (
        <form onSubmit={handleSubmit} className='mt-8 mb-3'>
          <GoogleSignInButton
            userType="company"
            next={next}
            label="Sign up with Google"
          />
          <div className='flex items-center justify-center mb-6'>
            <hr className='w-full bg-[#F0F2F5]' />
            <span className='bg-white px-2 font-onest text-sm text-[#667185] whitespace-nowrap'>
              Or sign up with email
            </span>
            <hr className='w-full bg-[#F0F2F5]' />
          </div>
          {startupSignUpV3FormFields.map(({ name, label, ...props }, i) => {
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
              />
            );
          })}
          <label
            htmlFor='acceptance'
            className='flex gap-3 text-sm w-fit cursor-pointer mx-auto'
          >
            <input
              id='acceptance'
              type='checkbox'
              name='acceptance'
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className='checkbox checkbox-primary checkbox-xs rounded-sm'
            />
            <span>
              I accept Tiaago&apos;s{" "}
              <Link href='/terms' className='text-primary'>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href='/privacy' className='text-primary'>
                Privacy Policy.
              </Link>
            </span>
          </label>
          <Button
            loading={isSubmitting}
            color='primary'
            className='text-white w-full mt-6 mb-4'
            type='submit'
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <p className='text-foreground text-base text-center'>
            Click{" "}
            <Link
              className='text-primary hover:underline'
              href={`/talents/signup${
                urlSearchParams.size ? "?" + urlSearchParams.toString() : ""
              }`}
            >
              here
            </Link>{" "}
            to Sign Up as a Talent instead
          </p>
        </form>
      )}
    </Formik>
  );
};

export default SignUpFormV3;
