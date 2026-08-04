import * as Yup from "yup";

import { CompanyAccountType, CompanyOnboarding } from "@/app/common/types";
import { companySizeOptions } from "../signup/constants/form.contants";

export { companySizeOptions };

export const accountTypeOptions: {
  value: CompanyAccountType;
  label: string;
  description: string;
}[] = [
  {
    value: "in-house",
    label: "In-house recruiter",
    description: "Hiring for one company",
  },
  {
    value: "agency",
    label: "Recruiting agency",
    description: "Hiring for multiple clients",
  },
  {
    value: "hiring-company",
    label: "Hiring company / recruiter",
    description: "Building your own team",
  },
  {
    value: "independent",
    label: "Independent recruiter",
    description: "Freelance or solo recruiter",
  },
];

export const industryOptions = [
  "Technology",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Education",
  "Manufacturing",
  "Media",
  "Other",
].map(industry => ({ label: industry, value: industry }));

// Unlike the shared urlValidationSchema, this one accepts an empty value
// (the field is optional) and scheme-less input like "acme.com", which is
// normalized to https:// before saving.
const optionalUrlSchema = Yup.string().matches(
  /^((http|https):\/\/)?(www\.)?([a-zA-Z0-9-]+(\.[a-zA-Z]+)+)(\/[\w\-./?%&=]*)?$/,
  { message: "Please enter a valid URL", excludeEmptyString: true }
);

// react-phone-input-2 leaves the bare country dial code behind when the
// user clears the field; up to 4 digits counts as empty, anything longer
// must look like a real number.
const PHONE_DIAL_CODE_MAX_DIGITS = 4;
export const phoneDigits = (value?: string) =>
  (value || "").replace(/\D/g, "");
const optionalPhoneSchema = Yup.string().test(
  "phone-length",
  "Please enter a valid phone number",
  value => {
    const digits = phoneDigits(value);
    return digits.length <= PHONE_DIAL_CODE_MAX_DIGITS || digits.length >= 8;
  }
);
export const isEmptyPhone = (value: string) =>
  phoneDigits(value).length <= PHONE_DIAL_CODE_MAX_DIGITS;

export const heardFromOptions = [
  "Google search",
  "LinkedIn",
  "Twitter / X",
  "Friend or colleague",
  "Blog or article",
  "Podcast",
  "Conference / event",
  "YouTube",
  "Other",
].map(source => ({ label: source, value: source }));

export type OnboardingFormValues = {
  account_type: CompanyAccountType | "";
  company_name: string;
  website: string;
  industry: string;
  size: string;
  country: string;
  role: string;
  phone_number: string;
  heard_from: string;
  heard_from_other: string;
  onboarding_notes: string;
};

export const getInitialFormValues = (
  onboarding: CompanyOnboarding
): OnboardingFormValues => ({
  account_type: onboarding.account_type || "",
  company_name: onboarding.company_name || "",
  website: onboarding.website || "",
  industry: onboarding.industry || "",
  size: onboarding.size || "",
  country: onboarding.country || "",
  role: onboarding.role || "",
  phone_number: onboarding.phone_number || "",
  heard_from: onboarding.heard_from || "",
  heard_from_other: onboarding.heard_from_other || "",
  onboarding_notes: onboarding.onboarding_notes || "",
});

export type OnboardingStep = {
  title: string;
  description: string;
  /** The form fields this card owns — saved together on Continue. */
  fieldNames: (keyof OnboardingFormValues)[];
  validationSchema: Yup.ObjectSchema<any>;
};

export const onboardingSteps: OnboardingStep[] = [
  {
    title: "Account type",
    description: "Tell us how you'll be using Tiaago",
    fieldNames: ["account_type"],
    validationSchema: Yup.object().shape({
      account_type: Yup.string()
        .oneOf(accountTypeOptions.map(o => o.value))
        .required()
        .label("Account type"),
    }),
  },
  {
    title: "Organization",
    description: "A few details about your organization",
    fieldNames: ["company_name", "website", "industry", "size", "country"],
    validationSchema: Yup.object().shape({
      company_name: Yup.string().trim().required().label("Company name"),
      website: optionalUrlSchema.label("Website"),
      industry: Yup.string().label("Industry"),
      size: Yup.string().required().label("Company size"),
      country: Yup.string().required().label("Country"),
    }),
  },
  {
    title: "About you",
    description: "We'd love to know who's behind the keyboard",
    fieldNames: ["role", "phone_number"],
    validationSchema: Yup.object().shape({
      role: Yup.string().required().label("Job title"),
      phone_number: optionalPhoneSchema.label("Phone number"),
    }),
  },
  {
    title: "How did you hear?",
    description: "Last step, then you're all set!",
    fieldNames: ["heard_from", "heard_from_other", "onboarding_notes"],
    validationSchema: Yup.object().shape({
      heard_from: Yup.string().required().label("Where you heard about us"),
      heard_from_other: Yup.string().when("heard_from", {
        is: "Other",
        then: schema => schema.required().label("Tell us more"),
        otherwise: schema => schema.notRequired(),
      }),
      onboarding_notes: Yup.string().max(1000).label("Notes"),
    }),
  },
];

/**
 * Resume support: the first card whose required fields are still missing.
 */
export const getInitialStep = (onboarding: CompanyOnboarding) => {
  if (!onboarding.account_type) return 0;
  if (!onboarding.company_name || !onboarding.size || !onboarding.country) return 1;
  if (!onboarding.role) return 2;
  return 3;
};

/**
 * Users type "acme.com"; the backend URLField requires a scheme — add
 * https:// for them rather than rejecting the input.
 */
export const normalizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};
