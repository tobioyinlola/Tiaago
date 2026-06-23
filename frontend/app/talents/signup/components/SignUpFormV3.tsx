"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import { useState, useEffect } from "react";
import Button from "@/app/common/components/DaisyButton";
import { GroupBase } from "react-select";
import { useRouter } from "next/navigation";
import {
  IoPersonSharp,
  IoMail,
  IoLocation,
  IoBriefcase,
} from "react-icons/io5";

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
import { publicKyInstance } from "@/app/common/utils/client-ky.instance";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";

type InvitePreFill = {
  first_name?: string;
  last_name?: string;
  email?: string;
  location?: string;
  current_role?: string;
};

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

  const [preFill, setPreFill] = useState<InvitePreFill | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!next) return;
    const match = next.match(/\/sourcing\/invite\/([^/?]+)/);
    if (!match) return;
    try {
      const raw = sessionStorage.getItem(`invite_form_${match[1]}`);
      if (raw) setPreFill(JSON.parse(raw));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFromInvite = mounted && !!preFill?.first_name;

  const initialValues = preFill
    ? {
        ...talentSignUpV3InitialFormValues,
        full_name:
          `${preFill.first_name || ""} ${preFill.last_name || ""}`.trim(),
        email: preFill.email || "",
        country: preFill.location || "",
        role: preFill.current_role || "",
      }
    : talentSignUpV3InitialFormValues;

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      onSubmit={(input, { setSubmitting, resetForm, setFieldError }) => {
        toast.dismiss();
        new Promise(async (resolve, reject) => {
          if (!acceptedTerms)
            reject({ message: "Please accept the terms and conditions" });
          try {
            const data = await publicKyInstance.post("auth/register/", {
              json: {
                ...input,
                password2: input.password1,
                referral_code,
              },
            }).json();
            const [first_name = "", last_name = ""] =
              input.full_name.split(" ");
            try {
              if (process.env.NODE_ENV === "production")
                await trackSignup({
                  user_type: "talent",
                  country: input.country,
                  role: input.role,
                  email: input.email,
                  first_name,
                  last_name,
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
          {isFromInvite ? (
            <>
              {/* Pre-filled summary from invite form */}
              <div className='rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6'>
                <p className='text-sm font-semibold font-onest text-black mb-1'>
                  Almost there!
                </p>
                <p className='text-xs font-onest text-[#5F6264] mb-4'>
                  Just create a password to complete your account.
                </p>
                <div className='space-y-3'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-white border border-[#D0D5DD] flex items-center justify-center shrink-0'>
                      <IoPersonSharp className='text-sm text-[#98A2B3]' />
                    </div>
                    <div>
                      <p className='text-[11px] font-onest text-[#98A2B3] leading-none mb-0.5'>
                        Name
                      </p>
                      <p className='text-sm font-medium font-onest text-black'>
                        {values.full_name}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-white border border-[#D0D5DD] flex items-center justify-center shrink-0'>
                      <IoMail className='text-sm text-[#98A2B3]' />
                    </div>
                    <div>
                      <p className='text-[11px] font-onest text-[#98A2B3] leading-none mb-0.5'>
                        Email
                      </p>
                      <p className='text-sm font-medium font-onest text-black'>
                        {values.email}
                      </p>
                    </div>
                  </div>
                  {values.country && (
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-full bg-white border border-[#D0D5DD] flex items-center justify-center shrink-0'>
                        <IoLocation className='text-sm text-[#98A2B3]' />
                      </div>
                      <div>
                        <p className='text-[11px] font-onest text-[#98A2B3] leading-none mb-0.5'>
                          Country
                        </p>
                        <p className='text-sm font-medium font-onest text-black'>
                          {values.country}
                        </p>
                      </div>
                    </div>
                  )}
                  {values.role && (
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-full bg-white border border-[#D0D5DD] flex items-center justify-center shrink-0'>
                        <IoBriefcase className='text-sm text-[#98A2B3]' />
                      </div>
                      <div>
                        <p className='text-[11px] font-onest text-[#98A2B3] leading-none mb-0.5'>
                          Role
                        </p>
                        <p className='text-sm font-medium font-onest text-black capitalize'>
                          {values.role}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Show country/role selects only if missing */}
              {!values.country &&
                talentSignUpV3FormFields
                  .filter(f => f.name === "country")
                  .map(({ name, label, ...props }) => (
                    <CountrySelect
                      key={name}
                      value={null}
                      {...{ name, label, ...props }}
                      options={groupedCountries}
                      error={errors[name]}
                      touched={touched[name]}
                    />
                  ))}
              {talentSignUpV3FormFields
                .filter(f => f.name === "role")
                .map(({ name, label, ...props }) => (
                  <FormikField
                    key={name}
                    {...{ name, label, ...props }}
                    value={values[name]}
                    error={errors[name]}
                    touched={touched[name]}
                    disablePasswordHelpers
                    inputContainerClassName='min-h-10 h-10'
                  />
                ))}

              {/* Password field */}
              {talentSignUpV3FormFields
                .filter(f => f.name === "password1")
                .map(({ name, label, ...props }) => (
                  <FormikField
                    key={name}
                    {...{ name, label, ...props }}
                    autoFocus
                    value={values[name]}
                    error={errors[name]}
                    touched={touched[name]}
                    disablePasswordHelpers
                    inputContainerClassName='min-h-10 h-10'
                  />
                ))}
            </>
          ) : (
            /* Standard signup form */
            talentSignUpV3FormFields.map(({ name, label, ...props }, i) => {
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
            })
          )}
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
            {isSubmitting
              ? "Creating account..."
              : isFromInvite
                ? "Create account & continue"
                : "Create account"}
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
