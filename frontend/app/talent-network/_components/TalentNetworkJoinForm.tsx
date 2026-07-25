"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { GroupBase } from "react-select";
import { CheckCircle2 } from "lucide-react";

import { cn } from "@/app/common/utils";
import { useAlert } from "@/app/common/store/useAlert";
import { CountryField } from "@/app/common/types";
import FormikField from "@/app/common/components/Forms/FormikField";
import FormikSelectField from "@/app/common/components/Forms/FormikSelectField";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";
import {
  COMMUNITY_OPTIONS,
  INDUSTRY_OPTIONS,
  ROLE_CATEGORY_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
  WORK_TYPE_OPTIONS,
  EMAIL_FREQUENCY_OPTIONS,
  TalentNetworkJoinPayload,
} from "@/app/common/constants/talent-network";
import { joinTalentNetwork } from "@/app/common/services/talent-network";

type Props = {
  groupedCountries: GroupBase<CountryField>[];
};

const initialValues: TalentNetworkJoinPayload = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  country: "",
  state: "",
  city: "",
  job_title: "",
  years_experience: "0-2",
  industry: [],
  interested_roles: [],
  preferred_work_type: "REMOTE",
  preferred_locations: [],
  communities: [],
  other_community: "",
  email_frequency: "IMMEDIATE",
  consent: false,
};

const validationSchema = Yup.object({
  first_name: Yup.string().required("First name is required"),
  last_name: Yup.string().required("Last name is required"),
  email: Yup.string().email("Enter a valid email").required("Email is required"),
  phone: Yup.string(),
  country: Yup.string().required("Country is required"),
  state: Yup.string(),
  city: Yup.string(),
  job_title: Yup.string().required("Current job title is required"),
  years_experience: Yup.string().required("Select your years of experience"),
  industry: Yup.array().min(1, "Select at least one industry"),
  interested_roles: Yup.array().min(1, "Select at least one role"),
  preferred_work_type: Yup.string().required("Select a preferred work type"),
  preferred_locations: Yup.array(),
  communities: Yup.array(),
  other_community: Yup.string(),
  email_frequency: Yup.string().required("Select an email preference"),
  consent: Yup.boolean().oneOf([true], "You must agree to receive job opportunities from TIAAGO"),
});

/** Multi-select against a fixed { value, label } options list, computing
 * the controlled `value` array Formik <-> react-select requires (mirrors
 * how CountrySelect does it for single-select). */
const MultiSelectField = ({
  name,
  label,
  options,
  values,
  placeholder,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  placeholder?: string;
}) => (
  <FormikSelectField
    name={name}
    label={label}
    value={values}
    type="select"
    selectFieldProps={{ isMulti: true, options }}
    selectProps={{
      isMulti: true,
      options,
      value: options.filter(o => values.includes(o.value)),
      placeholder: placeholder || "Select all that apply",
    }}
  />
);

