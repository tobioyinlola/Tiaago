import * as Yup from "yup";

import { FormField } from "@/app/common/types";
import {
  setPasswordValidationSchema,
  emailValidationSchema,
  urlValidationSchema,
  passwordValidationSchema,
} from "@/app/common/constants/validationSchemas";
import { IoLockClosed, IoMail, IoPersonSharp } from "react-icons/io5";

export const companySizeOptions = [
  "1 - 10",
  "11 - 50",
  "51 - 200",
  "201 - 500",
  "501 - 1000",
  "1001 - 5000",
  "5001 - 10000",
  "10000+",
].map(size => ({ label: size, value: size.replaceAll(" ", "") }));

export const companyDetailsValidationSchema = Yup.object().shape({
  company_name: Yup.string().required().label("Company name"),
  company_email: emailValidationSchema.label("Company email"),
  website: urlValidationSchema.label("Company website"),
  country: Yup.string().required().label("Company country"),
  address: Yup.string().required().label("Company address"),
  size: Yup.string().required().label("Company size"),
  profile_pic: Yup.string().required().label("Company logo"),
});

type CompanyDetailsFormValues = Yup.InferType<
  typeof companyDetailsValidationSchema
>;

export const companyDetailsFormFields: FormField<CompanyDetailsFormValues>[] = [
  {
    name: "company_name",
    label: "Company name",
  },
  {
    name: "company_email",
    label: "Company Email Address",
    type: "email",
  },
  {
    name: "website",
    label: "Company website",
    type: "url",
  },
  {
    name: "country",
    label: "Company country",
  },
  {
    name: "address",
    label: "Company address",
  },
  {
    name: "size",
    label: "Company size",
    type: "select",
    selectFieldProps: {
      options: companySizeOptions,
      defaultValue: companySizeOptions[0],
    },
  },
  {
    name: "profile_pic",
    label: "Upload Company's Logo",
    type: "file",
  },
];

export const companyDetailsInitialFormValues: CompanyDetailsFormValues = {
  company_name: "",
  company_email: "",
  website: "",
  country: "",
  address: "",
  size: companySizeOptions[0].value,
  profile_pic: "",
};

const proposedPayOptions = [
  "N5,000 - N9,999",
  "N10,000 - N49,999",
  "N50,000 - N99,999",
  "N100,000 - N499,999",
  "N500,000+",
].map(amount => ({ label: amount, value: amount }));

export const companyRepresentativeValidationSchema = Yup.object().shape({
  first_name: Yup.string().required().label("First name"),
  last_name: Yup.string().required().label("Last name"),
  email: emailValidationSchema.label("Work email"),
  phone_number: Yup.string().required().label("Company phone"),
  role: Yup.string().required().label("Role in Company"),
  pay_range: Yup.string().required().label("Proposed pay"),
});

type CompanyRepresentativeFormValues = Yup.InferType<
  typeof companyRepresentativeValidationSchema
>;

export const companyRepresentativeFormFields: FormField<CompanyRepresentativeFormValues>[] =
  [
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
      name: "email",
      label: "Work email",
      type: "email",
    },
    {
      name: "phone_number",
      label: "Company phone",
      type: "tel",
    },
    {
      name: "role",
      label: "Role in Company",
      type: "select",
      selectFieldProps: {
        createable: true,
      },
    },
    {
      name: "pay_range",
      label: "How much are you willing to pay?",
      type: "select",
      selectFieldProps: {
        options: proposedPayOptions,
      },
    },
  ];

export const companyRepresentativeInitialFormValues: CompanyRepresentativeFormValues =
  {
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "234",
    role: "",
    pay_range: "",
  };

export type ChoosePasswordFormValues = Yup.InferType<
  typeof setPasswordValidationSchema
>;

export const choosePasswordFormFields: FormField<ChoosePasswordFormValues>[] = [
  {
    name: "password1",
    label: "Password",
    type: "password",
  },
  {
    name: "password2",
    label: "Confirm password",
    type: "password",
  },
];

export const choosePasswordInitialFormValues: ChoosePasswordFormValues = {
  password1: "",
  password2: "",
};

export const initialValues = {
  ...companyDetailsInitialFormValues,
  ...companyRepresentativeInitialFormValues,
  ...choosePasswordInitialFormValues,
};

export const allFields = [
  ...companyDetailsFormFields,
  ...companyRepresentativeFormFields,
  ...choosePasswordFormFields,
];

export const startupSignupformSteps = [
  {
    title: "Company Details",
    description: "Please provide the following information about your company",
    validationSchema: companyDetailsValidationSchema,
    fieldNames: companyDetailsFormFields.map(f => f.name),
  },
  {
    title: "Company Representative",
    description: "Please provide the following information about your company",
    validationSchema: companyRepresentativeValidationSchema,
    fieldNames: companyRepresentativeFormFields.map(f => f.name),
  },
  {
    title: "Choose Password",
    description: "Choose a secure password for your account",
    validationSchema: setPasswordValidationSchema,
    fieldNames: choosePasswordFormFields.map(f => f.name),
  },
];

// v3

// Signup only collects the basics; role, company size and website are
// gathered afterwards in the onboarding cards (/startups/onboarding).
export const startupSignUpV3ValidationSchema = Yup.object().shape({
  full_name: Yup.string().required().label("Full name"),
  email: emailValidationSchema.label("Work email address"),
  country: Yup.string().required().label("Country"),
  password1: passwordValidationSchema,
});

type StartupSignupV3FormValues = Yup.InferType<
  typeof startupSignUpV3ValidationSchema
>;

export const startupSignUpV3FormFields: FormField<StartupSignupV3FormValues>[] =
  [
    {
      name: "full_name",
      label: "Full name",
      leftIcon: <IoPersonSharp className='text-base text-[#98A2B3]' />,
      placeholder: "Scott Owens",
    },
    {
      name: "email",
      label: "Work email address",
      type: "email",
      leftIcon: <IoMail className='text-base text-[#98A2B3]' />,
      placeholder: "scottowens@tiaago.com",
    },
    {
      name: "country",
      label: "Country",
    },
    {
      name: "password1",
      label: "Password",
      type: "password",
      leftIcon: <IoLockClosed className='text-base text-[#98A2B3]' />,
      placeholder: "********",
    },
    // {
    //   name: "password2",
    //   label: "Confirm password",
    //   type: "password",
    //   leftIcon: <IoLockClosed className='text-base text-[#98A2B3]' />,
    //   placeholder: "********",
    // },
  ];

export const startupSignUpV3InitialFormValues: StartupSignupV3FormValues = {
  full_name: "",
  email: "",
  country: "",
  password1: "",
  // password2: "",
};
