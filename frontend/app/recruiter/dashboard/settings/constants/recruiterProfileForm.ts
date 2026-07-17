import * as Yup from "yup";

import {
  emailValidationSchema,
  richtextValidationSchema,
  urlValidationSchema,
} from "@/app/common/constants/validationSchemas";
import { Recruiter, FormField } from "@/app/common/types";
import { companySizeOptions } from "@/app/recruiter/signup/constants/form.contants";

export const recruiterProfileValidationSchema = Yup.object().shape({
  company_name: Yup.string().required().label("Recruiter name"),
  address: Yup.string().required().label("Recruiter address"),
  phone_number: Yup.string().required().label("Phone number"),
  company_email: emailValidationSchema.label("Work email"),
  website: urlValidationSchema.label("Recruiter website"),
  size: Yup.string().required().label("Recruiter size"),
});

type RecruiterProfileFormValues = Yup.InferType<
  typeof recruiterProfileValidationSchema
>;

export const recruiterProfileFormFields: FormField<RecruiterProfileFormValues>[] = [
  {
    name: "company_name",
    label: "Company Name",
    className: "md:w-[48%] [&_input]:w-full",
  },
  {
    name: "address",
    label: "Company Address",
    className: "md:w-[48%] [&_input]:w-full",
  },
  {
    name: "phone_number",
    type: "tel",
    label: "Phone Number",
    className: "lg:w-[48%]",
  },
  {
    name: "company_email",
    type: "email",
    label: "Work Email",
    className: "lg:w-[48%]",
    disabled: true,
  },
  {
    name: "website",
    label: "Company Website",
    type: "url",
    className: "md:w-[48%] [&_input]:w-full",
  },
  {
    name: "size",
    label: "Company Size",
    className: "md:w-[48%] [&_input]:w-full",
    type: "select",
    selectFieldProps: {
      options: companySizeOptions,
      defaultValue: companySizeOptions[0],
    },
  },
];

export const getRecruiterProfileInitiaValues = (
  profile?: Recruiter | null
): RecruiterProfileFormValues => {
  const {
    company_name = "",
    address = "",
    company_email = "",
    phone_number = "234",
    website = "",
    size = companySizeOptions[0].value,
  } = profile ?? {};
  return {
    address,
    company_email,
    company_name,
    phone_number,
    website,
    size,
  };
};

export const recruiterRepValidationSchema = Yup.object().shape({
  first_name: Yup.string().required().label("First name"),
  last_name: Yup.string().required().label("Last name"),
  email: emailValidationSchema,
  phone_number: Yup.string().required().label("Phone number"),
  role: Yup.string().required().label("Role"),
  country: Yup.string().required().label("Country"),
});

export const getRecruiterRepInitiaValues = (
  profile?: Recruiter | null
): RecruiterRepFormValues => {
  const {
    first_name = "",
    last_name = "",
    email = "",
    phone_number = "234",
    country = "",
  } = profile ?? {};
  return {
    last_name,
    email,
    first_name,
    phone_number,
    country,
    role: "",
  };
};

export type RecruiterRepFormValues = Yup.InferType<
  typeof recruiterRepValidationSchema
>;

const representativeRoleOptions = ["Admin", "HR", "CEO", "CTO"].map(role => ({
  label: role,
  value: role,
}));

export const recruiterRepFormFields: FormField<RecruiterRepFormValues>[] = [
  {
    name: "first_name",
    label: "First name",
    className: "md:w-[48%] [&_input]:w-full",
  },
  {
    name: "last_name",
    label: "Last name",
    className: "md:w-[48%] [&_input]:w-full",
  },
  {
    name: "phone_number",
    type: "tel",
    label: "Phone Number",
    className: "lg:w-[48%]",
  },
  {
    name: "email",
    type: "email",
    label: "Work Email",
    className: "lg:w-[48%]",
  },
  {
    name: "role",
    label: "Role in Company",
    className: "md:w-[48%] [&_input]:w-full",
    type: "select",
    selectFieldProps: {
      // options: representativeRoleOptions,
      createable: true,
    },
  },
  {
    name: "country",
    label: "Country",
    className: "md:w-[48%] [&_input]:w-full",
  },
];

export const logoValidationSchema = Yup.object().shape({
  profile_pic: Yup.string().required().label("Company logo"),
});

export const getBioAndValidationSchema = (maxChars = 255) =>
  Yup.object().shape({
    bio: richtextValidationSchema(maxChars, "Bio"),
  });