const TalentNetworkJoinForm = ({ groupedCountries }: Props) => {
  const setAlert = useAlert(s => s.setAlert);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="bg-white border border-[#EAECF0] rounded-2lg shadow-card p-8 sm:p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-badge-green-bg flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-7 h-7 text-badge-green-text" />
        </div>
        <h2 className="text-xl font-bold font-space-grotesk text-primaryBlack mb-2">
          You&apos;re officially part of the TIAAGO Talent Network.
        </h2>
        <p className="text-sm text-secondary-black max-w-md mx-auto">
          We&apos;ll notify you whenever a relevant opportunity becomes available. Check your inbox to confirm your email
          address.
        </p>
      </div>
    );
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values, { setSubmitting }) => {
        const res = await joinTalentNetwork(values);
        setSubmitting(false);
        if (!res.success) {
          setAlert({ title: "Error", message: res.error, icon: "error" });
          return;
        }
        setSubmitted(true);
      }}
    >
      {({ values, errors, touched, isSubmitting, setFieldValue }) => (
        <Form className="bg-white border border-[#EAECF0] rounded-2lg shadow-card p-6 sm:p-8 space-y-8">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-black mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormikField name="first_name" label="First Name" value={values.first_name} error={errors.first_name} touched={touched.first_name} />
              <FormikField name="last_name" label="Last Name" value={values.last_name} error={errors.last_name} touched={touched.last_name} />
              <FormikField name="email" label="Email Address" type="email" value={values.email} error={errors.email} touched={touched.email} />
              <FormikField name="phone" label="Phone Number (Optional)" type="tel" value={values.phone} error={errors.phone} touched={touched.phone} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-black mb-4">Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CountrySelect
                name="country"
                label="Country"
                value={values.country}
                error={errors.country as string}
                touched={!!touched.country}
                type="select"
                options={groupedCountries}
              />
              <FormikField name="state" label="State/Province (Optional)" value={values.state} error={errors.state} touched={touched.state} />
              <FormikField name="city" label="City (Optional)" value={values.city} error={errors.city} touched={touched.city} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-black mb-4">
              Professional Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormikField name="job_title" label="Current Job Title" value={values.job_title} error={errors.job_title} touched={touched.job_title} />
              <FormikField
                name="years_experience"
                label="Years of Experience"
                type="select"
                value={values.years_experience}
                error={errors.years_experience as string}
                touched={!!touched.years_experience}
                selectFieldProps={{
                  options: YEARS_EXPERIENCE_OPTIONS,
                  value: YEARS_EXPERIENCE_OPTIONS.find(o => o.value === values.years_experience),
                }}
              />
            </div>

            <div className="mb-4">
              <MultiSelectField name="industry" label="Industry" options={INDUSTRY_OPTIONS} values={values.industry} />
              {errors.industry && touched.industry && (
                <p className="text-xs text-error mt-1">{errors.industry as string}</p>
              )}
            </div>

            <div className="mb-4">
              <MultiSelectField
                name="interested_roles"
                label="Interested Roles"
                options={ROLE_CATEGORY_OPTIONS}
                values={values.interested_roles}
              />
              {errors.interested_roles && touched.interested_roles && (
                <p className="text-xs text-error mt-1">{errors.interested_roles as string}</p>
              )}
            </div>

            <div className="mb-4">
              <FormikField
                name="preferred_work_type"
                label="Preferred Work Type"
                type="select"
                value={values.preferred_work_type}
                error={errors.preferred_work_type as string}
                touched={!!touched.preferred_work_type}
                selectFieldProps={{
                  options: WORK_TYPE_OPTIONS,
                  value: WORK_TYPE_OPTIONS.find(o => o.value === values.preferred_work_type),
                }}
              />
            </div>

            <div className="mb-4">
              <FormikSelectField
                name="preferred_locations"
                label="Preferred Locations"
                value={values.preferred_locations}
                type="select"
                selectFieldProps={{ isMulti: true, options: groupedCountries }}
                selectProps={{
                  isMulti: true,
                  options: groupedCountries,
                  value: groupedCountries
                    .flatMap(g => g.options)
                    .filter(c => values.preferred_locations.includes(c.value)),
                  placeholder: "Select countries you'd consider working in",
                }}
              />
            </div>

            <div className="mb-4">
              <MultiSelectField
                name="communities"
                label="Community Affiliation"
                options={COMMUNITY_OPTIONS}
                values={values.communities}
              />
            </div>

            <FormikField
              name="other_community"
              label="Other Community"
              placeholder="Not listed above? Tell us here"
              value={values.other_community}
              error={errors.other_community}
              touched={touched.other_community}
            />
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-black mb-4">
              Email Preferences
            </h3>
            <FormikField
              name="email_frequency"
              label="How often should we email you?"
              type="select"
              value={values.email_frequency}
              error={errors.email_frequency as string}
              touched={!!touched.email_frequency}
              selectFieldProps={{
                options: EMAIL_FREQUENCY_OPTIONS,
                value: EMAIL_FREQUENCY_OPTIONS.find(o => o.value === values.email_frequency),
              }}
            />
          </section>

          <section>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={values.consent}
                onChange={e => setFieldValue("consent", e.target.checked)}
                className="checkbox checkbox-sm mt-0.5"
              />
              <span className="text-sm text-secondary-black">
                I agree to receive relevant job opportunities from TIAAGO.
              </span>
            </label>
            {errors.consent && touched.consent && (
              <p className="text-xs text-error mt-1">{errors.consent as string}</p>
            )}
          </section>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full btn btn-primary text-white",
              isSubmitting && "opacity-70 pointer-events-none"
            )}
          >
            {isSubmitting ? "Joining..." : "Join Talent Network"}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default TalentNetworkJoinForm;
