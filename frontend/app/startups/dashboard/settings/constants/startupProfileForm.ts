import * as Yup from "yup";

import {
  emailValidationSchema,
  richtextValidationSchema,
  urlValidationSchema,
} from "@/app/common/constants/validationSchemas";
import { Startup, FormField } from "@/app/common/types";
import { companySizeOptions } from "@/app/startups/signup/constants/form.contants";

export const startupProfileValidationSchema = Yup.object().shape({
  company_name: Yup.string().required().label("Startup name"),
  address: Yup.string().required().label("Startup address"),
  phone_number: Yup.string().required().label("Phone number"),
  company_email: emailValidationSchema.label("Work email"),
  website: urlValidationSchema.label("Startup website"),
  size: Yup.string().required().label("Startup size"),
});

type StartupProfileFormValues = Yup.InferType<
  typeof startupProfileValidationSchema
>;

export const startupProfileFormFields: FormField<StartupProfileFormValues>[] = [
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

export const getStartupProfileInitiaValues = (
  profile?: Startup | null
): StartupProfileFormValues => {
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

export const startupRepValidationSchema = Yup.object().shape({
  first_name: Yup.string().required().label("First name"),
  last_name: Yup.string().required().label("Last name"),
  email: emailValidationSchema,
  phone_number: Yup.string().required().label("Phone number"),
  role: Yup.string().required().label("Role"),
  country: Yup.string().required().label("Country"),
});

export const getStartupRepInitiaValues = (
  profile?: Startup | null
): StartupRepFormValues => {
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

export type StartupRepFormValues = Yup.InferType<
  typeof startupRepValidationSchema
>;

const representativeRoleOptions = ["Admin", "HR", "CEO", "CTO"].map(role => ({
  label: role,
  value: role,
}));

export const startupRepFormFields: FormField<StartupRepFormValues>[] = [
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
